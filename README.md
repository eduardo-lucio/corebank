# corebank

API backend de um sistema bancário simplificado, construída com Fastify e TypeScript sobre PostgreSQL. Suporta cadastro de usuários, autenticação via JWT, consulta de saldo/extrato e as operações financeiras de depósito, saque e transferência entre contas, com controle de concorrência e idempotência.

## Stack

- **Runtime:** Node.js + TypeScript
- **Framework HTTP:** [Fastify](https://fastify.dev/) 5
- **Banco de dados:** PostgreSQL 16 (via [`pg`](https://node-postgres.com/))
- **Autenticação:** JWT (`@fastify/jwt`)
- **Hash de senha:** bcrypt
- **Validação:** Zod
- **Testes:** Vitest
- **Infra local:** Docker Compose

## Estrutura do projeto

```
corebank/
├── docker-compose.yaml      # sobe o Postgres local
├── schema.sql                # schema do banco (executado no init do container)
└── backend/
    ├── .env.example           # modelo das variáveis de ambiente
    ├── config/
    │   └── db.ts               # pool de conexão com o Postgres
    └── src/
        ├── app.ts              # setup do Fastify, plugins e error handler
        ├── index.ts            # ponto de entrada (start do servidor)
        ├── @types/             # augmentation de tipos do Fastify (req.user)
        ├── middlewares/
        │   └── auth.ts          # middleware de autenticação JWT
        ├── controllers/        # regras de negócio de cada domínio
        └── routes/              # definição das rotas HTTP
```

## Pré-requisitos

- Node.js 20+
- Docker e Docker Compose (para o banco de dados local)

## Configuração

1. Clone o repositório e instale as dependências:

   ```bash
   cd backend
   npm install
   ```

2. Copie o `.env.example` para `.env` dentro de `backend/` e preencha os valores:

   | Variável      | Descrição                                   |
   |---------------|----------------------------------------------|
   | `DB_HOST`     | Host do PostgreSQL                            |
   | `DB_PORT`     | Porta do PostgreSQL (deve bater com a exposta no `docker-compose.yaml`) |
   | `DB_USER`     | Usuário do banco                              |
   | `DB_PASSWORD` | Senha do banco                                |
   | `DB_NAME`     | Nome do banco de dados                        |
   | `PORT`        | Porta em que a API vai rodar (padrão `3030`)  |
   | `JWT_SECRET`  | Segredo usado para assinar os tokens JWT      |

   > `DB_USER`, `DB_PASSWORD` e `DB_PORT` também são lidos pelo `docker-compose.yaml` na raiz do projeto — exporte-os no ambiente ou use um `.env` na raiz para que o Compose os enxergue também.

3. Suba o banco de dados a partir da raiz do projeto:

   ```bash
   docker compose up -d
   ```

   O `schema.sql` é executado automaticamente na primeira inicialização do container, criando as tabelas necessárias.

4. Inicie a API em modo desenvolvimento:

   ```bash
   cd backend
   npm run dev
   ```

   A API sobe em `http://localhost:<PORT>` (padrão `3030`).

## Scripts disponíveis (dentro de `backend/`)

| Comando         | Descrição                                  |
|-----------------|----------------------------------------------|
| `npm run dev`   | Sobe a API com hot-reload (`tsx watch`)      |
| `npm run build` | Compila o TypeScript para `dist/`            |
| `npm test`      | Executa os testes com Vitest                 |

## Modelo de dados

O schema principal (`schema.sql`) contempla:

- **users** — dados de cadastro, papel (`CUSTOMER`/`ADMIN`) e status (`ACTIVE`/`BLOCKED`/`PENDING`).
- **accounts** — conta bancária vinculada a um usuário, com número único e saldo.
- **transactions** — registro de depósitos, saques, transferências e pagamentos, com status (`PENDING`/`DONE`/`REFUND`/`FAILED`).
- **idempotency_keys** — registro das chaves de idempotência usadas nas rotas de transação, com expiração (`expires_at`) para evitar acúmulo indefinido.

## Endpoints

### Usuários

| Método | Rota    | Auth | Descrição                    |
|--------|---------|------|-------------------------------|
| POST   | `/users`| Não  | Cria um usuário e sua conta   |

### Sessão

| Método | Rota        | Auth | Descrição                        |
|--------|-------------|------|------------------------------------|
| POST   | `/sessions` | Não  | Autentica e retorna um token JWT   |

### Contas

| Método | Rota                      | Auth | Descrição                       |
|--------|---------------------------|------|-----------------------------------|
| GET    | `/accounts/me/balance`    | Sim  | Consulta o saldo da conta logada  |
| GET    | `/accounts/me/statement`  | Sim  | Consulta o extrato (últimas 50 transações) |

### Transações

Todas as rotas de transação exigem o header `idempotency-key` (UUID) para evitar duplicidade em caso de reenvio.

| Método | Rota                          | Auth | Descrição                          |
|--------|--------------------------------|------|---------------------------------------|
| POST   | `/transactions/deposits`      | Sim  | Deposita valor em uma conta pelo número |
| POST   | `/transactions/withdrawals`   | Sim  | Saca valor da conta logada           |
| POST   | `/transactions/transfers`     | Sim  | Transfere valor para outra conta     |

## Segurança e concorrência

- Senhas armazenadas com hash bcrypt.
- Autenticação via JWT (`@fastify/jwt`), exigida nas rotas sensíveis por meio do middleware `authenticate`.
- Operações de saque e transferência usam transações SQL (`BEGIN`/`COMMIT`/`ROLLBACK`) com `SELECT ... FOR UPDATE` para evitar condições de corrida em alterações de saldo concorrentes.
- Chave de idempotência obrigatória nas rotas de transação, persistida na tabela `idempotency_keys`, evitando que reenvios de requisição dupliquem uma operação financeira.

