import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import 'dotenv/config';

import { authenticate } from './middlewares/auth';
import { userRoutes } from './routes/users.routes';
import { sessionRoutes } from './routes/sessions.routes';
import { accountRoutes } from './routes/accounts.routes';
import { transactionRoutes } from './routes/transactions.routes';

export const app = Fastify({ logger: true });

app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'chave_secreta_padrao'
});

app.decorate('authenticate', authenticate);

// Registro de rotas
app.register(userRoutes);
app.register(sessionRoutes);
app.register(accountRoutes);
app.register(transactionRoutes);