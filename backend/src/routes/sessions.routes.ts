import { FastifyInstance } from 'fastify';
import { createSession } from '../controllers/sessions.controller';

export async function sessionRoutes(app: FastifyInstance) {
    app.post('/sessions', createSession);
}