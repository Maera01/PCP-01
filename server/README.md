# Servidor de Backup - Controle de Produção

Backend Node.js + Express + SQLite para sincronização e backup dos dados.

## Instalação

```bash
cd server
npm install
```

## Usar Neon com schema proprio

Quando o mesmo banco Neon atende mais de um aplicativo, configure um schema exclusivo para este app. Assim a tabela `app_data` fica em `controle_producao.app_data`, separada de `public.app_data` e dos schemas de outros sistemas.

1. Copie `server/.env.example` para `server/.env`.
2. Preencha `DATABASE_URL` com a URL do Neon.
3. Mantenha ou altere `DB_SCHEMA=controle_producao`.
4. Inicie o servidor. Ele cria o schema e a tabela automaticamente.

No Render ou outro servico de hospedagem, cadastre estas variaveis no painel:

```bash
DATABASE_URL=postgresql://...
DB_SCHEMA=controle_producao
PGSSLMODE=require
```

Se ja existem dados em `public.app_data`, rode o arquivo `server/neon-schema.sql` no SQL Editor do Neon para copiar os dados para o schema novo. Depois de conferir que o app carregou tudo corretamente, a tabela antiga `public.app_data` pode ser removida.

## Iniciar servidor

```bash
npm start
```

O servidor rodará em **http://localhost:3000**

## API Endpoints

### GET /api/health
Health check do servidor
```bash
curl http://localhost:3000/api/health
```

### GET /api/data
Carrega todos os dados (pedidos, kits, logs, etc)
```bash
curl http://localhost:3000/api/data
```

### POST /api/data
Salva todos os dados
```bash
curl -X POST http://localhost:3000/api/data \
  -H "Content-Type: application/json" \
  -d '{"data": {"pedidos": [], "logs": [...]}}'
```

### POST /api/backup
Faz backup dos dados com timestamp
```bash
curl -X POST http://localhost:3000/api/backup
```

## Integração Frontend

O frontend carrega automaticamente:
1. `js/api.js` — Cliente da API
2. Verifica disponibilidade do servidor
3. Se online: sincroniza dados periodicamente (30s)
4. Se offline: usa localStorage como fallback

## Banco de Dados

- Arquivo: `controle_producao.db` (SQLite)
- Localização: `server/` (mesmo diretório que server.js)
- PostgreSQL/Neon: schema `controle_producao` por padrão, configurável por `DB_SCHEMA`
- Tabela: `app_data` com colunas:
  - `id` (INT PRIMARY KEY)
  - `data_key` (TEXT UNIQUE) - chave dos dados
  - `data_value` (TEXT) - JSON serializado
  - `updated_at` (DATETIME) - timestamp da última atualização

## Troubleshooting

### Porta 3000 já em uso
Altere em `server.js`:
```javascript
const PORT = 3001; // ou outra porta
```

### CORS bloqueado
Verifique que `js/api.js` tem a URL correta:
```javascript
const BASE_URL = 'http://localhost:3000/api';
```

### Banco de dados corrompido
Delete `controle_producao.db` e reinicie o servidor (recriará o banco)

## Próximos passos

- [ ] Endpoints individuais para CRUD (pedidos, kits, etc)
- [ ] WebSocket para sincronização real-time
- [ ] Migração para banco de dados em nuvem
- [ ] API de autenticação
