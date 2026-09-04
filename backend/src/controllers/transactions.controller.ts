import {FastifyReply, FastifyRequest} from "fastify";
import {pool} from "../../config/db";
import * as z from "zod";
import {PoolClient} from "pg";

async function runWithIdempotency(req: FastifyRequest, res: FastifyReply, idempotencyKey: string, action: (client: PoolClient) => Promise<{ statusCode: number, body: any }>){
    const client = await pool.connect();
    try{
        const idempotencyCheck = await client.query(
            'SELECT status, response_code, response_body FROM idempotency_keys WHERE key = $1 and user_id = $2',
            [idempotencyKey, req.user.sub]);
        const existing = idempotencyCheck.rows[0];
        if(existing){
            if (existing.status === 'COMPLETED'){
                return res.status(existing.response_code).send(existing.response_body)
            }
            if(existing.status === 'PENDING'){
                return res.status(409).send({
                    error: 'Conflict',
                    message: 'This request are in process, please await.'
                })
            }
        }
        await client.query('BEGIN')
        const insertResult = await client.query(`
            INSERT INTO idempotency_keys (key, user_id, request_path, status) 
            VALUES ($1, $2, $3, $4) 
            ON CONFLICT (user_id, key) DO NOTHING 
            RETURNING key`,
            [idempotencyKey, req.user.sub, req.url, 'PENDING']
        );
        if (insertResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(409).send({
                error: 'Conflict',
                message: 'Uma transação idêntica já está em processamento concorrente.'
            });
        }
        const {statusCode, body} = await action(client)
        if(statusCode >= 400){
            await client.query('ROLLBACK')
            return res.status(statusCode).send(body)
        }
        await client.query(`
            UPDATE idempotency_keys 
            SET status = 'COMPLETED', response_code = $1, response_body = $2
            WHERE key = $3`,
            [statusCode, body, idempotencyKey]
        );
        await client.query('COMMIT')
        return res.status(statusCode).send(body)
    }catch(e){
        await client.query('ROLLBACK');
        req.log.error(e)
        return res.status(500).send({
            error: 'erro'
        })
    }finally{
        client.release();
    }
}
export async function withdrawals(req: FastifyRequest, res: FastifyReply){
    const valueType = z.object({
        value: z.number().positive("The value must be higher than zero"),
    })
    const idempotencyTemplate = z.object({
        "idempotency-key": z.uuid("Invalid idempotency key")
    })
    const { "idempotency-key": idempotencyKey } = idempotencyTemplate.parse(req.headers);
    const { value } = valueType.parse(req.body)

    return await runWithIdempotency(req, res, idempotencyKey, async (client) => {
            let queryResult = await client.query('SELECT * FROM accounts WHERE user_id = $1', [req.user.sub]);
            if(queryResult.rows.length === 0){
                return {statusCode: 400, body: {
                    status: 400,
                    error: "No account found"
                }}
            }
            const userAccount = await client.query('SELECT id, status FROM users WHERE id = $1', [req.user.sub]);
            if(userAccount.rows[0].status !== "ACTIVE"){
                return {statusCode: 400, body: {
                    status: 400,
                    error: 'O dono da conta está com pendencias'
                }}
            }
            queryResult = await client.query('SELECT * FROM accounts WHERE id = $1 FOR UPDATE', [queryResult.rows[0].id]);
            if(value > queryResult.rows[0].balance){
                return {statusCode: 400, body:{
                    status: 400,
                    error: 'Bad request',
                    message: 'Saldo insuficiente'
                }}
            }
            const withdrawQuery = await client.query('UPDATE accounts SET balance = balance - $1 WHERE account_number = $2 RETURNING id, account_number, balance', [value, queryResult.rows[0].account_number]);
            const withdrawAccountId = withdrawQuery.rows[0].id;
            const transactionQuery = await client.query(`INSERT INTO transactions (sender_account_id, receiver_account_id, amount, type, status) VALUES ($1, null, $2, 'WITHDRAW', 'DONE') RETURNING *`,[withdrawAccountId, value]);
            return {
                statusCode: 201,
                body: {
                    id: transactionQuery.rows[0].id,
                    type: transactionQuery.rows[0].type,
                    amount: Number(transactionQuery.rows[0].amount),
                    account_number: queryResult.rows[0].account_number,
                    balance: Number(withdrawQuery.rows[0].balance),
                    created_at: transactionQuery.rows[0].created_at
                }
            };
    })
}
export async function deposits(req: FastifyRequest, res: FastifyReply){
    const depositSchema = z.object({
        value: z.number().positive("The value must be higher"),
        account: z.string().regex(/^\d{6}$/, "Invalid account number"),
    })
    const idempotencyTemplate = z.object({
        "idempotency-key": z.uuid("Invalid idempotency key")
    })
    const { "idempotency-key": idempotencyKey } = idempotencyTemplate.parse(req.headers);
    const { value, account } = depositSchema.parse(req.body);

    return runWithIdempotency(req, res, idempotencyKey, async (client)=> {
        let queryResult = await client.query('SELECT * FROM accounts WHERE account_number = $1', [account]);
        if(queryResult.rows.length === 0){
            return {statusCode:400, body:{
                status: 400,
                error: 'No account found.'
            }}
        }
        const userAccount = await client.query('SELECT id, status FROM users WHERE id = (SELECT user_id FROM accounts WHERE account_number = $1)', [account]);
        if(userAccount.rows[0].status !== "ACTIVE"){
            return {statusCode: 400, body: {
                status: 400,
                error: 'O dono da conta está com pendencias',
            }}
        }
        const depositQuery = await client.query('UPDATE accounts SET balance = balance + $1 WHERE account_number = $2 RETURNING id, account_number, balance', [value ,account]);
        const depositAccountId = depositQuery.rows[0].id;
        const transactionQuery = await client.query(`INSERT INTO transactions (sender_account_id, receiver_account_id, amount, type, status) VALUES (null, $1, $2, 'DEPOSIT', 'DONE') RETURNING *`,[depositAccountId, value]);
        return {
            statusCode: 201,
            body: {
                id: transactionQuery.rows[0].id,
                type: transactionQuery.rows[0].type,
                amount: Number(transactionQuery.rows[0].amount),
                account_number: account,
                balance: Number(depositQuery.rows[0].balance),
                created_at: transactionQuery.rows[0].created_at
            }
        };
    })

}
export async function transfers(req:FastifyRequest, res:FastifyReply) {
    const transferSchema = z.object({
        receiver_account_number: z.string().regex(/^\d{6}$/, "Invalid account number"),
        value: z.number().positive("The value can not be zero"),
    })
    const idempotencyTemplate = z.object({
        "idempotency-key": z.uuid("Invalid idempotency key")
    })
    const { "idempotency-key": idempotencyKey } = idempotencyTemplate.parse(req.headers);
    const { receiver_account_number, value } = transferSchema.parse(req.body);

    return runWithIdempotency(req, res, idempotencyKey, async (client) => {
            const accountRes = await client.query(
                'SELECT * FROM accounts WHERE user_id = $1 OR account_number = $2 ORDER BY id FOR UPDATE', [req.user.sub, receiver_account_number],
            )
            const senderRes = accountRes.rows.find((acc)=>acc.user_id === req.user.sub)
            const receiverRes = accountRes.rows.find((acc)=>acc.account_number === receiver_account_number)

            if (!senderRes || !receiverRes) {
                return {statusCode: 404, body:{
                    status: 404,
                    error: 'Account not found',
                    message: 'A conta de origem ou destino não foi encontrada'
                }}
            }
            if(senderRes.id === receiverRes.id){
                return {statusCode:400, body:{
                    status: 400,
                    error: 'Same account',
                    message: 'As contas devem ser diferentes'
                }}
            }
            const usersRes = await client.query(
                'SELECT id, status FROM users WHERE id = $1 OR id = $2',
                [senderRes.user_id, receiverRes.user_id]
            );

            const senderUser = usersRes.rows.find((u) => u.id === senderRes.user_id);
            const receiverUser = usersRes.rows.find((u) => u.id === receiverRes.user_id);

            if (!senderUser || senderUser.status !== "ACTIVE" || !receiverUser || receiverUser.status !== "ACTIVE") {
                return {
                    statusCode: 400,
                    body: {
                        status: 400,
                        error: 'User not active',
                        message: 'O dono de uma das contas possui pendências ou não está ativo'
                    }
                };
            }
            if(Number(senderRes.balance) < value){
                return {statusCode: 400, body:{
                    status: 400,
                    error: 'Not enough money',
                    message: 'O usuário não possui dinheiro o suficiente para completar a transação'
                }}
            }
            await client.query(
                'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
                [value, senderRes.id]
            );
            await client.query(
                'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
                [value, receiverRes.id]
            )
            const transactionsInsert = await client.query(
                `INSERT INTO transactions (sender_account_id, receiver_account_id, amount, type, status) values ($1, $2, $3, 'TRANSFER', 'DONE') RETURNING id;`,
                [senderRes.id, receiverRes.id, value]
            );
            return {
                statusCode: 201,
                body: {
                    id: transactionsInsert.rows[0].id,
                    type: "TRANSFER",
                    amount: value,
                    sender_account: senderRes.account_number,
                    receiver_account: receiver_account_number,
                    created_at: new Date().toISOString()
                }
            };
    })

}