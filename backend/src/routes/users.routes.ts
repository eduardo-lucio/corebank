import { FastifyInstance } from 'fastify';
import {createUser} from "../controllers/users.controller.";

export async function userRoutes(app: FastifyInstance) {
    app.post('/users', createUser);
}