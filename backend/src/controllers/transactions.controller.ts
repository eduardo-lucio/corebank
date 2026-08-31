import {FastifyReply, FastifyRequest} from "fastify";
import {pool} from "../../config/db";
import * as z from "zod";

export async function withdraw (req: FastifyRequest, res: FastifyReply){
    const valueType = z.object({value: z.number().positive("The value must be higher than zero")})
    const { value } = valueType.parse(req.body)

    const client = await pool.connect();
    try{
        let queryResult = await client.query('SELECT * FROM accounts WHERE user_id = $1', [req.user.sub]);
        if(queryResult.rows.length === 0){
            return res.code(400).send({
                status: 400,
                error: 'No account found.'
            })
        }
        const userAccount = await client.query('SELECT id, status FROM users WHERE id = $1', [req.user.sub]);
        if(userAccount.rows[0].status !== "ACTIVE"){
            return res.status(400).send({
                status: 400,
                error: 'O dono da conta está com pendencias'
            })
        }

        if(value > queryResult.rows[0].balance){
            return res.status(400).send({
                status: 400,
                error: 'Bad request',
                message: 'Saldo insuficiente'
            })
        }
        await client.query('BEGIN')
        const withdrawQuery = await client.query('UPDATE accounts SET balance = balance - $1 WHERE account_number = $2 RETURNING id, account_number, balance', [value, queryResult.rows[0].account_number]);
        const withdrawAccountId = withdrawQuery.rows[0].id;
        const transactionQuery = await client.query(`INSERT INTO transactions (sender_account_id, receiver_account_id, amount, type, status) VALUES ($1, null, $2, 'WITHDRAW', 'DONE') RETURNING *`,[withdrawAccountId, value]);
        await client.query('COMMIT')
        return res.status(200).send({
            status: 200,
            message: 'withdraw successfully.',
            transactionQuery: transactionQuery.rows[0],
            withdrawQuery: withdrawQuery.rows[0]
        })
    }catch(e){
        await client.query('ROLLBACK')
        req.log.error(e);
        return res.status(500).send({
            status: 500,
            error: e,
            message: 'deu erro'
        })
    }finally {
        client.release();
    }
}

export async function deposit(req: FastifyRequest, res: FastifyReply){
    const depositSchema = z.object({
        value: z.number().positive("The value must be higher"),
        account: z.string().regex(/^\d{6}$/, "Invalid account number")
    })
    const { value, account } = depositSchema.parse(req.body);
    const client = await pool.connect();
    try{
        let queryResult = await client.query('SELECT * FROM accounts WHERE account_number = $1', [account]);
        if(queryResult.rows.length === 0){
            return res.code(400).send({
                status: 400,
                error: 'No account found.'
            })
        }
        const userAccount = await client.query('SELECT id, status FROM users WHERE id = (SELECT user_id FROM accounts WHERE account_number = $1)', [account]);
        if(userAccount.rows[0].status !== "ACTIVE"){
            return res.status(400).send({
                status: 400,
                error: 'O dono da conta está com pendencias',
            })
        }
        await client.query('BEGIN')
        const depositQuery = await client.query('UPDATE accounts SET balance = balance + $1 WHERE account_number = $2 RETURNING id, account_number, balance', [value ,account]);
        const depositAccountId = depositQuery.rows[0].id;
        const transactionQuery = await client.query(`INSERT INTO transactions (sender_account_id, receiver_account_id, amount, type, status) VALUES (null, $1, $2, 'DEPOSIT', 'DONE') RETURNING *`,[depositAccountId, value]);
        await client.query('COMMIT')
        return res.status(200).send({
            status: 200,
            message: 'Deposits successfully.',
            transactionQuery: transactionQuery.rows[0],
            depositQuery: depositQuery.rows[0]
        })
    }catch(e){
        await client.query('ROLLBACK')
        return res.status(500).send({
            status: 500,
            error: 'Bad request',
            message: 'deu erro'
        })
    }finally {
        client.release();
    }
}
export async function transfer(req:FastifyRequest, res:FastifyReply) {
    const transferSchema = z.object({
        receiver_account_number: z.string().regex(/^\d{6}$/, "Invalid account number"),
        value: z.number().positive("The value can not be zero"),
    })


    const { receiver_account_number, value } = transferSchema.parse(req.body);
    const userId = req.user.sub
    const client = await pool.connect();

    try{
        await client.query('BEGIN;')

        const senderRes = await client.query(
            'SELECT id, account_number, balance FROM accounts WHERE user_id = $1 FOR UPDATE;',
            [userId]
        );

        const receiverRes = await client.query(
            'SELECT id, user_id, account_number FROM accounts WHERE account_number = $1;',
            [receiver_account_number]
        );

        if (senderRes.rows.length === 0 || receiverRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).send({
                status: 404,
                error: 'Account not found',
                message: 'A conta de origem ou destino não foi encontrada'
            })
        }

        const senderAccount = senderRes.rows[0]
        const receiverAccount = receiverRes.rows[0]

        if(senderAccount.id === receiverAccount.id){
            await client.query('ROLLBACK')
            return res.status(400).send({
                status: 400,
                error: 'Same account',
                message: 'As contas devem ser diferentes'
            })
        }

        if(Number(senderAccount.balance) < value){
            await client.query('ROLLBACK')
            return res.status(400).send({
                status: 400,
                error: 'Not enough money',
                message: 'O usuário não possui dinheiro o suficiente para completar a transação'
            })
        }

        await client.query(
            'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
            [value, senderAccount.id]
        );

        await client.query(
            'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
            [value, receiverAccount.id]
        )

        const transactionsInsert = await client.query(
            `INSERT INTO transactions (sender_account_id, receiver_account_id, amount, type, status) values ($1, $2, $3, 'TRANSFER', 'DONE') RETURNING id;`,
            [senderAccount.id, receiverAccount.id, value]
        );

        await client.query('COMMIT');

        return res.status(201).send({
            status: 201,
            message: 'Transferência realizada com sucesso',
            transaction_id: transactionsInsert.rows[0].id
        })
    }catch(err){
        await client.query('ROLLBACK');
        req.log.error(err);
        return res.status(500).send({
            status: 500,
            error: 'internal error',
            message: 'erro interno'
        })
    }finally{
        client.release();
    }
}