/* ============================================================
   api.js — Sincronização com Backend / Fallback localStorage
   ============================================================ */

'use strict';

const API = {
  BASE_URL: (() => {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:3000/api';
    }
    return 'https://pcp-01.onrender.com/api';
  })(),
  _serverAvailable: null,
  _syncInterval: null,

  // ── Verificar disponibilidade do servidor ──
  async checkServer() {
    try {
      const res = await fetch(`${this.BASE_URL}/health`, { method: 'GET' });
      this._serverAvailable = res.ok;
      console.log(`🔌 Servidor: ${this._serverAvailable ? 'ONLINE ✓' : 'OFFLINE ✗'}`);
      return this._serverAvailable;
    } catch (err) {
      this._serverAvailable = false;
      console.log(`🔌 Servidor OFFLINE (usando localStorage)`);
      return false;
    }
  },

  // ── Carregar dados do servidor ou fallback ──
  async loadData() {
    try {
      if (this._serverAvailable === null) {
        await this.checkServer();
      }

      if (this._serverAvailable) {
        const res = await fetch(`${this.BASE_URL}/data`);
        if (!res.ok) throw new Error('Erro ao carregar dados do servidor');
        const json = await res.json();
        if (json.success) {
          console.log('📥 Dados carregados do servidor');
          // Sincronizar com localStorage como cache
          localStorage.setItem('controle_producao_v2', JSON.stringify(json.data));
          return json.data;
        }
      }
    } catch (err) {
      console.warn('⚠ Erro ao carregar do servidor, usando cache:', err.message);
    }

    // Fallback para localStorage
    try {
      const raw = localStorage.getItem('controle_producao_v2');
      if (raw) {
        console.log('📦 Dados do cache (localStorage)');
        return JSON.parse(raw);
      }
    } catch (e) {}

    return null;
  },

  // ── Salvar dados (servidor + localStorage) ──
  async saveData(data, options = {}) {
    // Sempre salva localmente
    try {
      localStorage.setItem('controle_producao_v2', JSON.stringify(data));
    } catch (err) {
      console.error('❌ Erro ao salvar em localStorage:', err);
    }

    // Tenta enviar ao servidor
    if (this._serverAvailable === null) {
      await this.checkServer();
    }

    if (this._serverAvailable) {
      try {
        const res = await fetch(`${this.BASE_URL}/data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data, atualizarOrdem: !!options.atualizarOrdem })
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || 'Erro ao salvar dados no servidor');
        }
        console.log('☁️ Dados sincronizados com servidor');
      } catch (err) {
        console.warn('⚠ Não foi possível sincronizar com servidor:', err.message);
        if (options.strict) throw err;
      }
    }
  },

  // ── Fazer backup no servidor ──
  async makeBackup() {
    if (this._serverAvailable === null) {
      await this.checkServer();
    }

    if (this._serverAvailable) {
      try {
        const res = await fetch(`${this.BASE_URL}/backup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const json = await res.json();
        console.log('💾 Backup realizado:', json.backupKey);
        return json;
      } catch (err) {
        console.error('❌ Erro ao fazer backup:', err);
      }
    }
  },

  // ── Iniciar sincronização periódica ──
  startAutoSync(intervalMs = 60000) {
    if (this._syncInterval) clearInterval(this._syncInterval);

    this._syncInterval = setInterval(() => {
      this.checkServer().then(available => {
        if (available && window.App?.data) {
          this.saveData(window.App.data).catch(err => {
            console.warn('Erro ao sincronizar automaticamente:', err);
          });
        }
      });
    }, intervalMs);

    console.log(`⏱ Auto-sincronização a cada ${intervalMs / 1000}s`);
  },

  // ── Parar sincronização ──
  stopAutoSync() {
    if (this._syncInterval) {
      clearInterval(this._syncInterval);
      this._syncInterval = null;
    }
  }
};
