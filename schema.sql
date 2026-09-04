CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
                       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                       full_name TEXT NOT NULL,
                       email TEXT NOT NULL UNIQUE,
                       password_hash TEXT NOT NULL,
                       role TEXT DEFAULT 'CUSTOMER',
                       status TEXT DEFAULT 'ACTIVE',
                       created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                       CONSTRAINT role_check
                           CHECK (role IN ('CUSTOMER', 'ADMIN')),

                       CONSTRAINT status_check
                           CHECK (status IN ('ACTIVE', 'BLOCKED', 'PENDING'))
);

CREATE TABLE accounts (
                          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                          user_id UUID NOT NULL,
                          account_number TEXT NOT NULL UNIQUE,
                          balance INTEGER DEFAULT 0,
                          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                          CONSTRAINT fk_user_id
                              FOREIGN KEY (user_id)
                                  REFERENCES users(id)
);

CREATE TABLE transactions (
                              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                              sender_account_id UUID,
                              receiver_account_id UUID,
                              amount INTEGER NOT NULL,
                              type TEXT NOT NULL,
                              status TEXT NOT NULL,
                              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

                              CONSTRAINT account_chk
                                  CHECK (sender_account_id <> receiver_account_id),

                              CONSTRAINT account_id_chk
                                  CHECK (
                                      sender_account_id IS NOT NULL
                                          OR receiver_account_id IS NOT NULL
                                      ),

                              CONSTRAINT amount_chk
                                  CHECK (amount > 0),

                              CONSTRAINT status_chk
                                  CHECK (
                                      status IN (
                                                 'PENDING',
                                                 'DONE',
                                                 'REFUND',
                                                 'FAILED'
                                          )
                                      ),

                              CONSTRAINT type_chk
                                  CHECK (
                                      type IN (
                                               'DEPOSIT',
                                               'WITHDRAW',
                                               'PAYMENT',
                                               'TRANSFER'
                                          )
                                      ),

                              CONSTRAINT transactions_sender_account_id_fkey
                                  FOREIGN KEY (sender_account_id)
                                      REFERENCES accounts(id),

                              CONSTRAINT transactions_receiver_account_id_fkey
                                  FOREIGN KEY (receiver_account_id)
                                      REFERENCES accounts(id)
);

CREATE TABLE idempotency_keys (
                                  key VARCHAR(255) NOT NULL,
                                  user_id UUID NOT NULL,
                                  request_path VARCHAR(255) NOT NULL,
                                  status VARCHAR(20) NOT NULL DEFAULT 'PROCESSING',
                                  response_code INTEGER,
                                  response_body JSONB,
                                  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                  expires_at TIMESTAMPTZ NOT NULL
                                      DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),

                                  PRIMARY KEY (user_id, key),

                                  CONSTRAINT idempotency_keys_user_id_fkey
                                      FOREIGN KEY (user_id)
                                          REFERENCES users(id)
                                          ON DELETE CASCADE
);