import { FastifyInstance } from 'fastify';
import {deposits, transfers, withdrawals} from '../controllers/transactions.controller';

export async function transactionRoutes(app: FastifyInstance) {
    app.post('/transactions/transfers', { onRequest: [app.authenticate] }, transfers);
    app.post('/transactions/deposits', { onRequest: [app.authenticate] }, deposits);
    app.post('/transactions/withdrawals',{ onRequest: [app.authenticate] }, withdrawals);
}