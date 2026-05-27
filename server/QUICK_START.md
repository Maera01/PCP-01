# 🚀 Quick Start - Backend

## Passo 1: Instalar dependências

```bash
cd server
npm install
```

## Passo 2: Iniciar servidor

**Opção A - Terminal (recomendado para desenvolvimento):**
```bash
npm start
```

**Opção B - Windows (duplo clique):**
Duplo clique em `server/start.bat`

Você deve ver:
```
✓ Servidor rodando em http://localhost:3000
✓ Banco de dados: server\controle_producao.db
✓ API endpoints:
  GET  /api/data       - Carregar dados
  POST /api/data       - Salvar dados
  POST /api/backup     - Fazer backup
  GET  /api/health     - Health check
```

## Passo 3: Testar no app

1. Abra `app.html` no navegador
2. Verifique o console (F12) para:
   - `🔌 Servidor: ONLINE ✓` ✅ (servidor conectado)
   - `☁️ Dados sincronizados com servidor` ✅ (dados salvos)
   - `⏱ Auto-sincronização a cada 30s` ✅ (sync automático)

3. Crie um pedido e observe:
   - Toast dizendo "✓ Conectado ao servidor de backup"
   - Dados salvos no `controle_producao.db` (pasta `server/`)

## Como verificar dados no banco

```bash
# Instalar sqlite3 CLI se não tiver
npm install -g sqlite3

# Abrir banco
sqlite3 server/controle_producao.db

# Ver dados
SELECT * FROM app_data;
.quit
```

## Parar servidor

- **Terminal**: Ctrl+C
- **start.bat**: Feche a janela

## Modo Offline

Se desligar o servidor:
- App continua funcionando normalmente
- Dados salvam em localStorage
- Quando servidor retorna, sincroniza automaticamente

## Troubleshooting

### Porta 3000 já em uso?
Edite `server.js`:
```javascript
const PORT = 3001; // mudar para outra porta
```

### Banco de dados corrompido?
Delete `server/controle_producao.db` e reinicie

### "CORS blocked"?
Verifique que `js/api.js` tem URL correta: `http://localhost:3000/api`

---

💡 **Dica**: Mantenha servidor rodando durante desenvolvimento para testar sincronização!
