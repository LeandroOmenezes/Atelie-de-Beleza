-- Migration: cria o schema e a tabela usadas pelas migrations do Supabase
-- Seguro: usa IF NOT EXISTS para evitar erros em ambientes que já têm essas estruturas

BEGIN;

-- Cria o schema que algumas ferramentas (ex: supabase cli) usam para registrar migrations
CREATE SCHEMA IF NOT EXISTS supabase_migrations;

-- Cria uma tabela mínima para registrar versões de migrations
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version bigint PRIMARY KEY,
  dirty boolean NOT NULL DEFAULT false
);

COMMIT;

-- Observação: se você usa uma ferramenta de migrations que exige colunas adicionais,
-- prefira aplicar as migrations oficiais via `supabase` CLI ou `drizzle-kit`.
