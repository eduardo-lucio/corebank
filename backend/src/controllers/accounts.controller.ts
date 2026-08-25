import {pool} from "../../config/db";
import {FastifyReply, FastifyRequest} from "fastify";
import '@fastify/jwt';
export async function getAccountBalance(req: FastifyRequest, res: FastifyReply){
    try{
        const { account_number } = req.params as { account_number: string };

        const bal = await pool.query('SELECT balance FROM accounts WHERE user_id = $1', [req.user.sub]);
        if (bal.rows.length === 0){
            return res.status(404).send({
                statusCode: 404,
                error: 'Not Found',
                message: 'Conta bancaria não encontrada'
            })
        }
        return res.status(200).send({
            statusCode: 200,
            balance: bal.rows[0].balance
        })

    }catch(error){
        return res.status(500).send({
            statusCode: 500,
            error: 'Internal server error',
            message: 'Erro interno ao consultar saldo'
        })
    }
}

export async function getAccountStatement(req: FastifyRequest, res: FastifyReply) {
    try{
        const userAccount = await pool.query(
            'SELECT * FROM accounts WHERE user_id = $1;',[req.user.sub]
        )
        if(userAccount.rows.length === 0){
            return res.status(404).send({
                status: 404,
                error: 'Account not found',
                message: 'Conta nao encontrada'
            })
        }
        const myAccount = userAccount.rows[0]
        const transactions = await pool.query(
            'SELECT * FROM transactions WHERE sender_account_id = $1 OR receiver_account_id = $1 ORDER BY created_at DESC LIMIT 50',
            [myAccount.id]
        );
        const transactionsResult = transactions.rows

        return res.status(200).send({
            status: 200,
            message: 'Consulta realizada com sucesso',
            transactionsResult,
            totalTransactions: transactionsResult.length,
            accountNumber: myAccount.account_number,
            currentBalance: myAccount.balance
        })
    }catch(err){
        req.log.error(err);
        return res.status(500).send({
            status:500,
            error: 'internal error',
            message: 'internal error'
        })
    }
}
