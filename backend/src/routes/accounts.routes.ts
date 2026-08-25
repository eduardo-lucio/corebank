import { FastifyInstance } from 'fastify';
import { getAccountBalance, getAccountStatement } from '../controllers/accounts.controller';

export async function accountRoutes(app: FastifyInstance) {
    app.get('/accounts/me/balance', { onRequest: [app.authenticate] }, getAccountBalance);
    app.get('/accounts/me/statement', { onRequest: [app.authenticate] }, getAccountStatement);
}