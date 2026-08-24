import Fastify from 'fastify';
import {pool} from "./db";
import bcrypt from 'bcrypt';
import 'dotenv/config';
import fastifyJwt from "@fastify/jwt";

const app = Fastify({ logger: true });
const port = Number(process.env.PORT) || 3000;

declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (req: any, res: any) => Promise<void>
    }
}
declare module '@fastify/jwt' {
    interface FastifyJWT{
        user: {
            sub: string;
            roles: string;
        }
    }
}

app.decorate('authenticate', async (req, res) => {
    try{
        await req.jwtVerify();
    }catch(err){
        return res.status(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'token ausente ou invalido',
        })
    }
})

app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'publickey',
})

app.post('/sessions', async (req, res) => {
    try{
        const { email, password } = req.body as { email: string, password: string };
        const result = await pool.query('SELECT id, full_name, email, password_hash, status, role FROM users WHERE email = $1;', [email]);
        if (result.rows.length === 0){
            return res.status(401).send({
                statusCode: 401,
                error: 'User not found',
                message: 'Nenhum usuário encontrado'
            })
        }
        const user = result.rows[0];
        if (user.status !== 'ACTIVE'){
            return res.status(403).send({
                statusCode: 403,
                error: 'Account is not active',
                message: 'A conta não está ativa'
            })
        }
        const isPasswordValid: boolean = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid){
            return res.status(401).send({
                statusCode: 401,
                error: 'Wrong credentials',
                message: 'Usuário ou senha incorreta'
            })
        }
        const token = app.jwt.sign(
            {role: user.role},
            {
                sub: user.id,
                expiresIn: '1d'
            }
        )
        return res.status(201).send({
            statusCode: 201,
            message: 'Login realizado com sucesso',
            token,
            user: user
        })
    }catch(err){
        return res.status(500).send({
            statusCode: 500,
            message: err
        })
    }
})

app.post('/users', async (req, res) => {
    const client = await pool.connect();
    try{
        let { full_name, email, password } = req.body as {
            full_name: string;
            email: string;
            password: string;
        };

        password = await bcrypt.hash(password, 10);

        await client.query('BEGIN');

        const createdUser = await client.query('INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, full_name, email, created_at;', [full_name, email, password]);

        const accountNumber: string = Math.floor(100000 + Math.random() * 900000).toString();

        const createdAccount = await client.query('INSERT INTO accounts (account_number, user_id) VALUES ($1, $2) RETURNING id, user_id, account_number;', [accountNumber, createdUser.rows[0].id]);

        await client.query('COMMIT');
        return res.status(201).send({
            rcreateduser: createdUser.rows[0],
            rcreatedaccount: createdAccount.rows[0]
        })
    }catch (error: any){
        await client.query('ROLLBACK');
        if(error.code === '23505'){
            return res.status(409).send({
                statusCode: 409,
                error: 'Conflict',
                message: 'O e-mail informado já está em uso'
            })
        }
        req.log.error(error);
        return res.status(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Erro interno ao processar o cadastro.'
        });
    } finally {
        client.release();
    }
})

app.get('/accounts/:account_number/balance', { onRequest: [app.authenticate] }, async (req, res) => {
    try{
        const { account_number } = req.params as { account_number: string };

        const bal = await pool.query('SELECT balance FROM accounts WHERE account_number = $1', [account_number]);
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
})

app.post('transactions/transfer', { onRequest: app.authenticate }, async (req, res) => {
    const client = await pool.connect();
    try{
        const { receiver_account_number, value } = req.body as {
            receiver_account_number: string,
            value: number
        };

        await client.query('BEGIN;')

        const sender_account_select = await client.query('SELECT user_id, account_number, balance FROM accounts WHERE account_number = $1;', [sender_account_number])
        const receiver_account_select = await client.query('SELECT user_id, account_number FROM accounts WHERE account_number = $1;', [receiver_account_number])

        if (sender_account_select.rows.length === 0 || receiver_account_select.rows.length === 0) {
            await res.status(500).send({
                status: 500,
                error: 'Account not found',
                message: 'A conta não foi encontrada'
            })
        }

        const sender_account = sender_account_select.rows[0]
        const receiver_account = receiver_account_select.rows[0]

        if(sender_account.balance < value){
            await res.status(500).send({
                status: 500,
                error: 'Not enough money',
                message: 'O usuário não possui dinheiro o suficiente para completar a transação'
            })
        }

        const transactionID = await client.query('INSERT INTO transactions (sender_account_id, receiver_account_id, amount, type, status) values {$1, $2, $3, $4, $5} RETURNING id;', [sender_account.id, receiver_account.id, value, 'TRANSACTION', 'PENDING']);

        await client.query('UPDATE accounts SET balance = balance - $1 WHERE account_number == $2;', [value, sender_account.account_number]);
        await client.query('UPDATE accounts SET balance = balance + $1 WHERE accounts_number == $2;', [value, receiver_account.account_number]);
        await client.query('UPDATE transactions SET status = DONE WHERE transaction_id = $1;', [transactionID]);

        await client.query('COMMIT');

    }catch(err){

    }finally{
        client.release();
    }
})



app.listen({ port, host: '0.0.0.0' }).then(() => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
