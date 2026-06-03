-- Schema do Neon para o Controle de Producao.
-- O servidor tambem cria estas tabelas automaticamente ao iniciar.

CREATE SCHEMA IF NOT EXISTS controle_producao;

CREATE TABLE IF NOT EXISTS controle_producao.app_data (
  id SERIAL PRIMARY KEY,
  data_key TEXT UNIQUE,
  data_value TEXT,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS controle_producao.pedidos (
  id TEXT PRIMARY KEY,
  numero TEXT,
  dados JSONB NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS controle_producao.usuarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  login TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  perfil TEXT NOT NULL DEFAULT 'expedicao',
  permissoes JSONB NOT NULL DEFAULT '{}'::jsonb,
  criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Migracao opcional de dados antigos de public.app_data.
-- Rode este bloco se voce ja tem dados em public.app_data e quer mover tudo
-- para o schema exclusivo deste aplicativo.
DO $$
BEGIN
  IF to_regclass('public.app_data') IS NOT NULL THEN
    INSERT INTO controle_producao.app_data (data_key, data_value, updated_at)
    SELECT data_key, data_value, updated_at
    FROM public.app_data
    ON CONFLICT (data_key)
    DO UPDATE SET
      data_value = EXCLUDED.data_value,
      updated_at = EXCLUDED.updated_at;
  END IF;
END $$;

-- Os usuarios iniciais sao criados automaticamente pelo servidor com senha em
-- hash PBKDF2 + salt. Nao grave senhas em texto puro pelo SQL Editor.
--
-- Depois de confirmar que o app carregou os dados pelo novo schema, voce pode
-- remover a tabela antiga:
-- DROP TABLE public.app_data;
