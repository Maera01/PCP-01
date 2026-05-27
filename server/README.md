# Servidor de Backup - Controle de Produção

Backend Node.js + Express + SQLite para sincronização e backup dos dados.

## Instalação

```bash
cd server
npm install
```

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
