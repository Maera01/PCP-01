# 🏗️ Arquitetura do Sistema

## Visão Geral

```
┌─────────────────────────────────────────────────────────────┐
│                        NAVEGADOR (Frontend)                  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         app.html (SPA - Single Page App)             │   │
│  │  - Sidebar com navegação                             │   │
│  │  - Modais para CRUD                                  │   │
│  │  - Páginas dinâmicas (dashboard, pedidos, etc)       │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ▲                                   │
│                           │                                   │
│  ┌─────────┬────────┬────────────┐                          │
│  │  auth.js│ app.js │   api.js   │                          │
│  ├─────────┼────────┼────────────┤                          │
│  │Auth     │App     │API         │                          │
│  │-login   │-CRUD   │-fetch/save │                          │
│  │-perms   │-logs   │-sync       │                          │
│  │         │-render │-backup     │                          │
│  └─────────┴────────┴────────────┘                          │
│           │              │             │                     │
│           ▼              ▼             ▼                     │
│      ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│      │localStorage│  │ Console  │  │  Fetch   │ (HTTP)      │
│      │(Cache)    │  │ (Debug)  │  │ (API)    │              │
│      └──────────┘  └──────────┘  └──────────┘               │
└─────────────────────────────────────────────────────────────┘
               │                              │
               │                      http://localhost:3000
               │                              │
               ▼                              ▼
        ┌──────────────────────────────────────────┐
        │    NODE.JS SERVER (Backend/server.js)    │
        │                                          │
        │  ┌─────────────────────────────────────┐ │
        │  │         Express App                 │ │
        │  │  - CORS middleware                  │ │
        │  │  - Body parser (JSON)               │ │
        │  │  - Route handlers                   │ │
        │  └─────────────────────────────────────┘ │
        │           │         │         │          │
        │           ▼         ▼         ▼          │
        │   ┌──────────┐┌──────────┐┌──────────┐  │
        │   │GET /data ││POST /data││POST /bak │  │
        │   │(Load all)││(Save all)││(Backup)  │  │
        │   └──────────┘└──────────┘└──────────┘  │
        │           │         │         │          │
        │           └─────────┼─────────┘          │
        │                     ▼                    │
        │         ┌──────────────────────┐        │
        │         │   SQLite Database    │        │
        │         │                      │        │
        │         │  app_data Table:     │        │
        │         │  - id (PK)           │        │
        │         │  - data_key (UQ)     │        │
        │         │  - data_value (JSON) │        │
        │         │  - updated_at        │        │
        │         │                      │        │
        │         │  controle_producao   │        │
        │         │  .db (arquivo)       │        │
        │         └──────────────────────┘        │
        └──────────────────────────────────────────┘
```

## Fluxo de Dados

### 1️⃣ Carregamento (App Init)

```
app.html carrega
    ↓
js/auth.js executa (define Auth, USUARIOS, PERMISSOES)
    ↓
js/api.js executa (define API com métodos)
    ↓
js/app.js executa (define App, Store)
    ↓
App.init() é chamado
    ├─ Store.load() busca dados:
    │   ├─ localStorage primeiro (rápido, offline)
    │   └─ Se vazio, retorna dados padrão
    │
    ├─ API.checkServer() verifica servidor
    │   ├─ Se online: ✓ Conectado ao servidor
    │   └─ Se offline: ⚠ Operando com localStorage
    │
    └─ API.startAutoSync() inicia sincronização (30s)
```

### 2️⃣ Salvamento (Criar/Editar/Deletar)

```
Usuário clica "Salvar Pedido"
    ↓
salvarPedido() ou salvarKit() (etc)
    ├─ Valida dados
    ├─ Atualiza App.data
    ├─ Chama App.log() → registra auditoria
    └─ Chama await Store.save(App.data)
            ↓
        ┌─ Salva em localStorage (sempre)
        │
        └─ Se API disponível:
            └─ Faz POST /api/data
                └─ Servidor salva em SQLite
                    └─ Console: ☁️ Dados sincronizados
```

### 3️⃣ Sincronização Automática (30s)

```
A cada 30 segundos (se servidor online):
    ↓
API.startAutoSync() dispara callback
    ├─ Pega App.data atual
    └─ Faz POST /api/data (mesma salvarPedido)
        └─ Atualiza timestamp no banco
```

### 4️⃣ Modo Offline

```
Servidor desligado
    ↓
Usuário cria pedido
    ├─ salvarPedido() → Store.save() chamado
    ├─ localStorage salva (✓ sucesso)
    ├─ API.saveData() tenta POST /api/data
    └─ Falha silenciosa (⚠ console.warn)
        └─ Dados não estão perdidos! (localStorage)

Servidor volta online
    ↓
App.startAutoSync() detecta servidor
    ├─ GET /api/health sucesso
    └─ Próximo POST /api/data sincroniza pedidos que faltavam
```

## Estrutura de Dados

### Store (localStorage e BD)

```json
{
  "pedidos": [
    {
      "id": 1,
      "numero": "PED-001",
      "serie": "A",
      "etapas": {
        "comercial": { "status": "completo" },
        "almoxarifado": { "status": "pendente" },
        ...
      },
      ...
    }
  ],
  "expedicao": [
    {
      "idPedido": 1,
      "kits": [...],
      "conferencia": { ... }
    }
  ],
  "kits": [
    {
      "id": 1,
      "nome": "Kit A",
      "acessorios": [...]
    }
  ],
  "logs": [
    {
      "id": 1,
      "timestamp": "2024-01-20T10:30:00Z",
      "usuario": "admin",
      "perfil": "admin",
      "acao": "criar_pedido",
      "detalhes": { "numero": "PED-001" }
    }
  ]
}
```

## Comunicação HTTP

### GET /api/data
```
Request:  GET http://localhost:3000/api/data
Response: 200 OK
{
  "success": true,
  "data": { ...todo conteúdo acima... }
}
```

### POST /api/data
```
Request:  POST http://localhost:3000/api/data
Body:     {
  "data": {
    "pedidos": [...],
    "logs": [...]
  }
}
Response: 200 OK
{
  "success": true,
  "message": "Dados salvos com sucesso"
}
```

## Estados do Servidor

| Status | Indicador | Comportamento |
|--------|-----------|---------------|
| **ONLINE** | 🔌 ONLINE ✓ | Sincroniza a cada 30s, fetch/save vão para API |
| **OFFLINE** | 🔌 OFFLINE ✗ | Todas as operações usam localStorage |
| **ERRO** | ⚠️ | Log do erro, fallback para localStorage |

## Segurança & Limitações (v1)

### ✅ O que temos agora:
- Validação básica de dados
- CORS habilitado
- Timestamps automáticos
- Backup com POST /api/backup

### ⚠️ O que falta (Phase 2):
- [ ] Autenticação (JWT / API Key)
- [ ] Validação de permissões no servidor
- [ ] Rate limiting
- [ ] Criptografia em trânsito (HTTPS em produção)
- [ ] SQL injection prevention (prepared statements já usadas)

## Performance

| Operação | Tempo Típico |
|----------|-------------|
| Load localStorage | ~1ms |
| POST /api/data | ~50-100ms |
| Backup (POST) | ~100-200ms |
| Sincronização 30s | ~50-100ms por ciclo |

## Próximos Passos

1. **WebSocket** - Real-time sync para múltiplos clientes
2. **API Endpoints Individuais** - GET/POST /api/pedidos, /api/kits
3. **Autenticação** - JWT tokens no servidor
4. **Cloud Deploy** - AWS/Azure/Heroku
5. **Dashboard** - Analytics de produção em tempo real
