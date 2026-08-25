import { app } from './app';
import 'dotenv/config';

const port = Number(process.env.PORT) || 3030;

async function start() {
    try {
        await app.ready();
        console.log('ROTAS REGISTRADAS');
        console.log(app.printRoutes());

        await app.listen({ port, host: '0.0.0.0' });
        console.log(`Rodando em http://localhost:${port}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}

start();