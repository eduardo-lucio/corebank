import {FastifyReply, FastifyRequest} from "fastify";
import {pool} from "../../config/db";

export async function transfer(req:FastifyRequest, res:FastifyReply) {
    const userId = req.user.sub
    const { receiver_account_number, value } = req.body as {
        receiver_account_number: string,
        value: number
    };

    if(!value || value <= 0){
        return res.status(400).send({
            status: 400,
            error: 'Bad request',
            message: 'O valor da transacao deve ser maior que zero.'
        })
    }
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