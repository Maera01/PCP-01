/* ============================================================
   auth.js — Controle de autenticação e perfis de acesso
   ============================================================ */

'use strict';

const USUARIOS_KEY = 'cp_usuarios';

const DEFAULT_USUARIOS = [
  { id:'u001', nome:'Admin Geral',    login:'admin',        senha:'admin123',  perfil:'admin'        },
  { id:'u002', nome:'Comercial',      login:'comercial',    senha:'com123',    perfil:'comercial'    },
  { id:'u003', nome:'Almoxarifado',   login:'almoxarifado', senha:'alm123',    perfil:'almoxarifado' },
  { id:'u004', nome:'Produção',       login:'producao',     senha:'prod123',   perfil:'producao'     },
  { id:'u005', nome:'Expedição',      login:'expedicao',    senha:'exp123',    perfil:'expedicao'    }
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

function loadUsuarios() {
  try {
    const raw = localStorage.getItem(USUARIOS_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  const usuarios = defaultUsuarios();
  localStorage.setItem(USUARIOS_KEY, JSON.stringify(usuarios));
  return usuarios;
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

function findUsuarioById(id) {
  return loadUsuarios().find(u => u.id === id);
}

const Auth = {
  _key: 'cp_sessao',

  login(loginVal, senhaVal) {
    const user = findUsuarioByLogin(loginVal);
    if (!user || user.senha !== senhaVal) return false;
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
    return loadUsuarios();
  },

  getUsuario(id) {
    return findUsuarioById(id);
  },

  validarCredenciais(loginVal, senhaVal) {
    const user = findUsuarioByLogin(loginVal);
    if (!user || user.senha !== senhaVal) return null;
    return user;
  },

  criarUsuario(data) {
    const usuarios = loadUsuarios();
    if (!data.login || !data.senha || !data.nome) return null;
    if (findUsuarioByLogin(data.login)) return null;
    const novo = {
      id: novoIdUsuario(),
      nome: data.nome.trim(),
      login: data.login.trim(),
      senha: data.senha,
      perfil: data.perfil || 'expedicao',
      permissoes: data.permissoes || PERMISSOES[data.perfil] || {}
    };
    usuarios.push(novo);
    saveUsuarios(usuarios);
    return novo;
  },

  atualizarUsuario(id, patch) {
    const usuarios = loadUsuarios();
    const idx = usuarios.findIndex(u => u.id === id);
    if (idx < 0) return null;
    const usuario = usuarios[idx];
    usuarios[idx] = {
      ...usuario,
      ...patch,
      nome: patch.nome ? patch.nome.trim() : usuario.nome,
      login: patch.login ? patch.login.trim() : usuario.login,
      permissoes: patch.permissoes ? patch.permissoes : usuario.permissoes
    };
    saveUsuarios(usuarios);
    return usuarios[idx];
  },

  removerUsuario(id) {
    const usuarios = loadUsuarios();
    const filtrados = usuarios.filter(u => u.id !== id);
    if (filtrados.length === usuarios.length) return false;
    saveUsuarios(filtrados);
    return true;
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
