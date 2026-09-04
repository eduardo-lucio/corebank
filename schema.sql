--
-- PostgreSQL database dump
--

\restrict PK7kdfLa8TMhQ9g3rqaCbzJgCmRPoL8ldfAgBgHzLfUf4HGXCbzC5f1bouYln5X

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
-- Name: schema1; Type: SCHEMA; Schema: -; Owner: bank_admin
--

CREATE SCHEMA schema1;


ALTER SCHEMA schema1 OWNER TO bank_admin;

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
-- Name: idempotency_keys; Type: TABLE; Schema: public; Owner: bank_admin
--

CREATE TABLE public.idempotency_keys (
    key character varying(255) NOT NULL,
    user_id uuid NOT NULL,
    request_path character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'PROCESSING'::character varying NOT NULL,
    response_code integer,
    response_body jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp with time zone DEFAULT (CURRENT_TIMESTAMP + '24:00:00'::interval) NOT NULL
);


ALTER TABLE public.idempotency_keys OWNER TO bank_admin;

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
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: bank_admin
--

COPY public.accounts (id, user_id, account_number, balance, created_at) FROM stdin;
f060006b-7616-47d7-97ed-80d05c6b4755	bb5953c2-25b2-4791-bea2-23e216582f97	506227	130	2026-08-19 15:21:45.434399-03
196bbc8d-f314-45a7-b448-873ffd81e8b9	88b7e0ff-70f8-4e22-8060-d39c2eda1858	625904	9950	2026-08-25 10:19:57.153368-03
\.


--
-- Data for Name: idempotency_keys; Type: TABLE DATA; Schema: public; Owner: bank_admin
--

COPY public.idempotency_keys (key, user_id, request_path, status, response_code, response_body, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: bank_admin
--

COPY public.transactions (id, sender_account_id, receiver_account_id, amount, type, status, created_at) FROM stdin;
d2d5fd57-d530-4312-b702-19c43449bb17	f060006b-7616-47d7-97ed-80d05c6b4755	196bbc8d-f314-45a7-b448-873ffd81e8b9	1	TRANSFER	DONE	2026-08-25 10:20:34.81038-03
425894ff-f8dc-4227-84e9-4c986a187d80	196bbc8d-f314-45a7-b448-873ffd81e8b9	f060006b-7616-47d7-97ed-80d05c6b4755	1	TRANSFER	DONE	2026-08-25 10:23:00.642517-03
29c1daf6-213b-4b05-95b4-3e8083b081fc	\N	f060006b-7616-47d7-97ed-80d05c6b4755	10	DEPOSIT	DONE	2026-08-27 13:04:55.125426-03
22b4aa99-3345-4e8b-8c87-aa94082557b4	\N	f060006b-7616-47d7-97ed-80d05c6b4755	10	DEPOSIT	DONE	2026-08-27 13:05:02.92399-03
1fede4f1-ad01-455f-aa90-14a8f8e2b2ab	\N	f060006b-7616-47d7-97ed-80d05c6b4755	10	DEPOSIT	DONE	2026-08-27 13:05:03.974991-03
7557a968-7063-43b0-9baa-81c4e524d48b	\N	196bbc8d-f314-45a7-b448-873ffd81e8b9	10	DEPOSIT	DONE	2026-08-27 14:25:50.935548-03
5fb445a1-1bbb-4372-85e1-2f823f9f19c6	\N	196bbc8d-f314-45a7-b448-873ffd81e8b9	10	DEPOSIT	DONE	2026-08-27 14:25:52.283493-03
15fa25f3-9733-414b-a285-8ea8ddebd2c9	\N	196bbc8d-f314-45a7-b448-873ffd81e8b9	10	DEPOSIT	DONE	2026-08-27 14:25:52.877876-03
6ef42b8a-1dfa-4028-a3ea-576fd122fa26	\N	196bbc8d-f314-45a7-b448-873ffd81e8b9	10	DEPOSIT	DONE	2026-08-27 14:25:53.459189-03
1b88764d-7808-49ce-b4f2-1edf87840b9a	\N	196bbc8d-f314-45a7-b448-873ffd81e8b9	10	DEPOSIT	DONE	2026-08-27 14:25:56.217728-03
4c8e6ee4-500b-4bf6-9289-ab652749f462	\N	196bbc8d-f314-45a7-b448-873ffd81e8b9	10000	DEPOSIT	DONE	2026-08-27 14:26:02.529217-03
6786d797-2268-41d0-a336-6d050d9c4e9d	196bbc8d-f314-45a7-b448-873ffd81e8b9	\N	100	WITHDRAW	DONE	2026-08-27 14:30:00.554504-03
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: bank_admin
--

COPY public.users (id, full_name, email, password_hash, role, status, created_at, updated_at) FROM stdin;
bb5953c2-25b2-4791-bea2-23e216582f97	joao miguel2	joaomiguelgay@gmail.com	$2b$10$sSE/wGpB.kYAdiAxTQfwyOediJBqmCutLPl2//2mEHG5IzOmH6iOe	CUSTOMER	ACTIVE	2026-08-19 15:21:45.434399-03	2026-08-19 15:21:45.434399-03
88b7e0ff-70f8-4e22-8060-d39c2eda1858	eduardo nome	eduardinhoreidelas@gmail.com	$2b$10$nwvAJcY2t71pmSSoxWxfk.MUTewjRtqq1bQu31YM4FXG4xqTvbicC	CUSTOMER	ACTIVE	2026-08-25 10:19:57.153368-03	2026-08-25 10:19:57.153368-03
\.


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
-- Name: idempotency_keys idempotency_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: bank_admin
--

ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_pkey PRIMARY KEY (user_id, key);


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
-- Name: idempotency_keys idempotency_keys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bank_admin
--

ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


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

\unrestrict PK7kdfLa8TMhQ9g3rqaCbzJgCmRPoL8ldfAgBgHzLfUf4HGXCbzC5f1bouYln5X

