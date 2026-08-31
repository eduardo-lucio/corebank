import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import 'dotenv/config';

import { authenticate } from './middlewares/auth';
import { userRoutes } from './routes/users.routes';
import { sessionRoutes } from './routes/sessions.routes';
import { accountRoutes } from './routes/accounts.routes';
import { transactionRoutes } from './routes/transactions.routes';
import { ZodError } from 'zod';
import * as z from 'zod';
export const app = Fastify({ logger: true });

app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'chave_secreta_padrao'
});

app.decorate('authenticate', authenticate);

app.register(userRoutes);
app.register(sessionRoutes);
app.register(accountRoutes);
app.register(transactionRoutes);

app.setErrorHandler((error, request, reply) => {
    if(error instanceof ZodError) {
        reply.status(400).send({
            status: 400,
            error: 'Invalid inputs',
            message: z.treeifyError(error)
        })
    }else{
        request.log.error(error)
        reply.status(500).send({
            status: 500,
            error: "internal error"
        })
    }
})