-- Rode este SQL no Neon se voce ja tem dados em public.app_data
-- e quer mover tudo para o schema exclusivo deste aplicativo.

CREATE SCHEMA IF NOT EXISTS controle_producao;

CREATE TABLE IF NOT EXISTS controle_producao.app_data (
  id SERIAL PRIMARY KEY,
  data_key TEXT UNIQUE,
  data_value TEXT,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO controle_producao.app_data (data_key, data_value, updated_at)
SELECT data_key, data_value, updated_at
FROM public.app_data
ON CONFLICT (data_key)
DO UPDATE SET
  data_value = EXCLUDED.data_value,
  updated_at = EXCLUDED.updated_at;

-- Depois de confirmar que o app carregou os dados pelo novo schema,
-- voce pode remover a tabela antiga:
-- DROP TABLE public.app_data;
