import {FastifyReply, FastifyRequest} from "fastify";
import {pool} from "../../config/db";
import '@fastify/jwt';
import bcrypt from "bcrypt";
export async function createUser(req:FastifyRequest, res:FastifyReply) {
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
}