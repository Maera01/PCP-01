const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const loadLocalEnv = () => {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

loadLocalEnv();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'controle_producao.db');
const USE_POSTGRES = Boolean(process.env.DATABASE_URL);
const DB_SCHEMA = process.env.DB_SCHEMA || 'controle_producao';

const quoteIdentifier = (value) => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error('Identificador invalido. Use apenas letras, numeros e underscore.');
  }
  return `"${value}"`;
};

// ── Todas as tabelas dentro do mesmo schema controle_producao ──
const schema = () => quoteIdentifier(DB_SCHEMA);
const table = (name) => `${schema()}.${quoteIdentifier(name)}`;

const postgresDashboardTable  = () => table('dashboard');
const postgresPedidosTable    = () => table('pedidos');
const postgresExpedicaoTable  = () => table('expedicao');
const postgresConcluidosTable = () => table('concluidos');
const postgresAuditoriaTable  = () => table('auditoria');
const postgresUsuariosTable   = () => table('usuarios');
const postgresKitsTable       = () => table('kits');

const PERMISSOES = {
  admin: {
    paginas: ['dashboard', 'pedidos', 'expedicao', 'concluidos', 'auditoria', 'usuarios'],
    criarPedido: true,
    editarComercial: true,
    editarAlmoxarifado: true,
    editarProducao: true,
    editarExpedicao: true,
    excluir: true,
    exportar: true
  },
  comercial: {
    paginas: ['dashboard', 'pedidos', 'concluidos'],
    criarPedido: true,
    editarComercial: true,
    editarAlmoxarifado: false,
    editarProducao: false,
    editarExpedicao: false,
    excluir: false,
    exportar: false
  },
  almoxarifado: {
    paginas: ['dashboard', 'pedidos', 'concluidos'],
    criarPedido: false,
    editarComercial: false,
    editarAlmoxarifado: true,
    editarProducao: false,
    editarExpedicao: false,
    excluir: false,
    exportar: false
  },
  producao: {
    paginas: ['dashboard', 'pedidos', 'concluidos'],
    criarPedido: false,
    editarComercial: false,
    editarAlmoxarifado: false,
    editarProducao: true,
    editarExpedicao: false,
    excluir: false,
    exportar: false
  },
  expedicao: {
    paginas: ['dashboard', 'expedicao', 'concluidos'],
    criarPedido: false,
    editarComercial: false,
    editarAlmoxarifado: false,
    editarProducao: false,
    editarExpedicao: true,
    excluir: false,
    exportar: false
  }
};

const novoIdUsuario = () => 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const hashSenha = (senha) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const iterations = 120000;
  const hash = crypto.pbkdf2Sync(String(senha), salt, iterations, 32, 'sha256').toString('hex');
  return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
};

const validarSenha = (senha, passwordHash) => {
  if (!passwordHash) return false;
  const [algo, iterationsRaw, salt, expected] = String(passwordHash).split('$');
  if (algo !== 'pbkdf2_sha256' || !iterationsRaw || !salt || !expected) return false;
  const hash = crypto.pbkdf2Sync(String(senha), salt, Number(iterationsRaw), 32, 'sha256');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return expectedBuffer.length === hash.length && crypto.timingSafeEqual(hash, expectedBuffer);
};

const masterUsuario = () => ({
  id: 'master',
  nome: 'Master',
  login: 'master',
  perfil: 'admin',
  permissoes: PERMISSOES.admin
});

const validarMasterPassword = (login, senha) => {
  const masterPassword = process.env.MAERA_MASTER_PASSWORD;
  if (!masterPassword || String(login).trim().toLowerCase() !== 'master') return null;

  const senhaBuffer = Buffer.from(String(senha || ''));
  const masterBuffer = Buffer.from(String(masterPassword));
  if (senhaBuffer.length !== masterBuffer.length) return null;

  return crypto.timingSafeEqual(senhaBuffer, masterBuffer) ? masterUsuario() : null;
};

const sanitizeUsuario = (usuario) => ({
  id: usuario.id,
  nome: usuario.nome,
  login: usuario.login,
  perfil: usuario.perfil,
  permissoes: typeof usuario.permissoes === 'string'
    ? JSON.parse(usuario.permissoes || '{}')
    : (usuario.permissoes || {})
});

// Middlewares
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, '..')));

// ── DATABASE INIT ──
let db;
let pool;

const initDB = () => {
  if (USE_POSTGRES) {
    const shouldUseSSL =
      process.env.PGSSLMODE === 'require' ||
      process.env.DATABASE_URL.includes('neon.tech') ||
      process.env.NODE_ENV === 'production';

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: shouldUseSSL ? { rejectUnauthorized: false } : false
    });

    return createTables().then(() => {
      console.log('Conectado ao PostgreSQL');
    });
  }

  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Erro ao abrir DB:', err);
        reject(err);
      } else {
        console.log('Conectado ao SQLite');
        createTables().then(resolve).catch(reject);
      }
    });
  });
};

const createTables = () => {
  if (USE_POSTGRES) {
    // ── 1 schema, 7 tabelas ──
    return pool.query(`
      CREATE SCHEMA IF NOT EXISTS ${schema()};

      CREATE TABLE IF NOT EXISTS ${postgresDashboardTable()} (
        id            SERIAL PRIMARY KEY,
        data_key      TEXT UNIQUE NOT NULL,
        data_value    TEXT,
        updated_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ${postgresPedidosTable()} (
        id            TEXT PRIMARY KEY,
        numero        TEXT,
        dados         JSONB NOT NULL,
        criado_em     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ${postgresExpedicaoTable()} (
        id            TEXT PRIMARY KEY,
        referencia    TEXT,
        dados         JSONB NOT NULL,
        criado_em     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ${postgresConcluidosTable()} (
        id            TEXT PRIMARY KEY,
        referencia    TEXT,
        dados         JSONB NOT NULL,
        criado_em     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ${postgresAuditoriaTable()} (
        id            TEXT PRIMARY KEY,
        acao          TEXT,
        dados         JSONB NOT NULL,
        criado_em     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ${postgresUsuariosTable()} (
        id            TEXT PRIMARY KEY,
        nome          TEXT NOT NULL,
        login         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        perfil        TEXT NOT NULL DEFAULT 'expedicao',
        permissoes    JSONB NOT NULL DEFAULT '{}'::jsonb,
        criado_em     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ${postgresKitsTable()} (
        id            TEXT PRIMARY KEY,
        nome          TEXT,
        dados         JSONB NOT NULL,
        criado_em     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `).then(() => {
      console.log('✓ Tabelas criadas');
    });
  }

  // SQLite
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS app_data (
          id INTEGER PRIMARY KEY,
          data_key TEXT UNIQUE,
          data_value TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) return reject(err);
        db.run(`
          CREATE TABLE IF NOT EXISTS usuarios (
            id TEXT PRIMARY KEY,
            nome TEXT NOT NULL,
            login TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            perfil TEXT NOT NULL DEFAULT 'expedicao',
            permissoes TEXT NOT NULL DEFAULT '{}',
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
            atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (userErr) => {
          if (userErr) reject(userErr);
          else resolve();
        });
      });
    });
  });
};

const listarUsuarios = async () => {
  if (USE_POSTGRES) {
    const result = await pool.query(
      `SELECT id, nome, login, perfil, permissoes FROM ${postgresUsuariosTable()} ORDER BY nome`
    );
    return result.rows.map(sanitizeUsuario);
  }
  return new Promise((resolve, reject) => {
    db.all('SELECT id, nome, login, perfil, permissoes FROM usuarios ORDER BY nome', (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map(sanitizeUsuario));
    });
  });
};

const buscarUsuarioPorLogin = async (login) => {
  if (USE_POSTGRES) {
    const result = await pool.query(
      `SELECT * FROM ${postgresUsuariosTable()} WHERE login = $1`,
      [String(login).trim()]
    );
    return result.rows[0] || null;
  }
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM usuarios WHERE login = ?', [String(login).trim()], (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
};

const inserirUsuario = async ({ id, nome, login, senha, perfil, permissoes }) => {
  const usuario = {
    id: id || novoIdUsuario(),
    nome: String(nome || '').trim(),
    login: String(login || '').trim(),
    perfil: perfil || 'expedicao',
    permissoes: permissoes || PERMISSOES[perfil] || {}
  };
  const passwordHash = hashSenha(senha);

  if (USE_POSTGRES) {
    const result = await pool.query(
      `INSERT INTO ${postgresUsuariosTable()} (id, nome, login, password_hash, perfil, permissoes, criado_em, atualizado_em)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, nome, login, perfil, permissoes`,
      [usuario.id, usuario.nome, usuario.login, passwordHash, usuario.perfil, JSON.stringify(usuario.permissoes)]
    );
    return sanitizeUsuario(result.rows[0]);
  }

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO usuarios (id, nome, login, password_hash, perfil, permissoes, criado_em, atualizado_em)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [usuario.id, usuario.nome, usuario.login, passwordHash, usuario.perfil, JSON.stringify(usuario.permissoes)],
      (err) => err ? reject(err) : resolve(sanitizeUsuario(usuario))
    );
  });
};

const atualizarUsuario = async (id, patch) => {
  const nome = String(patch.nome || '').trim();
  const login = String(patch.login || '').trim();
  const perfil = patch.perfil || 'expedicao';
  const permissoes = patch.permissoes || PERMISSOES[perfil] || {};
  const senha = String(patch.senha || '');

  if (USE_POSTGRES) {
    const params = [id, nome, login, perfil, JSON.stringify(permissoes)];
    let senhaSql = '';
    if (senha) {
      params.push(hashSenha(senha));
      senhaSql = `, password_hash = $${params.length}`;
    }
    const result = await pool.query(
      `UPDATE ${postgresUsuariosTable()}
       SET nome = $2, login = $3, perfil = $4, permissoes = $5::jsonb, atualizado_em = CURRENT_TIMESTAMP${senhaSql}
       WHERE id = $1
       RETURNING id, nome, login, perfil, permissoes`,
      params
    );
    return result.rows[0] ? sanitizeUsuario(result.rows[0]) : null;
  }

  return new Promise((resolve, reject) => {
    const params = [nome, login, perfil, JSON.stringify(permissoes)];
    let senhaSql = '';
    if (senha) {
      params.push(hashSenha(senha));
      senhaSql = ', password_hash = ?';
    }
    params.push(id);
    db.run(
      `UPDATE usuarios SET nome = ?, login = ?, perfil = ?, permissoes = ?, atualizado_em = CURRENT_TIMESTAMP${senhaSql} WHERE id = ?`,
      params,
      function onUpdate(err) {
        if (err) return reject(err);
        if (this.changes === 0) return resolve(null);
        db.get('SELECT id, nome, login, perfil, permissoes FROM usuarios WHERE id = ?', [id], (getErr, row) => {
          if (getErr) reject(getErr);
          else resolve(row ? sanitizeUsuario(row) : null);
        });
      }
    );
  });
};

const removerUsuario = async (id) => {
  if (USE_POSTGRES) {
    const result = await pool.query(`DELETE FROM ${postgresUsuariosTable()} WHERE id = $1`, [id]);
    return result.rowCount > 0;
  }
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM usuarios WHERE id = ?', [id], function onDelete(err) {
      if (err) reject(err);
      else resolve(this.changes > 0);
    });
  });
};

// ── HELPERS DE LABEL ──
const numeroPedido = (pedido) =>
  String(pedido?.numero || pedido?.numeroOP || pedido?.serie || pedido?.id || '').trim();

const referenciaExpedicao = (item) =>
  String(item?.equipamento || item?.serie || item?.id || '').trim();

const acaoAuditoria = (log) =>
  String(log?.action || log?.id || '').trim();

const nomeKit = (kit) =>
  String(kit?.nome || kit?.id || '').trim();

// ── SALVAR/CARREGAR REGISTROS (PostgreSQL) ──
const salvarRegistrosPostgres = async (tbl, labelColumn, registros, labelFn) => {
  if (!Array.isArray(registros)) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ids = [];

    for (const registro of registros) {
      if (!registro?.id) continue;
      ids.push(String(registro.id));
      await client.query(
        `INSERT INTO ${tbl} (id, ${quoteIdentifier(labelColumn)}, dados, criado_em, atualizado_em)
         VALUES ($1, $2, $3::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET
           ${quoteIdentifier(labelColumn)} = EXCLUDED.${quoteIdentifier(labelColumn)},
           dados = EXCLUDED.dados,
           atualizado_em = CURRENT_TIMESTAMP`,
        [String(registro.id), labelFn(registro), JSON.stringify(registro)]
      );
    }

    if (ids.length) {
      await client.query(`DELETE FROM ${tbl} WHERE NOT (id = ANY($1::text[]))`, [ids]);
    } else {
      await client.query(`DELETE FROM ${tbl}`);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const salvarPedidosPostgres    = (pedidos)   => salvarRegistrosPostgres(postgresPedidosTable(),    'numero',     pedidos,    numeroPedido);
const salvarExpedicaoPostgres  = (expedicao) => salvarRegistrosPostgres(postgresExpedicaoTable(),  'referencia', expedicao,  referenciaExpedicao);
const salvarConcluidosPostgres = (concluidos)=> salvarRegistrosPostgres(postgresConcluidosTable(), 'referencia', concluidos, referenciaExpedicao);
const salvarAuditoriaPostgres  = (logs)      => salvarRegistrosPostgres(postgresAuditoriaTable(),  'acao',       logs,       acaoAuditoria);
const salvarKitsPostgres       = (kits)      => salvarRegistrosPostgres(postgresKitsTable(),       'nome',       kits,       nomeKit);

const carregarRegistrosPostgres = async (tbl, orderBy = 'criado_em DESC') => {
  const result = await pool.query(`SELECT dados FROM ${tbl} ORDER BY ${orderBy}`);
  return result.rows.map(row => row.dados);
};

const carregarPedidosPostgres    = () => carregarRegistrosPostgres(postgresPedidosTable());
const carregarExpedicaoPostgres  = () => carregarRegistrosPostgres(postgresExpedicaoTable());
const carregarConcluidosPostgres = () => carregarRegistrosPostgres(postgresConcluidosTable());
const carregarAuditoriaPostgres  = () => carregarRegistrosPostgres(postgresAuditoriaTable(), 'criado_em DESC');
const carregarKitsPostgres       = () => carregarRegistrosPostgres(postgresKitsTable(), 'nome ASC');

const dividirExpedicao = (expedicao = []) => {
  const lista = Array.isArray(expedicao) ? expedicao : [];
  return {
    expedicaoAberta: lista.filter(item => item.statusConferencia !== 'Aceito'),
    concluidos:      lista.filter(item => item.statusConferencia === 'Aceito')
  };
};

const salvarAreasPostgres = async (data) => {
  const { expedicaoAberta, concluidos } = dividirExpedicao(data?.expedicao || []);
  await salvarPedidosPostgres(data?.pedidos || []);
  await salvarExpedicaoPostgres(expedicaoAberta);
  await salvarConcluidosPostgres(concluidos);
  await salvarAuditoriaPostgres(data?.logs || []);
  await salvarKitsPostgres(data?.kits || []);
};

// ── SALVAR/CARREGAR DADOS (dashboard + áreas) ──
const saveData = (key, value) => {
  if (USE_POSTGRES) {
    const valueToStore = key === 'app_data' && value
      ? { ...value, pedidos: [], expedicao: [], logs: [], kits: [] }
      : value;
    const json = JSON.stringify(valueToStore);

    return pool.query(
      `INSERT INTO ${postgresDashboardTable()} (data_key, data_value, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (data_key) DO UPDATE SET data_value = EXCLUDED.data_value, updated_at = CURRENT_TIMESTAMP`,
      [key, json]
    ).then(async () => {
      if (key === 'app_data') await salvarAreasPostgres(value || {});
    });
  }

  return new Promise((resolve, reject) => {
    const json = JSON.stringify(value);
    db.run(
      `INSERT OR REPLACE INTO app_data (data_key, data_value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
      [key, json],
      (err) => err ? reject(err) : resolve()
    );
  });
};

const loadData = (key) => {
  if (USE_POSTGRES) {
    return pool
      .query(`SELECT data_value FROM ${postgresDashboardTable()} WHERE data_key = $1`, [key])
      .then(async result => {
        const value = result.rows[0]?.data_value;
        const data = value ? JSON.parse(value) : null;
        if (key !== 'app_data') return data;

        const pedidos    = await carregarPedidosPostgres();
        const expedicao  = await carregarExpedicaoPostgres();
        const concluidos = await carregarConcluidosPostgres();
        const logs       = await carregarAuditoriaPostgres();
        const kits       = await carregarKitsPostgres();

        if (!data && !pedidos.length && !expedicao.length && !concluidos.length && !logs.length && !kits.length) {
          return null;
        }
        return {
          ...(data || { produtos: [], criadoEm: new Date().toISOString() }),
          pedidos,
          expedicao: [...expedicao, ...concluidos],
          logs,
          kits
        };
      });
  }

  return new Promise((resolve, reject) => {
    db.get(
      `SELECT data_value FROM app_data WHERE data_key = ?`,
      [key],
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? JSON.parse(row.data_value) : null);
      }
    );
  });
};

// ── ROUTES ──

app.get('/api/data', async (req, res) => {
  try {
    const data = await loadData('app_data') || {
      pedidos: [], expedicao: [], kits: [], logs: [],
      criadoEm: new Date().toISOString()
    };
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/data', async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ success: false, error: 'data is required' });
    await saveData('app_data', data);
    res.json({ success: true, message: 'Dados salvos com sucesso' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { login, senha } = req.body || {};
    const master = validarMasterPassword(login, senha);
    if (master) return res.json({ success: true, user: master });

    const usuario = await buscarUsuarioPorLogin(login);
    if (!usuario || !validarSenha(senha, usuario.password_hash)) {
      return res.status(401).json({ success: false, error: 'Usuario ou senha invalidos' });
    }
    res.json({ success: true, user: sanitizeUsuario(usuario) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/validate', async (req, res) => {
  try {
    const { login, senha } = req.body || {};
    const master = validarMasterPassword(login, senha);
    if (master) return res.json({ success: true, user: master });

    const usuario = await buscarUsuarioPorLogin(login);
    if (!usuario || !validarSenha(senha, usuario.password_hash)) {
      return res.status(401).json({ success: false, error: 'Credenciais invalidas' });
    }
    res.json({ success: true, user: sanitizeUsuario(usuario) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await listarUsuarios();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { nome, login, senha, perfil, permissoes } = req.body || {};
    if (!nome || !login || !senha) {
      return res.status(400).json({ success: false, error: 'nome, login e senha sao obrigatorios' });
    }
    const user = await inserirUsuario({ nome, login, senha, perfil, permissoes });
    res.status(201).json({ success: true, user });
  } catch (err) {
    const status = err.code === '23505' || String(err.message).includes('UNIQUE') ? 409 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { nome, login, perfil, permissoes, senha } = req.body || {};
    if (!nome || !login) {
      return res.status(400).json({ success: false, error: 'nome e login sao obrigatorios' });
    }
    const user = await atualizarUsuario(req.params.id, { nome, login, perfil, permissoes, senha });
    if (!user) return res.status(404).json({ success: false, error: 'Usuario nao encontrado' });
    res.json({ success: true, user });
  } catch (err) {
    const status = err.code === '23505' || String(err.message).includes('UNIQUE') ? 409 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const removed = await removerUsuario(req.params.id);
    if (!removed) return res.status(404).json({ success: false, error: 'Usuario nao encontrado' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/backup', async (req, res) => {
  try {
    const data = await loadData('app_data');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupKey = `app_data_backup_${timestamp}`;
    await saveData(backupKey, data);
    res.json({ success: true, message: 'Backup criado', backupKey });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── START SERVER ──
const startServer = async () => {
  try {
    await initDB();
    app.listen(PORT, '0.0.0.0', () => {
      const os = require('os');
      const interfaces = os.networkInterfaces();
      let localIP = 'localhost';
      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
          if (iface.family === 'IPv4' && !iface.internal) {
            localIP = iface.address;
            break;
          }
        }
      }
      console.log(`✓ Servidor rodando em http://${localIP}:${PORT}`);
      console.log(`✓ URL Local: http://localhost:${PORT}`);
      console.log(`✓ Banco: ${USE_POSTGRES ? `PostgreSQL — schema: ${DB_SCHEMA}` : DB_PATH}`);
      console.log(`✓ Tabelas: ${DB_SCHEMA}.dashboard | .pedidos | .expedicao | .concluidos | .auditoria | .usuarios | .kits`);
    });
  } catch (err) {
    console.error('Erro ao iniciar servidor:', err);
    process.exit(1);
  }
};

startServer();
