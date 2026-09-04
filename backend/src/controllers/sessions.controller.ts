import {FastifyReply, FastifyRequest} from "fastify";
import {pool} from "../../config/db";
import bcrypt from "bcrypt";

export async function createSession(req: FastifyRequest, res: FastifyReply) {
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
        const token = req.server.jwt.sign(
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
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role
            }
        })
    }catch(err){
        return res.status(500).send({
            statusCode: 500,
            message: err
        })
    }
}