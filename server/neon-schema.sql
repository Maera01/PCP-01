-- Schema unificado para o Neon - Controle de Producao
-- 1 schema: controle_producao
-- 6 tabelas: app_data, usuarios, pedidos, expedicao, concluidos, auditoria

CREATE SCHEMA IF NOT EXISTS controle_producao;

-- ─────────────────────────────────────────────
-- Tabela: app_data
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS controle_producao.app_data (
  id          SERIAL PRIMARY KEY,
  data_key    TEXT UNIQUE NOT NULL,
  data_value  TEXT,
  updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- Tabela: usuarios
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS controle_producao.usuarios (
  id             TEXT PRIMARY KEY,
  nome           TEXT NOT NULL,
  login          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  perfil         TEXT NOT NULL DEFAULT 'expedicao',
  permissoes     JSONB NOT NULL DEFAULT '{}'::jsonb,
  criado_em      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  atualizado_em  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- Tabela: pedidos
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS controle_producao.pedidos (
  id             TEXT PRIMARY KEY,
  numero         TEXT,
  dados          JSONB NOT NULL,
  criado_em      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  atualizado_em  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- Tabela: expedicao
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS controle_producao.expedicao (
  id             TEXT PRIMARY KEY,
  referencia     TEXT,
  dados          JSONB NOT NULL,
  criado_em      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  atualizado_em  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- Tabela: concluidos
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS controle_producao.concluidos (
  id             TEXT PRIMARY KEY,
  referencia     TEXT,
  dados          JSONB NOT NULL,
  criado_em      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  atualizado_em  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- Tabela: auditoria
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS controle_producao.auditoria (
  id             TEXT PRIMARY KEY,
  acao           TEXT,
  dados          JSONB NOT NULL,
  criado_em      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  atualizado_em  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


-- ═════════════════════════════════════════════
-- MIGRACOES DE DADOS ANTIGOS
-- ═════════════════════════════════════════════

-- Migracao: public.app_data -> controle_producao.app_data
DO $$
BEGIN
  IF to_regclass('public.app_data') IS NOT NULL THEN
    INSERT INTO controle_producao.app_data (data_key, data_value, updated_at)
    SELECT data_key, data_value, updated_at
    FROM public.app_data
    ON CONFLICT (data_key) DO UPDATE SET
      data_value = EXCLUDED.data_value,
      updated_at = EXCLUDED.updated_at;
  END IF;
END $$;

-- Migracao: schemas antigos separados -> controle_producao.pedidos
DO $$
BEGIN
  IF to_regclass('controle_producao_pedidos.registros') IS NOT NULL THEN
    INSERT INTO controle_producao.pedidos (id, numero, dados, criado_em, atualizado_em)
    SELECT id, numero, dados, criado_em, atualizado_em
    FROM controle_producao_pedidos.registros
    ON CONFLICT (id) DO UPDATE SET
      numero        = EXCLUDED.numero,
      dados         = EXCLUDED.dados,
      atualizado_em = EXCLUDED.atualizado_em;
  END IF;
END $$;

-- Migracao: schemas antigos separados -> controle_producao.expedicao
DO $$
BEGIN
  IF to_regclass('controle_producao_expedicao.registros') IS NOT NULL THEN
    INSERT INTO controle_producao.expedicao (id, referencia, dados, criado_em, atualizado_em)
    SELECT id, referencia, dados, criado_em, atualizado_em
    FROM controle_producao_expedicao.registros
    ON CONFLICT (id) DO UPDATE SET
      referencia    = EXCLUDED.referencia,
      dados         = EXCLUDED.dados,
      atualizado_em = EXCLUDED.atualizado_em;
  END IF;
END $$;

-- Migracao: schemas antigos separados -> controle_producao.concluidos
DO $$
BEGIN
  IF to_regclass('controle_producao_concluidos.registros') IS NOT NULL THEN
    INSERT INTO controle_producao.concluidos (id, referencia, dados, criado_em, atualizado_em)
    SELECT id, referencia, dados, criado_em, atualizado_em
    FROM controle_producao_concluidos.registros
    ON CONFLICT (id) DO UPDATE SET
      referencia    = EXCLUDED.referencia,
      dados         = EXCLUDED.dados,
      atualizado_em = EXCLUDED.atualizado_em;
  END IF;
END $$;

-- Migracao: schemas antigos separados -> controle_producao.auditoria
DO $$
BEGIN
  IF to_regclass('controle_producao_auditoria.registros') IS NOT NULL THEN
    INSERT INTO controle_producao.auditoria (id, acao, dados, criado_em, atualizado_em)
    SELECT id, acao, dados, criado_em, atualizado_em
    FROM controle_producao_auditoria.registros
    ON CONFLICT (id) DO UPDATE SET
      acao          = EXCLUDED.acao,
      dados         = EXCLUDED.dados,
      atualizado_em = EXCLUDED.atualizado_em;
  END IF;
END $$;

-- Migracao: dados ainda dentro de controle_producao.app_data (formato JSON legado)
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

  -- Pedidos
  INSERT INTO controle_producao.pedidos (id, numero, dados)
  SELECT
    item.dados->>'id',
    COALESCE(item.dados->>'numero', item.dados->>'numeroOP', item.dados->>'serie', item.dados->>'id'),
    item.dados
  FROM jsonb_array_elements(COALESCE(app_json->'pedidos', '[]'::jsonb)) AS item(dados)
  WHERE item.dados ? 'id'
  ON CONFLICT (id) DO UPDATE SET
    numero        = EXCLUDED.numero,
    dados         = EXCLUDED.dados,
    atualizado_em = CURRENT_TIMESTAMP;

  -- Expedicao (status diferente de Aceito)
  INSERT INTO controle_producao.expedicao (id, referencia, dados)
  SELECT
    item.dados->>'id',
    COALESCE(item.dados->>'equipamento', item.dados->>'serie', item.dados->>'id'),
    item.dados
  FROM jsonb_array_elements(COALESCE(app_json->'expedicao', '[]'::jsonb)) AS item(dados)
  WHERE item.dados ? 'id'
    AND COALESCE(item.dados->>'statusConferencia', '') <> 'Aceito'
  ON CONFLICT (id) DO UPDATE SET
    referencia    = EXCLUDED.referencia,
    dados         = EXCLUDED.dados,
    atualizado_em = CURRENT_TIMESTAMP;

  -- Concluidos (status = Aceito)
  INSERT INTO controle_producao.concluidos (id, referencia, dados)
  SELECT
    item.dados->>'id',
    COALESCE(item.dados->>'equipamento', item.dados->>'serie', item.dados->>'id'),
    item.dados
  FROM jsonb_array_elements(COALESCE(app_json->'expedicao', '[]'::jsonb)) AS item(dados)
  WHERE item.dados ? 'id'
    AND item.dados->>'statusConferencia' = 'Aceito'
  ON CONFLICT (id) DO UPDATE SET
    referencia    = EXCLUDED.referencia,
    dados         = EXCLUDED.dados,
    atualizado_em = CURRENT_TIMESTAMP;

  -- Auditoria / logs
  INSERT INTO controle_producao.auditoria (id, acao, dados)
  SELECT
    item.dados->>'id',
    COALESCE(item.dados->>'action', item.dados->>'id'),
    item.dados
  FROM jsonb_array_elements(COALESCE(app_json->'logs', '[]'::jsonb)) AS item(dados)
  WHERE item.dados ? 'id'
  ON CONFLICT (id) DO UPDATE SET
    acao          = EXCLUDED.acao,
    dados         = EXCLUDED.dados,
    atualizado_em = CURRENT_TIMESTAMP;

END $$;

-- Os usuarios iniciais sao criados automaticamente pelo servidor com senha em
-- hash PBKDF2 + salt. Nao grave senhas em texto puro pelo SQL Editor.