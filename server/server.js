const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'controle_producao.db');

// Middlewares
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Servir arquivos estáticos (HTML, CSS, JS) da pasta pai
app.use(express.static(path.join(__dirname, '..')));

// ── DATABASE INIT ──
let db;
const initDB = () => {
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
        else resolve();
      });
    });
  });
};

// ── HELPER: Salvar/Carregar dados JSON na tabela ──
const saveData = (key, value) => {
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
      console.log(`✓ Banco de dados: ${DB_PATH}`);
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
