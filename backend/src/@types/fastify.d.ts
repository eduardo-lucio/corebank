import 'fastify';
import '@fastify/jwt';
declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (req: any, res: any) => Promise<void>;
    }
}

declare module '@fastify/jwt' {
    interface FastifyJWT {
        user: {
            sub: string;
            role: string;
        };
    }
}