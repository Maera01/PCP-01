-- ─────────────────────────────────────────────────────────────
-- Schema unificado: controle_producao
-- 7 tabelas: dashboard, pedidos, expedicao, concluidos,
--            auditoria, usuarios, kits
-- ─────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS controle_producao;

-- ─────────────────────────────────────────────
-- 1. dashboard
-- Armazena configuracoes e metricas gerais
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS controle_producao.dashboard (
  id            SERIAL PRIMARY KEY,
  data_key      TEXT UNIQUE NOT NULL,
  data_value    TEXT,
  updated_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- 2. pedidos
-- Ordens de producao
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS controle_producao.pedidos (
  id            TEXT PRIMARY KEY,
  numero        TEXT,
  dados         JSONB NOT NULL,
  criado_em     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- 3. expedicao
-- Itens aguardando ou em processo de expedicao
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS controle_producao.expedicao (
  id            TEXT PRIMARY KEY,
  referencia    TEXT,
  dados         JSONB NOT NULL,
  criado_em     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- 4. concluidos
-- Itens finalizados / aceitos
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS controle_producao.concluidos (
  id            TEXT PRIMARY KEY,
  referencia    TEXT,
  dados         JSONB NOT NULL,
  criado_em     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- 5. auditoria
-- Logs de acoes do sistema
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS controle_producao.auditoria (
  id            TEXT PRIMARY KEY,
  acao          TEXT,
  dados         JSONB NOT NULL,
  criado_em     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- 6. usuarios
-- Usuarios e permissoes de acesso
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS controle_producao.usuarios (
  id            TEXT PRIMARY KEY,
  nome          TEXT NOT NULL,
  login         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  perfil        TEXT NOT NULL DEFAULT 'expedicao',
  permissoes    JSONB NOT NULL DEFAULT '{}'::jsonb,
  criado_em     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- 7. kits
-- Kits de produtos cadastrados
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS controle_producao.kits (
  id            TEXT PRIMARY KEY,
  nome          TEXT,
  dados         JSONB NOT NULL,
  criado_em     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


-- ═════════════════════════════════════════════
-- MIGRACOES DE DADOS ANTIGOS
-- ═════════════════════════════════════════════

-- public.app_data -> controle_producao.dashboard
DO $$
BEGIN
  IF to_regclass('public.app_data') IS NOT NULL THEN
    INSERT INTO controle_producao.dashboard (data_key, data_value, updated_at)
    SELECT data_key, data_value, updated_at
    FROM public.app_data
    ON CONFLICT (data_key) DO UPDATE SET
      data_value = EXCLUDED.data_value,
      updated_at = EXCLUDED.updated_at;
  END IF;
END $$;

-- controle_producao_pedidos.registros -> controle_producao.pedidos
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

-- controle_producao_expedicao.registros -> controle_producao.expedicao
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

-- controle_producao_concluidos.registros -> controle_producao.concluidos
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

-- controle_producao_auditoria.registros -> controle_producao.auditoria
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

-- Migracao do JSON legado dentro de controle_producao.dashboard
DO $$
DECLARE
  app_json JSONB;
BEGIN
  -- Tenta ler do dashboard primeiro, depois do app_data legado
  SELECT data_value::jsonb INTO app_json
  FROM controle_producao.dashboard
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

  -- Expedicao (nao concluidos)
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

  -- Concluidos (statusConferencia = Aceito)
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

  -- Kits
  INSERT INTO controle_producao.kits (id, nome, dados)
  SELECT
    item.dados->>'id',
    COALESCE(item.dados->>'nome', item.dados->>'id'),
    item.dados
  FROM jsonb_array_elements(COALESCE(app_json->'kits', '[]'::jsonb)) AS item(dados)
  WHERE item.dados ? 'id'
  ON CONFLICT (id) DO UPDATE SET
    nome          = EXCLUDED.nome,
    dados         = EXCLUDED.dados,
    atualizado_em = CURRENT_TIMESTAMP;

END $$;

-- Os usuarios iniciais sao criados automaticamente pelo servidor com senha
-- em hash PBKDF2 + salt. Nao grave senhas em texto puro pelo SQL Editor.