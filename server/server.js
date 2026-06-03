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
    throw new Error('DB_SCHEMA invalido. Use apenas letras, numeros e underscore.');
  }
  return `"${value}"`;
};

const postgresTable = () => `${quoteIdentifier(DB_SCHEMA)}.app_data`;
const postgresPedidosTable = () => `${quoteIdentifier(DB_SCHEMA)}.pedidos`;
const postgresUsuariosTable = () => `${quoteIdentifier(DB_SCHEMA)}.usuarios`;

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

const DEFAULT_USUARIOS = [
  { id: 'u001', nome: 'Admin Geral', login: 'admin', senha: 'admin123', perfil: 'admin' },
  { id: 'u002', nome: 'Comercial', login: 'comercial', senha: 'com123', perfil: 'comercial' },
  { id: 'u003', nome: 'Almoxarifado', login: 'almoxarifado', senha: 'alm123', perfil: 'almoxarifado' },
  { id: 'u004', nome: 'Producao', login: 'producao', senha: 'prod123', perfil: 'producao' },
  { id: 'u005', nome: 'Expedicao', login: 'expedicao', senha: 'exp123', perfil: 'expedicao' }
];

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

// Servir arquivos estáticos (HTML, CSS, JS) da pasta pai
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
    const schema = quoteIdentifier(DB_SCHEMA);
    const table = postgresTable();
    const pedidosTable = postgresPedidosTable();
    const usuariosTable = postgresUsuariosTable();

    return pool.query(`
      CREATE SCHEMA IF NOT EXISTS ${schema};

      CREATE TABLE IF NOT EXISTS ${table} (
        id SERIAL PRIMARY KEY,
        data_key TEXT UNIQUE,
        data_value TEXT,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ${pedidosTable} (
        id TEXT PRIMARY KEY,
        numero TEXT,
        dados JSONB NOT NULL,
        criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS ${usuariosTable} (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        login TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        perfil TEXT NOT NULL DEFAULT 'expedicao',
        permissoes JSONB NOT NULL DEFAULT '{}'::jsonb,
        criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `).then(seedUsuarios);
  }

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Tabela de dados globais (pedidos, kits, logs, etc)
      db.run(`
        CREATE TABLE IF NOT EXISTS app_data (
          id INTEGER PRIMARY KEY,
          data_key TEXT UNIQUE,
          data_value TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);
        else {
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
            else seedUsuarios().then(resolve).catch(reject);
          });
        }
      });
    });
  });
};

const seedUsuarios = async () => {
  const count = await contarUsuarios();
  if (count > 0) return;

  for (const usuario of DEFAULT_USUARIOS) {
    await inserirUsuario({
      ...usuario,
      permissoes: PERMISSOES[usuario.perfil] || {}
    });
  }
};

const contarUsuarios = async () => {
  if (USE_POSTGRES) {
    const result = await pool.query(`SELECT COUNT(*)::int AS total FROM ${postgresUsuariosTable()}`);
    return result.rows[0]?.total || 0;
  }

  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) AS total FROM usuarios', (err, row) => {
      if (err) reject(err);
      else resolve(row?.total || 0);
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

// ── HELPER: Salvar/Carregar dados JSON na tabela ──
const numeroPedido = (pedido) => {
  return String(
    pedido?.numero ||
    pedido?.numeroOP ||
    pedido?.serie ||
    pedido?.id ||
    ''
  ).trim();
};

const salvarPedidosPostgres = async (pedidos) => {
  if (!Array.isArray(pedidos)) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ids = [];
    for (const pedido of pedidos) {
      if (!pedido?.id) continue;
      ids.push(String(pedido.id));

      await client.query(
        `INSERT INTO ${postgresPedidosTable()} (id, numero, dados, criado_em, atualizado_em)
         VALUES ($1, $2, $3::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (id)
         DO UPDATE SET
           numero = EXCLUDED.numero,
           dados = EXCLUDED.dados,
           atualizado_em = CURRENT_TIMESTAMP`,
        [String(pedido.id), numeroPedido(pedido), JSON.stringify(pedido)]
      );
    }

    if (ids.length) {
      await client.query(
        `DELETE FROM ${postgresPedidosTable()} WHERE NOT (id = ANY($1::text[]))`,
        [ids]
      );
    } else {
      await client.query(`DELETE FROM ${postgresPedidosTable()}`);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const carregarPedidosPostgres = async () => {
  const result = await pool.query(
    `SELECT dados FROM ${postgresPedidosTable()} ORDER BY criado_em DESC`
  );
  return result.rows.map(row => row.dados);
};

const migrarPedidosSeNecessario = async (data) => {
  if (!data || !Array.isArray(data.pedidos) || data.pedidos.length === 0) return;

  const result = await pool.query(`SELECT COUNT(*)::int AS total FROM ${postgresPedidosTable()}`);
  if (result.rows[0]?.total === 0) {
    await salvarPedidosPostgres(data.pedidos);
  }
};

const saveData = (key, value) => {
  if (USE_POSTGRES) {
    const valueToStore = key === 'app_data' && value
      ? { ...value, pedidos: [] }
      : value;
    const json = JSON.stringify(valueToStore);
    return pool.query(
      `INSERT INTO ${postgresTable()} (data_key, data_value, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (data_key)
       DO UPDATE SET data_value = EXCLUDED.data_value, updated_at = CURRENT_TIMESTAMP`,
      [key, json]
    ).then(async () => {
      if (key === 'app_data') {
        await salvarPedidosPostgres(value?.pedidos || []);
      }
    });
  }

  return new Promise((resolve, reject) => {
    const json = JSON.stringify(value);
    db.run(
      `INSERT OR REPLACE INTO app_data (data_key, data_value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
      [key, json],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
};

const loadData = (key) => {
  if (USE_POSTGRES) {
    return pool
      .query(`SELECT data_value FROM ${postgresTable()} WHERE data_key = $1`, [key])
      .then(async result => {
        const value = result.rows[0]?.data_value;
        const data = value ? JSON.parse(value) : null;
        if (key !== 'app_data' || !data) return data;

        await migrarPedidosSeNecessario(data);
        const pedidos = await carregarPedidosPostgres();
        return { ...data, pedidos };
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

// GET /api/data - Carregar todos os dados (pedidos, kits, logs, etc)
app.get('/api/data', async (req, res) => {
  try {
    const data = await loadData('app_data') || {
      pedidos: [],
      expedicao: [],
      kits: [],
      logs: [],
      criadoEm: new Date().toISOString()
    };
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/data - Salvar todos os dados
app.post('/api/data', async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ success: false, error: 'data is required' });
    }
    await saveData('app_data', data);
    res.json({ success: true, message: 'Dados salvos com sucesso' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/health - Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { login, senha } = req.body || {};
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

// POST /api/backup - Fazer backup (salva com timestamp)
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
      console.log(`✓ Banco de dados: ${USE_POSTGRES ? `PostgreSQL schema ${DB_SCHEMA}` : DB_PATH}`);
      console.log(`✓ API endpoints:`);
      console.log(`  GET  /api/data       - Carregar dados`);
      console.log(`  POST /api/data       - Salvar dados`);
      console.log(`  POST /api/backup     - Fazer backup`);
      console.log(`  GET  /api/health     - Health check`);
    });
  } catch (err) {
    console.error('Erro ao iniciar servidor:', err);
    process.exit(1);
  }
};

startServer();
