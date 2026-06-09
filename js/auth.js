/* ============================================================
   auth.js — Controle de autenticação e perfis de acesso
   ============================================================ */

'use strict';

const USUARIOS_KEY = 'cp_usuarios';

const DEFAULT_USUARIOS = [
  { id:'u001', nome:'Admin Geral',    login:'admin',        senha:'admin123',  perfil:'admin'        },
  { id:'u002', nome:'Comercial',      login:'comercial',    senha:'com123',    perfil:'comercial'    },
  { id:'u003', nome:'Almoxarifado',   login:'almoxarifado', senha:'alm123',    perfil:'almoxarifado' },
  { id:'u004', nome:'Producao',       login:'producao',     senha:'prod123',   perfil:'producao'     },
  { id:'u005', nome:'Expedicao',      login:'expedicao',    senha:'exp123',    perfil:'expedicao'    }
];

const PERMISSOES = {
  admin: {
    paginas:            ['dashboard','pedidos','expedicao','concluidos','auditoria','usuarios'],
    criarPedido:        true,
    editarComercial:    true,
    editarAlmoxarifado: true,
    editarProducao:     true,
    editarExpedicao:    true,
    excluir:            true,
    exportar:           true
  },
  comercial: {
    paginas:            ['dashboard','pedidos','concluidos'],
    criarPedido:        true,
    editarComercial:    true,   // ✅ só comercial
    editarAlmoxarifado: false,
    editarProducao:     false,
    editarExpedicao:    false,
    excluir:            false,
    exportar:           false
  },
  almoxarifado: {
    paginas:            ['dashboard','pedidos','concluidos'],
    criarPedido:        false,
    editarComercial:    false,
    editarAlmoxarifado: true,   // ✅ só almoxarifado
    editarProducao:     false,
    editarExpedicao:    false,
    excluir:            false,
    exportar:           false
  },
  producao: {
    paginas:            ['dashboard','pedidos','concluidos'],
    criarPedido:        false,
    editarComercial:    false,
    editarAlmoxarifado: false,
    editarProducao:     true,   // ✅ só produção
    editarExpedicao:    false,
    excluir:            false,
    exportar:           false
  },
  expedicao: {
    paginas:            ['dashboard','expedicao','concluidos'],
    criarPedido:        false,
    editarComercial:    false,
    editarAlmoxarifado: false,
    editarProducao:     false,
    editarExpedicao:    true,   // ✅ só expedição
    excluir:            false,
    exportar:           false
  }
};

function novoIdUsuario() {
  return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
}

function defaultUsuarios() {
  return DEFAULT_USUARIOS.map(u => ({
    ...u,
    permissoes: PERMISSOES[u.perfil] || {}
  }));
}

function normalizarPermissoes(permissoes) {
  const normalizadas = { ...(permissoes || {}) };
  if (typeof normalizadas.paginas === 'string') {
    normalizadas.paginas = normalizadas.paginas
      .split(/[,\s]+/)
      .map(page => page.trim())
      .filter(Boolean);
  }
  return normalizadas;
}

function normalizarUsuario(usuario) {
  if (!usuario) return null;
  return {
    ...usuario,
    permissoes: normalizarPermissoes(usuario.permissoes || PERMISSOES[usuario.perfil] || {})
  };
}

function loadUsuarios() {
  try {
    const raw = localStorage.getItem(USUARIOS_KEY);
    if (raw) return JSON.parse(raw).map(normalizarUsuario);
  } catch(e) {}
  const usuarios = defaultUsuarios();
  localStorage.setItem(USUARIOS_KEY, JSON.stringify(usuarios));
  return usuarios;
}

async function requestAuth(path, options = {}) {
  const baseUrl = typeof API !== 'undefined'
    ? API.BASE_URL
    : (() => {
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:3000/api';
        return 'https://pcp-01.onrender.com/api';
      })();

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.error || 'Erro ao comunicar com o servidor');
  }
  return json;
}

function saveUsuarios(usuarios) {
  try {
    localStorage.setItem(USUARIOS_KEY, JSON.stringify(usuarios));
  } catch(e) {}
  return usuarios;
}

function findUsuarioByLogin(login) {
  return loadUsuarios().find(u => u.login === String(login).trim());
}

function findUsuarioPadraoByLogin(login) {
  return defaultUsuarios().find(u => u.login === String(login).trim());
}

function validarUsuarioLocal(login, senha) {
  const user = findUsuarioByLogin(login);
  if (user?.senha === senha) return user;

  const padrao = findUsuarioPadraoByLogin(login);
  if (padrao?.senha === senha) return padrao;

  return null;
}

function findUsuarioById(id) {
  return loadUsuarios().find(u => u.id === id);
}

const Auth = {
  _key: 'cp_sessao',
  _usuariosCache: null,

  async login(loginVal, senhaVal) {
    let user = null;
    try {
      const json = await requestAuth('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ login: loginVal, senha: senhaVal })
      });
      user = normalizarUsuario(json.user);
    } catch (err) {
      const local = validarUsuarioLocal(loginVal, senhaVal);
      if (!local) return false;
      user = local;
    }
    localStorage.setItem(this._key, JSON.stringify({
      id:        user.id,
      nome:      user.nome,
      perfil:    user.perfil,
      permissoes: user.permissoes || PERMISSOES[user.perfil] || {},
      hora:      new Date().toISOString()
    }));
    return true;
  },

  logout() {
    localStorage.removeItem(this._key);
    window.location.href = 'index.html';
  },

  getSessao() {
    try {
      const raw = localStorage.getItem(this._key);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  },

  getPerfil() {
    return this.getSessao()?.perfil || null;
  },

  getNome() {
    return this.getSessao()?.nome || '—';
  },

  getSessaoUsuario() {
    return this.getSessao();
  },

  getUsuarios() {
    return this._usuariosCache || loadUsuarios();
  },

  getUsuario(id) {
    return (this._usuariosCache || loadUsuarios()).find(u => u.id === id);
  },

  async carregarUsuarios() {
    try {
      const json = await requestAuth('/users');
      this._usuariosCache = (json.users || []).map(normalizarUsuario);
      saveUsuarios(this._usuariosCache);
      return this._usuariosCache;
    } catch (err) {
      this._usuariosCache = loadUsuarios();
      return this._usuariosCache;
    }
  },

  async validarCredenciais(loginVal, senhaVal) {
    try {
      const json = await requestAuth('/auth/validate', {
        method: 'POST',
        body: JSON.stringify({ login: loginVal, senha: senhaVal })
      });
      return normalizarUsuario(json.user);
    } catch (err) {
      return validarUsuarioLocal(loginVal, senhaVal);
    }
  },

  async criarUsuario(data) {
    if (!data.login || !data.senha || !data.nome) return null;
    try {
      const json = await requestAuth('/users', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      await this.carregarUsuarios();
      return normalizarUsuario(json.user);
    } catch (err) {
      return null;
    }
  },

  async atualizarUsuario(id, patch) {
    try {
      const json = await requestAuth(`/users/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(patch)
      });
      await this.carregarUsuarios();
      return normalizarUsuario(json.user);
    } catch (err) {
      return null;
    }
  },

  async removerUsuario(id) {
    try {
      await requestAuth(`/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await this.carregarUsuarios();
      return true;
    } catch (err) {
      return false;
    }
  },

  pode(acao) {
    const permissoes = this.getSessao()?.permissoes;
    if (!permissoes) return false;
    return permissoes[acao] === true;
  },

  podeAcessar(pagina) {
    const permissoes = this.getSessao()?.permissoes;
    if (!permissoes) return false;
    return Array.isArray(permissoes.paginas) && permissoes.paginas.includes(pagina);
  },

  exigirLogin() {
    if (!this.getSessao()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }
};
