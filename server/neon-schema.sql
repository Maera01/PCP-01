-- Schema do Neon para o Controle de Producao.
-- O servidor tambem cria estas estruturas automaticamente ao iniciar.

CREATE SCHEMA IF NOT EXISTS controle_producao;
CREATE SCHEMA IF NOT EXISTS controle_producao_pedidos;
CREATE SCHEMA IF NOT EXISTS controle_producao_expedicao;
CREATE SCHEMA IF NOT EXISTS controle_producao_concluidos;
CREATE SCHEMA IF NOT EXISTS controle_producao_auditoria;

CREATE TABLE IF NOT EXISTS controle_producao.app_data (
  id SERIAL PRIMARY KEY,
  data_key TEXT UNIQUE,
  data_value TEXT,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
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

CREATE TABLE IF NOT EXISTS controle_producao_pedidos.registros (
  id TEXT PRIMARY KEY,
  numero TEXT,
  dados JSONB NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS controle_producao_expedicao.registros (
  id TEXT PRIMARY KEY,
  referencia TEXT,
  dados JSONB NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS controle_producao_concluidos.registros (
  id TEXT PRIMARY KEY,
  referencia TEXT,
  dados JSONB NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS controle_producao_auditoria.registros (
  id TEXT PRIMARY KEY,
  acao TEXT,
  dados JSONB NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Migracao opcional de dados antigos de public.app_data para o schema principal.
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

-- Migracao da tabela antiga controle_producao.pedidos para o schema novo.
DO $$
BEGIN
  IF to_regclass('controle_producao.pedidos') IS NOT NULL THEN
    INSERT INTO controle_producao_pedidos.registros (id, numero, dados, criado_em, atualizado_em)
    SELECT id, numero, dados, criado_em, atualizado_em
    FROM controle_producao.pedidos
    ON CONFLICT (id)
    DO UPDATE SET
      numero = EXCLUDED.numero,
      dados = EXCLUDED.dados,
      atualizado_em = EXCLUDED.atualizado_em;
  END IF;
END $$;

-- Migracao das listas que ainda estiverem dentro de controle_producao.app_data.
DO $$
DECLARE
  app_json JSONB;
BEGIN
  SELECT data_value::jsonb INTO app_json
  FROM controle_producao.app_data
  WHERE data_key = 'app_data';

  IF app_json IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO controle_producao_pedidos.registros (id, numero, dados)
  SELECT
    item.dados->>'id',
    COALESCE(item.dados->>'numero', item.dados->>'numeroOP', item.dados->>'serie', item.dados->>'id'),
    item.dados
  FROM jsonb_array_elements(COALESCE(app_json->'pedidos', '[]'::jsonb)) AS item(dados)
  WHERE item.dados ? 'id'
  ON CONFLICT (id)
  DO UPDATE SET
    numero = EXCLUDED.numero,
    dados = EXCLUDED.dados,
    atualizado_em = CURRENT_TIMESTAMP;

  INSERT INTO controle_producao_expedicao.registros (id, referencia, dados)
  SELECT
    item.dados->>'id',
    COALESCE(item.dados->>'equipamento', item.dados->>'serie', item.dados->>'id'),
    item.dados
  FROM jsonb_array_elements(COALESCE(app_json->'expedicao', '[]'::jsonb)) AS item(dados)
  WHERE item.dados ? 'id'
    AND COALESCE(item.dados->>'statusConferencia', '') <> 'Aceito'
  ON CONFLICT (id)
  DO UPDATE SET
    referencia = EXCLUDED.referencia,
    dados = EXCLUDED.dados,
    atualizado_em = CURRENT_TIMESTAMP;

  INSERT INTO controle_producao_concluidos.registros (id, referencia, dados)
  SELECT
    item.dados->>'id',
    COALESCE(item.dados->>'equipamento', item.dados->>'serie', item.dados->>'id'),
    item.dados
  FROM jsonb_array_elements(COALESCE(app_json->'expedicao', '[]'::jsonb)) AS item(dados)
  WHERE item.dados ? 'id'
    AND item.dados->>'statusConferencia' = 'Aceito'
  ON CONFLICT (id)
  DO UPDATE SET
    referencia = EXCLUDED.referencia,
    dados = EXCLUDED.dados,
    atualizado_em = CURRENT_TIMESTAMP;

  INSERT INTO controle_producao_auditoria.registros (id, acao, dados)
  SELECT
    item.dados->>'id',
    COALESCE(item.dados->>'action', item.dados->>'id'),
    item.dados
  FROM jsonb_array_elements(COALESCE(app_json->'logs', '[]'::jsonb)) AS item(dados)
  WHERE item.dados ? 'id'
  ON CONFLICT (id)
  DO UPDATE SET
    acao = EXCLUDED.acao,
    dados = EXCLUDED.dados,
    atualizado_em = CURRENT_TIMESTAMP;
END $$;

-- Os usuarios iniciais sao criados automaticamente pelo servidor com senha em
-- hash PBKDF2 + salt. Nao grave senhas em texto puro pelo SQL Editor.
