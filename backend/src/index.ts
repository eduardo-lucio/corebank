import Fastify from 'fastify';
import {pool} from "./db";
import bcrypt from 'bcrypt';
import 'dotenv/config';
const app = Fastify({ logger: true });
const port = Number(process.env.PORT) || 3000;

app.post('/sessions', async (req, res) => {
    try{
        const { email, password } = req.body as { email: string, password: string };
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0){
            return res.status(401).send({
                statusCode: 401,
                error: 'User not found',
                message: 'Nenhum usuário encontrado'
            })
        }
        if (user.rows[0].status !== 'Active'){
            return res.status(403).send({

            })
        }
    }catch(err){

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

app.get('/accounts/:account_number/balance', async (req, res) => {
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

app.listen({ port, host: '0.0.0.0' }).then(() => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});

