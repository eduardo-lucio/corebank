import { FastifyInstance } from 'fastify';
import {deposit, transfer, withdraw} from '../controllers/transactions.controller';

export async function transactionRoutes(app: FastifyInstance) {
    app.post('/transactions/transfer', { onRequest: [app.authenticate] }, transfer);
    app.post('/transactions/deposit', deposit);
    app.post('/transactions/withdraw',{ onRequest: [app.authenticate] }, withdraw);
}