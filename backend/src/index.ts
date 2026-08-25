import Fastify from 'fastify';
import 'dotenv/config';
import fastifyJwt from "@fastify/jwt";
const app = Fastify({ logger: true });
const port = Number(process.env.PORT) || 3000;

app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'publickey',
})

app.listen({ port, host: '0.0.0.0' }).then(() => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
