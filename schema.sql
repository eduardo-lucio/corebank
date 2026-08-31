--
-- PostgreSQL database dump
--

\restrict G8DOyoqSixewTM9lDg5qdwEWlO51dAciFfrUyewpwgtdNsrklRg6OknzE2td7fJ

-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: schema; Type: SCHEMA; Schema: -; Owner: bank_admin
--

CREATE SCHEMA schema;


ALTER SCHEMA schema OWNER TO bank_admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: bank_admin
--

CREATE TABLE public.accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    account_number text NOT NULL,
    balance integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.accounts OWNER TO bank_admin;

--
-- Name: transactions; Type: TABLE; Schema: public; Owner: bank_admin
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_account_id uuid,
    receiver_account_id uuid,
    amount integer NOT NULL,
    type text NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT account_chk CHECK ((sender_account_id <> receiver_account_id)),
    CONSTRAINT account_id_chk CHECK (((sender_account_id IS NOT NULL) OR (receiver_account_id IS NOT NULL))),
    CONSTRAINT amount_chk CHECK ((amount > 0)),
    CONSTRAINT status_chk CHECK ((status = ANY (ARRAY['PENDING'::text, 'DONE'::text, 'REFUND'::text, 'FAILED'::text]))),
    CONSTRAINT type_chk CHECK ((type = ANY (ARRAY['DEPOSIT'::text, 'WITHDRAW'::text, 'PAYMENT'::text, 'TRANSFER'::text])))
);


ALTER TABLE public.transactions OWNER TO bank_admin;

--
-- Name: users; Type: TABLE; Schema: public; Owner: bank_admin
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text DEFAULT 'CUSTOMER'::text,
    status text DEFAULT 'ACTIVE'::text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT role_check CHECK ((role = ANY (ARRAY['CUSTOMER'::text, 'ADMIN'::text]))),
    CONSTRAINT status_check CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'BLOCKED'::text, 'PENDING'::text])))
);


ALTER TABLE public.users OWNER TO bank_admin;

--
-- Name: accounts accounts_account_number_key; Type: CONSTRAINT; Schema: public; Owner: bank_admin
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_account_number_key UNIQUE (account_number);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: bank_admin
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: bank_admin
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: bank_admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: bank_admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: accounts fk_user_id; Type: FK CONSTRAINT; Schema: public; Owner: bank_admin
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: transactions transactions_receiver_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bank_admin
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_receiver_account_id_fkey FOREIGN KEY (receiver_account_id) REFERENCES public.accounts(id);


--
-- Name: transactions transactions_sender_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bank_admin
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_sender_account_id_fkey FOREIGN KEY (sender_account_id) REFERENCES public.accounts(id);


--
-- PostgreSQL database dump complete
--

\unrestrict G8DOyoqSixewTM9lDg5qdwEWlO51dAciFfrUyewpwgtdNsrklRg6OknzE2td7fJ

