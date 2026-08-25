import { FastifyReply, FastifyRequest} from 'fastify';

export async function authenticate(req: FastifyRequest, res: FastifyReply) {
    try{
        await req.jwtVerify();
    }catch(err){
        return res.status(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'token ausente ou invalido',
        })
    }
}
