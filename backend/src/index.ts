//import { app } from './app';
//
// const port = Number(process.env.PORT) || 3000;
//
// app.listen({ port, host: '0.0.0.0' }).then(() => {
//   console.log(`Servidor rodando em http://localhost:${port}`);
// });

import Fastify from 'fastify';
import {pool} from "../config/db";
import bcrypt from 'bcrypt';
import 'dotenv/config';

import {TransactionStatus} from "pg";
import fastifyJwt from "@fastify/jwt";

const app = Fastify({ logger: true });
const port = Number(process.env.PORT) || 3000;




app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'publickey',
})

app.listen({ port, host: '0.0.0.0' }).then(() => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
