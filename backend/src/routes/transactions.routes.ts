import { FastifyInstance } from 'fastify';
import { transfer } from '../controllers/transactions.controller';

export async function transactionRoutes(app: FastifyInstance) {
    app.post('/transactions/transfer', { onRequest: [app.authenticate] }, transfer);
}