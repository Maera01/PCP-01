/* ============================================================
   CONTROLE DE PRODUÇÃO — app.js
   ============================================================ */
'use strict';

// ── DADOS ───────────────────────────────────────────────────

const PRODUTOS = [
  'ABI100','ABI200','APE100','AQT110','ASE100','AVM100',
  'Cabo ASE100 ponta de prova pino e garra',
  'Cabo MOX100','Cabo SEG100 ponta de prova pino e garra',
  'IPA100','JAU130','JAU200','MCV100','MCV520','MDC100',
  'MOX100','MPR100','MUT200','PNI100','SEG100',
  'SIM110','SIM300','SMP100','SMP200','SOP100','SPK100',
  'TERMOPAR','TIN10','TQC100'
];

const ET_NOMES = {
  conferencia:      'Conferência',
  montagemRevisao:  'Montagem / Revisão',
  testeInicial:     'Teste Inicial',
  montagemMecanica: 'Montagem Mecânica',
  testeFinal:       'Teste Final',
  fechamentoFinal:  'Fechamento Final',
  burnIn:           'Burn-in'
};

const ET_KEYS = [
  'conferencia','montagemRevisao','testeInicial',
  'montagemMecanica','testeFinal','fechamentoFinal','burnIn'
];

function etapaVazia() {
  return {
    inicio: '',
    problema: 'Não',
    fim: '',
    tipoConferencia: '',
    problemaSaida: '',
    problemaDescricao: '',
    problemaRetorno: ''
  };
}

const SEED_PEDIDOS = [
  {
    id:'p001', produto:'TERMOPAR', serie:'', cliente:'', cor:'',
    quantidade:12, dataPedido:'2026-01-01', prazo:'2025-12-29',
    statusVencimento:'Produzido', diasAtraso:32, statusSep:'Separado',
    dataSep:'2025-12-29', observacao:'Faltando chegar cabos já comprado. Chegou',
    situacao:'VENDIDO', materialCorreto:'Sim',
    dataEntregaParcial:'2025-12-29', dataEntregaTotal:'2026-01-30',
    etapas:{
      conferencia:     {inicio:'',          problema:'Não', fim:''},
      montagemRevisao: {inicio:'2026-01-29', problema:'Não', fim:'2026-01-30'},
      testeInicial:    {inicio:'2026-01-29', problema:'Não', fim:'2026-01-29'},
      montagemMecanica:{inicio:'2026-01-30', problema:'Não', fim:'2026-01-30'},
      testeFinal:      {inicio:'',          problema:'Não', fim:''},
      fechamentoFinal: {inicio:'',          problema:'Não', fim:''},
      burnIn:          {inicio:'2026-01-30', problema:'Não', fim:''}
    }
  },
  {
    id:'p002', produto:'AVM100', serie:'20250411019', cliente:'', cor:'Laranja',
    quantidade:1, dataPedido:'2026-01-01', prazo:'2026-01-07',
    statusVencimento:'Produzido', diasAtraso:2, statusSep:'Separado',
    dataSep:'2025-12-29', observacao:'ok', situacao:'VENDIDO',
    materialCorreto:'Sim', dataEntregaParcial:'', dataEntregaTotal:'2025-12-29',
    etapas:{
      conferencia:     {inicio:'',          problema:'Não', fim:''},
      montagemRevisao: {inicio:'2026-01-05', problema:'Não', fim:'2026-01-06'},
      testeInicial:    {inicio:'2026-01-06', problema:'Não', fim:'2026-01-06'},
      montagemMecanica:{inicio:'2026-01-07', problema:'Não', fim:'2026-01-09'},
      testeFinal:      {inicio:'2026-01-09', problema:'Não', fim:'2026-01-09'},
      fechamentoFinal: {inicio:'2026-01-09', problema:'Não', fim:'2026-01-09'},
      burnIn:          {inicio:'2026-01-09', problema:'Não', fim:''}
    }
  },
  {
    id:'p003', produto:'ASE100', serie:'20251016005', cliente:'', cor:'Laranja',
    quantidade:1, dataPedido:'2026-01-01', prazo:'2026-01-09',
    statusVencimento:'Produzido', diasAtraso:0, statusSep:'Separado',
    dataSep:'2025-12-29', observacao:'ok', situacao:'VENDIDO',
    materialCorreto:'Sim', dataEntregaParcial:'', dataEntregaTotal:'2025-12-29',
    etapas:{
      conferencia:     {inicio:'',          problema:'Não', fim:''},
      montagemRevisao: {inicio:'2026-01-05', problema:'Não', fim:'2026-01-06'},
      testeInicial:    {inicio:'2026-01-07', problema:'Não', fim:'2026-01-08'},
      montagemMecanica:{inicio:'2026-01-08', problema:'Não', fim:'2026-01-08'},
      testeFinal:      {inicio:'2026-01-08', problema:'Não', fim:'2026-01-08'},
      fechamentoFinal: {inicio:'',          problema:'Não', fim:''},
      burnIn:          {inicio:'2026-01-08', problema:'Não', fim:''}
    }
  },
  {
    id:'p004', produto:'SIM300', serie:'20251219001', cliente:'', cor:'Laranja',
    quantidade:1, dataPedido:'2026-01-01', prazo:'2026-01-21',
    statusVencimento:'Produzido', diasAtraso:0, statusSep:'Separado',
    dataSep:'2025-12-29', observacao:'ok', situacao:'VENDIDO',
    materialCorreto:'Sim', dataEntregaParcial:'', dataEntregaTotal:'2025-12-29',
    etapas:{
      conferencia:     {inicio:'',          problema:'Não', fim:''},
      montagemRevisao: {inicio:'2026-01-05', problema:'Não', fim:'2026-01-06'},
      testeInicial:    {inicio:'2026-01-07', problema:'Não', fim:'2026-01-07'},
      montagemMecanica:{inicio:'2026-01-14', problema:'Não', fim:'2026-01-14'},
      testeFinal:      {inicio:'2026-01-14', problema:'Não', fim:'2026-01-14'},
      fechamentoFinal: {inicio:'',          problema:'Não', fim:''},
      burnIn:          {inicio:'2026-01-15', problema:'Não', fim:''}
    }
  },
  {
    id:'p005', produto:'SMP100', serie:'20250312029', cliente:'', cor:'Laranja',
    quantidade:1, dataPedido:'2026-01-01', prazo:'2026-01-21',
    statusVencimento:'Produzido', diasAtraso:0, statusSep:'Separado',
    dataSep:'2026-01-09', observacao:'Faltando componentes placa de conectores',
    situacao:'VENDIDO', materialCorreto:'Sim',
    dataEntregaParcial:'2026-01-09', dataEntregaTotal:'2026-01-09',
    etapas:{
      conferencia:     {inicio:'',          problema:'Não',      fim:''},
      montagemRevisao: {inicio:'2026-01-08', problema:'Hardware', fim:'2026-01-13'},
      testeInicial:    {inicio:'2026-01-07', problema:'Não',      fim:'2026-01-07'},
      montagemMecanica:{inicio:'2026-01-13', problema:'Não',      fim:'2026-01-15'},
      testeFinal:      {inicio:'2026-01-14', problema:'Não',      fim:'2026-01-14'},
      fechamentoFinal: {inicio:'2026-01-14', problema:'Não',      fim:'2026-01-14'},
      burnIn:          {inicio:'2026-01-15', problema:'Não',      fim:''}
    }
  },
  {
    id:'p006', produto:'AQT110', serie:'20230630014', cliente:'', cor:'Laranja',
    quantidade:1, dataPedido:'2026-01-14', prazo:'2026-03-26',
    statusVencimento:'Produzido', diasAtraso:0, statusSep:'Separado',
    dataSep:'2026-01-13',
    observacao:'Falta o item CI Colibri iMX7D Toradex 512MB V1.1D.',
    situacao:'EMPRÉSTIMO', materialCorreto:'Sim',
    dataEntregaParcial:'', dataEntregaTotal:'',
    etapas:{
      conferencia:     {inicio:'',          problema:'Não', fim:''},
      montagemRevisao: {inicio:'2026-01-29', problema:'Não', fim:'2026-03-13'},
      testeInicial:    {inicio:'2026-03-13', problema:'Não', fim:'2026-03-16'},
      montagemMecanica:{inicio:'2026-03-18', problema:'Não', fim:'2026-03-19'},
      testeFinal:      {inicio:'2026-03-23', problema:'Não', fim:'2026-03-24'},
      fechamentoFinal: {inicio:'2026-03-24', problema:'Não', fim:'2026-03-24'},
      burnIn:          {inicio:'2026-03-25', problema:'Não', fim:''}
    }
  },
  {
    id:'p007', produto:'AVM100', serie:'20260115001', cliente:'', cor:'Laranja',
    quantidade:1, dataPedido:'2026-01-01', prazo:'2026-03-02',
    statusVencimento:'Produzido', diasAtraso:0, statusSep:'Separado',
    dataSep:'',
    observacao:'Falta o sensor de fluxo. Os gabinetes serão enviados para pintura na terça-feira, 13/01/2026.',
    situacao:'VENDIDO', materialCorreto:'Sim',
    dataEntregaParcial:'', dataEntregaTotal:'2026-02-11',
    etapas:{
      conferencia:     {inicio:'',          problema:'Não', fim:''},
      montagemRevisao: {inicio:'2026-01-27', problema:'Não', fim:'2026-02-20'},
      testeInicial:    {inicio:'2026-02-20', problema:'Não', fim:'2026-02-20'},
      montagemMecanica:{inicio:'2026-02-26', problema:'Não', fim:'2026-02-26'},
      testeFinal:      {inicio:'2026-02-26', problema:'Não', fim:'2026-02-26'},
      fechamentoFinal: {inicio:'2026-02-20', problema:'Não', fim:'2026-02-20'},
      burnIn:          {inicio:'2026-02-26', problema:'Não', fim:''}
    }
  }
];

const SEED_EXPEDICAO = [
  {id:'e001', equipamento:'ASE100',   serie:'20251016007', quantidade:1, cor:'Azul',    obs:'Locação', dataEntrega:'2026-01-07'},
  {id:'e002', equipamento:'ASE100',   serie:'20251016005', quantidade:1, cor:'Laranja', obs:'',        dataEntrega:'2026-01-08'},
  {id:'e003', equipamento:'ASE100',   serie:'20251016008', quantidade:1, cor:'Laranja', obs:'',        dataEntrega:'2026-01-08'},
  {id:'e004', equipamento:'AVM100',   serie:'20250411019', quantidade:1, cor:'Laranja', obs:'',        dataEntrega:'2026-01-09'},
  {id:'e005', equipamento:'SIM300',   serie:'20251219001', quantidade:1, cor:'Laranja', obs:'',        dataEntrega:'2026-01-15'},
  {id:'e006', equipamento:'SMP100',   serie:'20250312029', quantidade:1, cor:'Laranja', obs:'',        dataEntrega:'2026-01-15'},
  {id:'e007', equipamento:'AVM100',   serie:'20250411020', quantidade:1, cor:'Laranja', obs:'',        dataEntrega:'2026-01-16'},
  {id:'e008', equipamento:'IPA100',   serie:'20240913008', quantidade:1, cor:'Laranja', obs:'',        dataEntrega:'2026-01-22'},
  {id:'e009', equipamento:'MOX100',   serie:'20251022007', quantidade:1, cor:'Laranja', obs:'',        dataEntrega:'2026-01-26'},
  {id:'e010', equipamento:'MOX100',   serie:'20251022008', quantidade:1, cor:'Azul',    obs:'Locação', dataEntrega:'2026-01-26'},
  {id:'e011', equipamento:'Cabo MOX100', serie:'', quantidade:1, cor:'', obs:'', dataEntrega:'2026-01-21'},
  {id:'e012', equipamento:'Cabo ASE100 ponta de prova pino e garra', serie:'', quantidade:3, cor:'', obs:'', dataEntrega:'2026-01-21'}
];

// Kits iniciais (exemplos)
const KITS_ACESSORIOS = {
  'ASE100': ['Cabo de alimentação', 'Manual do usuário', 'Fonte externa'],
  'AVM100': ['Cabo USB', 'Parafusos adicionais', 'Manual do usuário'],
  'SIM300': ['Cabo de rede', 'Adaptador', 'Manual do usuário']
};

// ── STORE ────────────────────────────────────────────────────

const Store = {
  _key: 'controle_producao_v2',
  load() {
    try {
      const raw = localStorage.getItem(this._key);
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return null;
  },
  seedData() {
    const kits = Object.entries(KITS_ACESSORIOS).map(([produto, itens]) => ({
      id: 'kit-' + produto,
      produto,
      nome: 'Padrão',
      itens: itens.slice()
    }));
    return {
      pedidos:   SEED_PEDIDOS,
      expedicao: SEED_EXPEDICAO,
      produtos:  PRODUTOS.slice(),
      kits:      kits,
      logs:      [],
      criadoEm:  new Date().toISOString()
    };
  },
  async save(data) {
    if (typeof API !== 'undefined') {
      await API.saveData(data);
    } else {
      localStorage.setItem(this._key, JSON.stringify(data));
    }
  },
  async init() {
    let data = null;

    if (typeof API !== 'undefined') {
      data = await API.loadData();
    }

    if (!data) {
      data = this.load();
    }

    if (!data) {
      data = this.seedData();
      await this.save(data);
    }

    if (!data.logs) data.logs = [];
    if (!data.kits) data.kits = [];
    if (!Array.isArray(data.produtos) || !data.produtos.length) data.produtos = PRODUTOS.slice();
    if (!data.pedidos) data.pedidos = [];
    if (!data.expedicao) data.expedicao = [];
    return data;
  },
  initLocal() {
    let data = this.load();
    if (!data) {
      data = this.seedData();
      this.save(data);
    }
    if (!data.logs) data.logs = [];
    if (!Array.isArray(data.produtos) || !data.produtos.length) data.produtos = PRODUTOS.slice();
    return data;
  }
};

// ── UTILITÁRIOS ──────────────────────────────────────────────

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,6);
}

function fmtData(val) {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString('pt-BR');
  } catch(e) { return val; }
}

function corDot(cor) {
  if (!cor) return '';
  const cls = {
    'Laranja':'cor-laranja',
    'Azul':   'cor-azul',
  }[cor] || '';
  return `<span class="cor-dot ${cls}" title="${cor}"></span>`;
}

function badgeVencimento(status, dias) {
  if (!status) return '<span class="badge badge-default">—</span>';
  const s = status.toString().toUpperCase();
  if (s.includes('PRODUZIDO')) {
    const atraso = parseInt(dias) || 0;
    if (atraso > 0) return `<span class="badge badge-danger">⚠ ${atraso}d atraso</span>`;
    return `<span class="badge badge-success">✓ No prazo</span>`;
  }
  if (s.includes('ATRASO'))  return `<span class="badge badge-danger">ATRASADO</span>`;
  if (s.includes('PRÓXIMO') || s.includes('PROXIMO')) return `<span class="badge badge-warning">PRÓXIMO</span>`;
  if (s.includes('ADIADO'))  return `<span class="badge badge-default">ADIADO</span>`;
  return `<span class="badge badge-default">${status}</span>`;
}

function badgeSep(status) {
  if (!status) return '<span class="badge badge-default">—</span>';
  const mapa = {
    'Separado':          'badge-success',
    'Em Separação':      'badge-warning',
    'Faltando MP':       'badge-danger',
    'Separação Parcial': 'badge-warning'
  };
  return `<span class="badge ${mapa[status]||'badge-default'}">${status}</span>`;
}

function etapaAtual(pedido) {
  const ordem = [
    'burnIn','fechamentoFinal','testeFinal',
    'montagemMecanica','testeInicial','montagemRevisao','conferencia'
  ];
  for (const k of ordem) {
    if (pedido.etapas?.[k]?.inicio) return ET_NOMES[k] || k;
  }
  return '—';
}

function pedidoConcluido(pedido) {
  return ET_KEYS.every(k => {
    if (k === 'conferencia') {
      const c = pedido.etapas?.[k] || {};
      return !!(c.inicio || c.tipoConferencia || c.recebimentoParcial || c.recebimentoTotal);
    }
    return !!pedido.etapas?.[k]?.fim;
  });
}

function separacaoPermiteFinalizacao(status) {
  const normalized = String(status || '').trim().toLowerCase();
  return normalized === 'separado' || normalized.includes('parcial');
}

function statusConferenciaExpedicao(item) {
  if (item.aceiteEquipamento === 'Não' || item.aceiteAcessorios === 'Não' || item.estadoGeral === 'Reprovado') {
    return 'Recusado';
  }
  if (item.aceiteEquipamento === 'Sim' && item.aceiteAcessorios === 'Sim' && item.estadoGeral === 'Aprovado') {
    if (item.checklistCompleto) return 'Aceito';
    if (item.autorizadoAdmin) return 'Aprovado parcial';
  }
  return 'Pendente';
}

function escapar(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
// ── APLICATIVO PRINCIPAL ─────────────────────────────────────

const App = {
  data:              null,
  paginaAtual:       'dashboard',
  _toastTimer:       null,
  _pageContentCache: {},
  _editIdx:          null,
  _finalizarIdx:     null,
  _conferirExpIdx:   null,

  // ── INIT ──

  async init() {
    if (typeof Auth !== 'undefined' && !Auth.exigirLogin()) return;
    if (typeof Auth !== 'undefined') {
      await Auth.carregarUsuarios();
    }
    try {
      this.data = await Store.init();
    } catch (err) {
      console.warn('Erro ao carregar dados do servidor, usando cache local:', err);
      this.data = Store.initLocal();
    }
    
    // Iniciar sincronização com servidor (se disponível)
    if (typeof API !== 'undefined') {
      API.checkServer().then(serverOk => {
        if (serverOk) {
          API.startAutoSync(30000); // Sincronizar a cada 30s
          this.toast('✓ Conectado ao servidor de backup.', 'success');
        } else {
          this.toast('⚠ Operando com localStorage local.', 'warning');
        }
      });
    }
    // small helper to append audit logs
    this.log = (action, details = {}) => {
      try {
        const sess = typeof Auth !== 'undefined' ? Auth.getSessao() : null;
        const entry = {
          id: uid(),
          ts: new Date().toISOString(),
          user: sess?.nome || '—',
          perfil: sess?.perfil || '—',
          action: action || '—',
          details: details || {}
        };
        this.data.logs = this.data.logs || [];
        this.data.logs.unshift(entry);
        Store.save(this.data);
      } catch(e) { console.error('Erro ao gravar log', e); }
    };
    this._aplicarPermissoes();
    this._populateProdutos();
    this._setDataHoje();
    this.navigate('dashboard');
    this._atualizarFooter();
  },

  // ── PERMISSÕES ──

  _aplicarPermissoes() {
    if (typeof Auth === 'undefined') return;

    document.querySelectorAll('.nav-item').forEach(btn => {
      const pagina = btn.dataset.page;
      if (pagina && !Auth.podeAcessar(pagina)) {
        btn.style.display = 'none';
      }
    });

    const btnNovo = document.getElementById('btn-novo-item');
    if (btnNovo) {
      const podeCriar = Auth.pode('criarPedido') || Auth.pode('editarExpedicao');
      if (!podeCriar) btnNovo.style.display = 'none';
    }

    const btnExp = document.querySelector('.btn-secondary');
    if (btnExp && !Auth.pode('exportar')) {
      btnExp.style.display = 'none';
    }
  },

  // ── NAVEGAÇÃO ──

  async navigate(pagina, { force = false } = {}) {
    if (typeof Auth !== 'undefined' && !Auth.podeAcessar(pagina)) {
      this.toast('Sem permissão para acessar esta página.', 'error');
      return;
    }

    const container = document.getElementById('page-content-container');
    if (this.paginaAtual === pagina && container && container.innerHTML !== '' && !force) {
      this._updateNavState(pagina);
      return;
    }

    this.paginaAtual = pagina;
    this._updateNavState(pagina);

      try {
      await this._loadPage(pagina);
      switch (pagina) {
        case 'dashboard': this.renderDashboard(); break;
      case 'pedidos':
        this._populateProdutos();
        this.renderPedidos();
        break;
      case 'expedicao': this.renderExpedicao(); break;
      case 'concluidos': this.renderConcluidos(); break;
      case 'auditoria': this.renderAuditoria(); break;
      case 'usuarios':  await this.renderUsuarios();  break;
    }
      this._atualizarFooter();
    } catch(err) {
      console.error(`Erro ao carregar ${pagina}:`, err);
      this.toast(`Não foi possível carregar a página ${pagina}.`, 'error');
    }
  },

  _updateNavState(pagina) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`[data-page="${pagina}"]`)?.classList.add('active');

    const titulos = {
      dashboard:'Dashboard',
      pedidos:'Pedidos',
      expedicao:'Expedição',
      concluidos:'Concluídos',
      auditoria:'Auditoria',
      usuarios:'Usuários'
    };
    document.getElementById('page-title').textContent = titulos[pagina] || pagina;

    const btn = document.getElementById('btn-novo-item');
    if (btn) {
      const podeCriarPedido = typeof Auth === 'undefined' || Auth.pode('criarPedido');
      const podeCriarExp = typeof Auth === 'undefined' || Auth.pode('editarExpedicao');
      btn.textContent = pagina === 'expedicao' ? '+ Nova Expedição' : '+ Novo Pedido';
      btn.style.display =
        pagina === 'dashboard' ? 'none' :
        pagina === 'expedicao' && podeCriarExp ? '' :
        pagina === 'pedidos' && podeCriarPedido ? '' : 'none';
    }

    const btnExportar = document.querySelector('.topbar-right .btn-secondary');
    if (btnExportar) {
      const podeExportar = typeof Auth === 'undefined' || Auth.pode('exportar');
      btnExportar.style.display = pagina !== 'dashboard' && podeExportar ? '' : 'none';
    }

    if (window.innerWidth <= 900) {
      document.getElementById('sidebar').classList.remove('open');
    }
  },

  async _loadPage(pageName) {
    const container = document.getElementById('page-content-container');
    if (!container) throw new Error('Container não encontrado.');

    if (this._pageContentCache[pageName]) {
      container.innerHTML = this._pageContentCache[pageName];
      container.querySelector(`.page#page-${pageName}`)?.classList.add('active');
      return;
    }

    // ✅ app.html na raiz, pages/ contém as páginas
    const res = await fetch(`pages/${pageName}.html`);
    if (!res.ok) throw new Error(`HTTP ${res.status} ao carregar pages/${pageName}.html`);

    const html = await res.text();
    container.innerHTML = html;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    container.querySelector(`.page#page-${pageName}`)?.classList.add('active');
    this._pageContentCache[pageName] = html;
  },

  toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
  },

  // ── DASHBOARD (somente visualização) ──

  renderDashboard() {
    const {pedidos, expedicao} = this.data;
    const pedidosLista = pedidos || [];
    const expedicaoLista = expedicao || [];
    const emAtraso = pedidosLista.filter(p => (parseInt(p.diasAtraso)||0) > 0);
    const faltandoMp = pedidosLista.filter(p => String(p.statusSep || '').trim() === 'Faltando MP');
    const separacaoParcial = pedidosLista.filter(p => String(p.statusSep || '').toLowerCase().includes('parcial'));
    const prontosExpedicao = pedidosLista.filter(p => pedidoConcluido(p) && separacaoPermiteFinalizacao(p.statusSep));
    const aguardandoConferencia = expedicaoLista.filter(e => (e.statusConferencia || statusConferenciaExpedicao(e)) === 'Pendente');
    const conferidos = expedicaoLista.filter(e => ['Aceito', 'Recusado'].includes(e.statusConferencia || statusConferenciaExpedicao(e)));
    const aceitos = expedicaoLista.filter(e => (e.statusConferencia || statusConferenciaExpedicao(e)) === 'Aceito');
    const taxaAceite = conferidos.length ? Math.round((aceitos.length / conferidos.length) * 100) : 0;

    document.getElementById('kpi-producao').textContent   = pedidosLista.length;
    document.getElementById('kpi-atraso').textContent     = emAtraso.length;
    document.getElementById('kpi-faltando').textContent   = faltandoMp.length;
    document.getElementById('kpi-parcial').textContent    = separacaoParcial.length;
    document.getElementById('kpi-prontos').textContent    = prontosExpedicao.length;
    document.getElementById('kpi-expedicao').textContent  = aguardandoConferencia.length;
    document.getElementById('kpi-prontos-sub').textContent = 'aguardando envio';
    document.getElementById('kpi-expedicao-sub').textContent = `${taxaAceite}% aceitos`;

    const tbody = document.getElementById('tbody-recentes');
    tbody.innerHTML = pedidosLista.slice(0,8).map(p => `
      <tr style="cursor:default">
        <td><strong>${escapar(p.produto)}</strong></td>
        <td style="font-family:var(--font-mono);font-size:11px">${escapar(p.serie)||'—'}</td>
        <td style="font-family:var(--font-mono);font-size:11px">${fmtData(p.prazo)}</td>
        <td>${badgeVencimento(p.statusVencimento, p.diasAtraso)}</td>
        <td><span class="badge badge-accent">${escapar(etapaAtual(p))}</span></td>
      </tr>`).join('') ||
      `<tr><td colspan="5">
        <div class="empty-state"><span class="empty-icon">◈</span>Nenhum pedido</div>
      </td></tr>`;

    const contar = (lista, keyFn) => lista.reduce((acc, item) => {
      const key = keyFn(item) || '—';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const problemas = {};
    const adicionarProblema = (problema) => {
      problema = String(problema || '').trim();
      if (problema && !['Não', 'Nao', 'NaN'].includes(problema)) {
        problemas[problema] = (problemas[problema] || 0) + 1;
      }
    };

    pedidosLista.forEach(p => {
      Object.values(p.etapas || {}).forEach(etapa => {
        adicionarProblema(etapa?.problema);
      });
    });

    expedicaoLista.forEach(e => {
      this.problemasProducao(e).forEach(p => {
        adicionarProblema(p.problema);
      });
    });
    const renderBars = (id, entries, emptyText = 'Sem dados') => {
      const el = document.getElementById(id);
      if (!el) return;
      const data = entries.filter(([, qtd]) => qtd > 0).sort((a,b) => b[1] - a[1]).slice(0, 10);
      if (!data.length) {
        el.innerHTML = `<div class="empty-state">${emptyText}</div>`;
        return;
      }
      const max = data[0]?.[1] || 1;
      el.innerHTML = data.map(([nome, qtd]) => `
        <div class="bar-row">
          <span class="bar-label" title="${escapar(nome)}">
            ${escapar(nome.length > 12 ? nome.slice(0,12)+'…' : nome)}
          </span>
          <div class="bar-track">
            <div class="bar-fill" style="width:${Math.round(qtd/max*100)}%"></div>
          </div>
          <span class="bar-count">${qtd}</span>
        </div>`).join('');
    };

    renderBars('chart-equip', Object.entries(contar(pedidosLista, p => p.produto)), 'Sem pedidos');
    renderBars('chart-etapas', Object.entries(contar(pedidosLista, p => etapaAtual(p))), 'Sem etapas');
    renderBars('chart-almox', Object.entries(contar(pedidosLista, p => p.statusSep || 'Sem status')), 'Sem separações');
    renderBars('chart-problemas', Object.entries(problemas), 'Sem problemas registrados');
  },

  // ── PEDIDOS ──

  renderPedidos(lista) {
    lista = lista ?? this.data.pedidos;
    const tbody = document.getElementById('tbody-pedidos');
    if (!tbody) return;

    document.getElementById('count-pedidos').textContent =
      `${lista.length} pedido${lista.length !== 1 ? 's' : ''}`;

    const podeEditar = typeof Auth === 'undefined' ||
      Auth.pode('editarComercial') ||
      Auth.pode('editarAlmoxarifado') ||
      Auth.pode('editarProducao');

    const podeExcluir = typeof Auth === 'undefined' || Auth.pode('excluir');
    const podeFinalizar = typeof Auth === 'undefined' || Auth.pode('editarProducao');

    tbody.innerHTML = lista.length === 0
      ? `<tr><td colspan="11">
           <div class="empty-state">
             <span class="empty-icon">◧</span>Nenhum pedido encontrado
           </div>
         </td></tr>`
      : lista.map(p => `
        <tr>
          <td><strong>${escapar(p.produto)}</strong></td>
          <td style="font-family:var(--font-mono);font-size:11px">${escapar(p.serie)||'—'}</td>
          <td>${escapar(p.cliente)||'—'}</td>
          <td>${corDot(p.cor)} ${escapar(p.cor)||'—'}</td>
          <td style="text-align:center">${p.quantidade}</td>
          <td style="font-family:var(--font-mono);font-size:11px">${fmtData(p.dataPedido)}</td>
          <td style="font-family:var(--font-mono);font-size:11px">${fmtData(p.prazo)}</td>
          <td>${badgeVencimento(p.statusVencimento, p.diasAtraso)}</td>
          <td>${badgeSep(p.statusSep)}</td>
          <td><span class="badge badge-default">${escapar(etapaAtual(p))}</span></td>
          <td>
            <div class="actions-cell">
              ${podeEditar ? `
                <button class="btn-icon"
                  onclick="App.abrirEdicao('${escapar(p.id)}')"
                  title="Editar">✏</button>` : ''}
              <button class="btn-icon"
                onclick="App.verPedido('${escapar(p.id)}')"
                title="Ver detalhes">👁</button>
              ${podeFinalizar && pedidoConcluido(p) && separacaoPermiteFinalizacao(p.statusSep) ? `
                <button class="btn-icon success"
                  onclick="App.abrirFinalizacaoPedido('${escapar(p.id)}')"
                  title="Finalizar e enviar para Expedição">✓</button>` : ''}
              ${podeExcluir ? `
                <button class="btn-icon danger"
                  onclick="App.excluirPedido('${escapar(p.id)}')"
                  title="Excluir">✕</button>` : ''}
            </div>
          </td>
        </tr>`).join('');
  },

  filtrarPedidos() {
    const busca  = (document.getElementById('busca-pedido')?.value  || '').toLowerCase();
    const status =  document.getElementById('filtro-status')?.value  || '';
    const venc   =  document.getElementById('filtro-vencimento')?.value || '';

    const lista = this.data.pedidos.filter(p => {
      const texto = [p.produto, p.serie, p.cliente, p.numeroOP, p.observacao, p.observacaoAlmox].join(' ').toLowerCase();
      if (busca && !texto.includes(busca)) return false;
      if (status) {
        const match = p.statusSep === status
          || p.statusVencimento === status
          || (status === 'ATRASADO' && (parseInt(p.diasAtraso)||0) > 0);
        if (!match) return false;
      }
      if (venc) {
        if (venc === 'ATRASADO'  && (parseInt(p.diasAtraso)||0) <= 0) return false;
        if (venc === 'PRÓXIMO'   && !p.statusVencimento?.includes('PRÓXIMO')) return false;
        if (venc === 'Produzido' && p.statusVencimento !== 'Produzido') return false;
      }
      return true;
    });
    this.renderPedidos(lista);
  },

  // ── VER PEDIDO (somente leitura) ──

  verPedido(id) {
    const p = this.data.pedidos.find(x => x.id === id);
    if (!p) return;

    document.getElementById('ver-titulo').textContent =
      `${p.produto}${p.serie ? ' — ' + p.serie : ''}`;

    const etapasHtml = Object.entries(p.etapas || {}).map(([k, e]) => `
      <div class="etapa-card">
        <div class="etapa-nome">${ET_NOMES[k] || k}</div>
        <div class="etapa-row"><span>Início</span><span>${fmtData(e.inicio)}</span></div>
        ${k === 'conferencia' ? `
          <div class="etapa-row"><span>Entrega Almox.</span><span>${escapar(e.tipoConferencia)||'—'}</span></div>` : ''}
        <div class="etapa-row"><span>Fim</span><span>${fmtData(e.fim)}</span></div>
        ${e.problema && e.problema !== 'Não' && e.problema !== 'NaN'
          ? `<span class="etapa-problema">${escapar(e.problema)}</span>` : ''}
        ${e.problema && e.problema !== 'Não' && e.problema !== 'NaN' ? `
          <div class="etapa-row"><span>Saída</span><span>${fmtData(e.problemaSaida)}</span></div>
          <div class="etapa-row"><span>Retorno</span><span>${fmtData(e.problemaRetorno)}</span></div>
          ${e.problemaDescricao ? `<div class="etapa-obs">${escapar(e.problemaDescricao)}</div>` : ''}` : ''}
      </div>`).join('');

    document.getElementById('ver-body').innerHTML = `
      <div class="detail-section">
        <h3>Informações Gerais</h3>
        <div class="detail-grid">
          <div class="detail-item"><label>Produto</label>
            <span>${escapar(p.produto)}</span></div>
          <div class="detail-item"><label>N° Série</label>
            <span style="font-family:var(--font-mono)">${escapar(p.serie)||'—'}</span></div>
          <div class="detail-item"><label>Cliente</label>
            <span>${escapar(p.cliente)||'—'}</span></div>
          <div class="detail-item"><label>Cor</label>
            <span>${corDot(p.cor)} ${escapar(p.cor)||'—'}</span></div>
          <div class="detail-item"><label>Quantidade</label>
            <span>${p.quantidade}</span></div>
          <div class="detail-item"><label>Situação</label>
            <span>${escapar(p.situacao)||'—'}</span></div>
          <div class="detail-item"><label>Data Pedido</label>
            <span>${fmtData(p.dataPedido)}</span></div>
          <div class="detail-item"><label>Prazo</label>
            <span>${fmtData(p.prazo)}</span></div>
          <div class="detail-item"><label>Status Sep.</label>
            <span>${badgeSep(p.statusSep)}</span></div>
          <div class="detail-item"><label>Data Sep.</label>
            <span>${fmtData(p.dataSep)}</span></div>
          <div class="detail-item"><label>N° OP</label>
            <span>${escapar(p.numeroOP)||'—'}</span></div>
          <div class="detail-item"><label>Faltante</label>
            <span>${escapar(p.materialFaltante)||'—'}</span></div>
          <div class="detail-item"><label>Entrega Parcial</label>
            <span>${fmtData(p.dataEntregaParcial)}</span></div>
          <div class="detail-item"><label>Pedido de Peças</label>
            <span>${fmtData(p.dataPedidoPecas)}</span></div>
          <div class="detail-item"><label>Retorno Peças</label>
            <span>${fmtData(p.dataRetornoPecas)}</span></div>
          <div class="detail-item"><label>Entrega Total</label>
            <span>${fmtData(p.dataEntregaTotal)}</span></div>
        </div>
      </div>
      ${p.pecasPedidas ? `
        <div class="detail-section">
          <h3>Peças Pedidas</h3>
          <div class="obs-box">${escapar(p.pecasPedidas)}</div>
        </div>` : ''}
      ${p.observacaoAlmox ? `
        <div class="detail-section">
          <h3>Observação Almoxarifado</h3>
          <div class="obs-box">${escapar(p.observacaoAlmox)}</div>
        </div>` : ''}
      ${p.observacao ? `
        <div class="detail-section">
          <h3>Observação Comercial</h3>
          <div class="obs-box">${escapar(p.observacao)}</div>
        </div>` : ''}
      <div class="detail-section">
        <h3>Etapas de Produção</h3>
        <div class="etapas-grid">${etapasHtml}</div>
      </div>`;

    this.openModal('ver-pedido');
  },
  // ── EDITAR PEDIDO — 3 ABAS (Comercial / Almoxarifado / Produção) ──

  abrirEdicao(id) {
    const idx = this.data.pedidos.findIndex(p => p.id === id);
    if (idx < 0) return;
    this._editIdx = idx;
    const p = this.data.pedidos[idx];

    document.getElementById('edit-titulo').textContent =
      `Editar — ${p.produto}${p.serie ? ' / ' + p.serie : ''}`;

    this._populateProdutos();

    // ── COMERCIAL ──
    const sv = id => document.getElementById(id);
    sv('ed-produto').value    = p.produto    || '';
    sv('ed-cliente').value    = p.cliente    || '';
    sv('ed-cor').value        = p.cor        || '';
    sv('ed-quantidade').value = p.quantidade || 1;
    sv('ed-situacao').value   = p.situacao   || 'VENDIDO';
    sv('ed-datapedido').value = p.dataPedido || '';
    sv('ed-prazo').value      = p.prazo      || '';
    sv('ed-obs-comercial-edit').value = p.observacao || '';

    // ── ALMOXARIFADO ──
    sv('ed-serie').value      = p.serie              || '';
    sv('ed-op').value         = p.numeroOP           || '';
    sv('ed-statussep').value  = p.statusSep          || 'Em Separação';
    sv('ed-datsep').value     = p.dataSep            || '';
    sv('ed-matfaltante').value = p.materialFaltante   || '';
    sv('ed-entparcial').value = p.dataEntregaParcial || '';
    sv('ed-enttotal').value   = p.dataEntregaTotal   || '';
    sv('ed-datapedidopecas').value = p.dataPedidoPecas || '';
    sv('ed-dataretornopecas').value = p.dataRetornoPecas || '';
    sv('ed-pecaspedidas').value = p.pecasPedidas || '';
    sv('ed-obs-comercial').value = p.observacao      || '';
    sv('ed-obs-almox').value  = p.observacaoAlmox    || '';
    this.toggleCamposPecas();

    // ── PRODUÇÃO — monta etapas ──
    const form = document.getElementById('etapas-edit-form');
    if (form) {
      const podeProd = typeof Auth === 'undefined' || Auth.pode('editarProducao');
      const dis = podeProd ? '' : 'disabled';
      form.innerHTML = ET_KEYS.map(key => {
        const e = { ...etapaVazia(), ...(p.etapas?.[key] || {}) };
        const ops = key === 'conferencia'
          ? ['Não','Hardware','Mecânica','Componente']
              .map(o => `<option${e.problema === o ? ' selected' : ''}>${o}</option>`).join('')
          : ['Não','Hardware','Software','Mecânica','Componente']
              .map(o => `<option${e.problema === o ? ' selected' : ''}>${o}</option>`).join('');
        const titulo = key === 'conferencia'
          ? 'Conferência de peças recebidas do Almoxarifado'
          : ET_NOMES[key];
        const conferenciaInfo = key === 'conferencia' ? `
          <div class="etapa-help">
            Validar as peças que chegaram do Almoxarifado antes de iniciar a produção. Marque se a entrega recebida foi total ou parcial.
          </div>
          <div class="form-group form-group-full">
            <label>Entrega recebida do Almoxarifado *</label>
            <select class="input" id="ete-${key}-tipo" ${dis}>
              <option value="">Selecione...</option>
              <option${e.tipoConferencia === 'Total' ? ' selected' : ''}>Total</option>
              <option${e.tipoConferencia === 'Parcial' ? ' selected' : ''}>Parcial</option>
            </select>
          </div>
          <div class="form-group">
            <label>Data Recebimento Parcial</label>
            <input class="input" type="date" id="ete-${key}-recebimento-parcial" value="${e.recebimentoParcial||''}" ${dis}/>
          </div>
          <div class="form-group">
            <label>Data Recebimento Total</label>
            <input class="input" type="date" id="ete-${key}-recebimento-total" value="${e.recebimentoTotal||''}" ${dis}/>
          </div>
          <div class="form-group form-group-full etapa-problema-detalhe" data-etapa="${key}">
            <label>Componentes faltantes / Observação</label>
            <textarea class="textarea" id="ete-${key}-prob-desc" rows="3" ${dis}>${escapar(e.problemaDescricao)}</textarea>
          </div>` : '';
        const problemaDetalhe = key !== 'conferencia' ? `
          <div class="form-group etapa-problema-detalhe" data-etapa="${key}">
            <label>Data Saída</label>
            <input class="input" type="date"
              id="ete-${key}-prob-saida" value="${e.problemaSaida||''}" ${dis}/>
          </div>
          <div class="form-group etapa-problema-detalhe" data-etapa="${key}">
            <label>Data Retorno</label>
            <input class="input" type="date"
              id="ete-${key}-prob-retorno" value="${e.problemaRetorno||''}" ${dis}/>
          </div>
          <div class="form-group form-group-full etapa-problema-detalhe" data-etapa="${key}">
            <label>Qual foi o problema?</label>
            <textarea class="textarea" id="ete-${key}-prob-desc" rows="2" ${dis}>${escapar(e.problemaDescricao)}</textarea>
          </div>` : '';
        return `
          <div class="etapa-edit-block">
            <h4>${titulo}</h4>
            <div class="etapa-edit-row">
              ${key === 'conferencia' ? '' : `
              <div class="form-group">
                <label>Data Início</label>
                <input class="input" type="date"
                  id="ete-${key}-ini" value="${e.inicio||''}" ${dis}/>
              </div>
              <div class="form-group">
                <label>Problema?</label>
                <select class="input"
                  id="ete-${key}-prob"
                  onchange="App.toggleProblemaEtapa('${key}')" ${dis}>${ops}</select>
              </div>
              `}
              ${key === 'conferencia' ? '' : `
                <div class="form-group">
                  <label>Data Fim</label>
                  <input class="input" type="date"
                    id="ete-${key}-fim" value="${e.fim||''}" ${dis}/>
                </div>`}
              ${conferenciaInfo}
              ${key === 'conferencia' ? `
                <div class="form-group">
                  <label>Problema?</label>
                  <select class="input"
                    id="ete-${key}-prob"
                    onchange="App.toggleProblemaEtapa('${key}')" ${dis}>${ops}</select>
                </div>
              ` : ''}
              ${problemaDetalhe}
            </div>
          </div>`;
      }).join('');
      ET_KEYS.forEach(key => this.toggleProblemaEtapa(key));
    }

    // ── Controla abas conforme permissão ──
    const tabCom  = document.getElementById('tab-com');
    const tabAlm  = document.getElementById('tab-alm');
    const tabProd = document.getElementById('tab-prod');

    const podeCom  = typeof Auth === 'undefined' || Auth.pode('editarComercial');
    const podeAlm  = typeof Auth === 'undefined' || Auth.pode('editarAlmoxarifado');
    const podeProd = typeof Auth === 'undefined' || Auth.pode('editarProducao');

    if (tabCom)  tabCom.style.display  = podeCom  ? '' : 'none';
    if (tabAlm)  tabAlm.style.display  = podeAlm  ? '' : 'none';
    if (tabProd) tabProd.style.display = podeProd ? '' : 'none';

    // Abre na primeira aba disponível
    if      (podeCom)  this.editTab('comercial');
    else if (podeAlm)  this.editTab('almoxarifado');
    else if (podeProd) this.editTab('producao');

    this.openModal('editar-pedido');
  },

  editTab(nome) {
    document.querySelectorAll('.edit-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.edit-panel').forEach(p => {
      p.classList.remove('active');
      p.style.display = 'none';
    });

    const mapa = {
      'comercial':    { tab:'tab-com',  panel:'panel-comercial'    },
      'almoxarifado': { tab:'tab-alm',  panel:'panel-almoxarifado' },
      'producao':     { tab:'tab-prod', panel:'panel-producao'     }
    };

    const alvo = mapa[nome];
    if (!alvo) return;

    document.getElementById(alvo.tab)?.classList.add('active');
    const panel = document.getElementById(alvo.panel);
    if (panel) { panel.classList.add('active'); panel.style.display = 'block'; }
  },

  toggleCamposPecas() {
    const temEntregaParcial = !!document.getElementById('ed-entparcial')?.value;
    document.querySelectorAll('.pecas-parcial').forEach(el => {
      el.style.display = temEntregaParcial ? '' : 'none';
    });
  },

  toggleProblemaEtapa(key) {
    const temProblema = !['', 'Não', 'NaN'].includes(document.getElementById(`ete-${key}-prob`)?.value || '');
    document.querySelectorAll(`.etapa-problema-detalhe[data-etapa="${key}"]`).forEach(el => {
      el.style.display = temProblema ? '' : 'none';
    });
  },

  validarProducao() {
    const gv = id => document.getElementById(id)?.value || '';
    for (const key of ET_KEYS) {
      const nome = ET_NOMES[key] || key;
      const inicio = gv(`ete-${key}-ini`);
      const fim = gv(`ete-${key}-fim`);
      const problema = gv(`ete-${key}-prob`);

      if (fim && !inicio) {
        this.toast(`Informe a data de início em ${nome}.`, 'error');
        return false;
      }
      if (inicio && fim && fim < inicio) {
        this.toast(`A data fim não pode ser anterior ao início em ${nome}.`, 'error');
        return false;
      }
      if (key === 'conferencia' && (inicio || fim) && !gv(`ete-${key}-tipo`)) {
        this.toast('Na conferência, informe se a entrega do Almoxarifado foi total ou parcial.', 'error');
        return false;
      }
      if (key !== 'conferencia' && !['', 'Não', 'NaN'].includes(problema)) {
        const saida = gv(`ete-${key}-prob-saida`);
        const retorno = gv(`ete-${key}-prob-retorno`);
        const descricao = gv(`ete-${key}-prob-desc`).trim();
        if (!saida || !retorno || !descricao) {
          this.toast(`Preencha saída, retorno e explicação do problema em ${nome}.`, 'error');
          return false;
        }
        if (retorno < saida) {
          this.toast(`O retorno do problema não pode ser anterior à saída em ${nome}.`, 'error');
          return false;
        }
      }
    }
    return true;
  },

  salvarEdicao() {
    if (this._editIdx === null) return;
    const p  = this.data.pedidos[this._editIdx];
    const gv = id => document.getElementById(id)?.value || '';

    // Salva COMERCIAL (se tiver permissão)
    const podeCom = typeof Auth === 'undefined' || Auth.pode('editarComercial');
    if (podeCom) {
      p.produto    = gv('ed-produto');
      p.cliente    = gv('ed-cliente');
      p.cor        = gv('ed-cor');
      p.quantidade = parseInt(gv('ed-quantidade')) || 1;
      p.situacao   = gv('ed-situacao');
      p.dataPedido = gv('ed-datapedido');
      p.prazo      = gv('ed-prazo');
      p.observacao = gv('ed-obs-comercial-edit').trim();
    }

    // Salva ALMOXARIFADO (se tiver permissão)
    const podeAlm = typeof Auth === 'undefined' || Auth.pode('editarAlmoxarifado');
    if (podeAlm) {
      p.serie              = gv('ed-serie');
      p.numeroOP           = gv('ed-op').trim();
      p.statusSep          = gv('ed-statussep');
      p.dataSep            = gv('ed-datsep');
      p.materialFaltante   = gv('ed-matfaltante');
      p.dataEntregaParcial = gv('ed-entparcial');
      p.dataEntregaTotal   = gv('ed-enttotal');
      p.dataPedidoPecas    = p.dataEntregaParcial ? gv('ed-datapedidopecas') : '';
      p.dataRetornoPecas   = p.dataEntregaParcial ? gv('ed-dataretornopecas') : '';
      p.pecasPedidas       = p.dataEntregaParcial ? gv('ed-pecaspedidas').trim() : '';
      p.observacaoAlmox    = gv('ed-obs-almox').trim();
    }

    // Salva PRODUÇÃO (se tiver permissão)
    const podeProd = typeof Auth === 'undefined' || Auth.pode('editarProducao');
    if (podeProd) {
      if (!this.validarProducao()) return;
      if (!p.etapas) p.etapas = {};
      ET_KEYS.forEach(key => {
        p.etapas[key] = {
          inicio:   gv(`ete-${key}-ini`),
          problema: gv(`ete-${key}-prob`),
          fim:      gv(`ete-${key}-fim`),
          tipoConferencia: key === 'conferencia' ? gv(`ete-${key}-tipo`) : '',
          problemaSaida: key !== 'conferencia' ? gv(`ete-${key}-prob-saida`) : '',
          problemaDescricao: (key === 'conferencia')
            ? gv(`ete-${key}-prob-desc`).trim()
            : (!['', 'Não', 'NaN'].includes(gv(`ete-${key}-prob`)) ? gv(`ete-${key}-prob-desc`).trim() : ''),
          problemaRetorno: key !== 'conferencia' ? gv(`ete-${key}-prob-retorno`) : '',
          recebimentoParcial: key === 'conferencia' ? gv(`ete-${key}-recebimento-parcial`) : '',
          recebimentoTotal: key === 'conferencia' ? gv(`ete-${key}-recebimento-total`) : ''
        };
      });
    }

    Store.save(this.data);
    this.closeModal('editar-pedido');
    delete this._pageContentCache['pedidos'];
    delete this._pageContentCache['dashboard'];
    this.log('Editar Pedido', { pedidoId: p.id });
    this.navigate(this.paginaAtual, { force: true });
    this.toast('Pedido atualizado com sucesso!', 'success');
    this._editIdx = null;
  },

  // ── NOVO PEDIDO ──

  salvarPedido(ev) {
    ev.preventDefault();
    const gv   = id => document.getElementById(id)?.value || '';
    const prod = gv('np-produto');
    if (!prod) { this.toast('Selecione um produto!', 'error'); return; }

    const p = {
      id:               uid(),
      produto:          prod,
      serie:            gv('np-serie').trim(),
      cliente:          gv('np-cliente').trim(),
      cor:              gv('np-cor'),
      quantidade:       parseInt(gv('np-quantidade')) || 1,
      situacao:         gv('np-situacao'),
      dataPedido:       gv('np-data-pedido'),
      prazo:            gv('np-prazo'),
      observacao:       gv('np-observacao').trim(),
      observacaoAlmox:  '',
      statusVencimento: 'Em produção',
      diasAtraso:       0,
      statusSep:        'Em Separação',
      dataSep:          '',
      numeroOP:         '',
      materialCorreto:  '',
      materialFaltante: '',
      dataEntregaParcial: '',
      dataEntregaTotal:   '',
      dataPedidoPecas:    '',
      dataRetornoPecas:   '',
      pecasPedidas:       '',
      etapas: {
        conferencia:      etapaVazia(),
        montagemRevisao:  etapaVazia(),
        testeInicial:     etapaVazia(),
        montagemMecanica: etapaVazia(),
        testeFinal:       etapaVazia(),
        fechamentoFinal:  etapaVazia(),
        burnIn:           etapaVazia()
      }
    };

    this.data.pedidos.unshift(p);
    Store.save(this.data);
    this.log('Criar Pedido', { pedidoId: p.id });
    this.closeModal('novo-pedido');
    delete this._pageContentCache['pedidos'];
    delete this._pageContentCache['dashboard'];
    this.navigate(this.paginaAtual, { force: true });
    this._atualizarFooter();
    this.toast('Pedido criado com sucesso!', 'success');
    document.getElementById('form-novo-pedido').reset();
    this._setDataHoje();
  },

  excluirPedido(id) {
    if (!confirm('Deseja excluir este pedido?')) return;
    this.data.pedidos = this.data.pedidos.filter(p => p.id !== id);
    Store.save(this.data);
    this.log('Excluir Pedido', { pedidoId: id });
    delete this._pageContentCache['pedidos'];
    delete this._pageContentCache['dashboard'];
    this.navigate(this.paginaAtual, { force: true });
    this._atualizarFooter();
    this.toast('Pedido excluído.', 'success');
  },

  abrirFinalizacaoPedido(id) {
    const idx = this.data.pedidos.findIndex(p => p.id === id);
    if (idx < 0) return;
    const p = this.data.pedidos[idx];
    if (!pedidoConcluido(p)) {
      this.toast('Finalize todas as etapas de produção antes de enviar para Expedição.', 'error');
      return;
    }
    if (!separacaoPermiteFinalizacao(p.statusSep)) {
      this.toast('Separe total ou parcialmente antes de enviar para Expedição.', 'error');
      return;
    }
    this._finalizarIdx = idx;
    document.getElementById('fin-titulo').textContent =
      `Finalizar — ${p.produto}${p.serie ? ' / ' + p.serie : ''}`;
    document.getElementById('fin-equipamento').value = p.produto || '';
    document.getElementById('fin-serie').value = p.serie || '';
    document.getElementById('fin-data').value = new Date().toISOString().slice(0, 10);
    document.getElementById('fin-acessorios').value = '';
    // popula select de kits e checklist inicial
    this._finalizarProduto = p.produto || '';
    this._populateFinKits(this._finalizarProduto);
    document.getElementById('fin-kit').value = '';
    this.renderChecklistFinalizacao();
    document.getElementById('fin-obs').value = '';
    this.openModal('finalizar-pedido');
  },

  salvarFinalizacaoPedido(ev) {
    ev.preventDefault();
    if (this._finalizarIdx === null || this._finalizarIdx === undefined) return;
    const p = this.data.pedidos[this._finalizarIdx];
    if (!p || !pedidoConcluido(p)) {
      this.toast('Pedido ainda não está pronto para Expedição.', 'error');
      return;
    }

    if (!separacaoPermiteFinalizacao(p.statusSep)) {
      this.toast('Separe total ou parcialmente antes de enviar para Expedição.', 'error');
      return;
    }

    const nomesAcess = this.parseFinAcessorios();
    const acessorios = nomesAcess.map(nome => ({ nome, conferido: false }));
    if (!acessorios.length) {
      this.toast('Cadastre pelo menos um acessório enviado com o equipamento.', 'error');
      return;
    }

    const itemExpedicao = {
      id: uid(),
      origemPedidoId: p.id,
      equipamento: p.produto,
      serie: p.serie || '',
      quantidade: p.quantidade || 1,
      cor: p.cor || '',
      obs: (document.getElementById('fin-obs')?.value || '').trim(),
      dataEntrega: document.getElementById('fin-data')?.value || new Date().toISOString().slice(0, 10),
      acessorios,
      checklistCompleto: false,
      autorizadoAdmin: false,
      autorizadoPor: '',
      estadoGeral: '',
      aceiteEquipamento: '',
      aceiteAcessorios: '',
      observacaoConferencia: '',
      statusConferencia: 'Pendente',
      pedidoSnapshot: JSON.parse(JSON.stringify(p))
    };

    this.data.expedicao.unshift(itemExpedicao);
    this.data.pedidos.splice(this._finalizarIdx, 1);
    this.log('Finalizar Pedido', { pedidoId: p.id, expedicaoId: itemExpedicao.id });
    Store.save(this.data);
    this.closeModal('finalizar-pedido');
    delete this._pageContentCache['pedidos'];
    delete this._pageContentCache['dashboard'];
    delete this._pageContentCache['expedicao'];
    this._finalizarIdx = null;
    this.navigate('expedicao');
    this._atualizarFooter();
    this.toast('Pedido finalizado e enviado para Expedição.', 'success');
  },

  // ── EXPEDIÇÃO ──

  getConcluidos() {
    return (this.data.expedicao || []).filter(e => e.statusConferencia === 'Aceito');
  },

  problemasProducao(item) {
    const etapas = item?.pedidoSnapshot?.etapas || {};
    return Object.entries(etapas)
      .map(([key, etapa]) => {
        const problema = String(etapa?.problema || '').trim();
        const descricao = String(etapa?.problemaDescricao || '').trim();
        const temProblema = problema && !['Não', 'Nao', 'NaN'].includes(problema);
        if (!temProblema || !descricao) return null;

        return {
          etapa: ET_NOMES[key] || key,
          problema,
          descricao,
          saida: etapa?.problemaSaida || '',
          retorno: etapa?.problemaRetorno || ''
        };
      })
      .filter(Boolean);
  },

  resumoProblemasProducao(item) {
    const problemas = this.problemasProducao(item);
    if (!problemas.length) return '';

    return `
      <details class="production-history-summary">
        <summary>Histórico de Produção (${problemas.length})</summary>
        ${problemas.map(p => `
          <div class="production-history-item">
            <span>${escapar(p.etapa)}: ${escapar(p.problema)}</span>
            <small>${escapar(p.descricao)}</small>
            ${(p.saida || p.retorno) ? `
              <small>Saída: ${fmtData(p.saida)} · Retorno: ${fmtData(p.retorno)}</small>` : ''}
          </div>`).join('')}
      </details>`;
  },

  compactarHistoricoProducao() {
    document.querySelectorAll('.production-history-summary').forEach(box => {
      if (box.tagName.toLowerCase() === 'details') return;

      const title = box.querySelector('strong');
      const count = box.querySelectorAll('.production-history-item').length;
      const details = document.createElement('details');
      details.className = box.className;
      details.innerHTML = `
        <summary>${title?.textContent || 'Histórico de Produção'}${count ? ` (${count})` : ''}</summary>
        ${[...box.querySelectorAll('.production-history-item')].map(item => item.outerHTML).join('')}
      `;
      box.replaceWith(details);
    });
  },

  renderConcluidos(lista) {
    lista = lista ?? this.getConcluidos();
    const tbody = document.getElementById('tbody-concluidos');
    if (!tbody) return;

    document.getElementById('count-concluidos').textContent =
      `${lista.length} item${lista.length !== 1 ? 's' : ''}`;

    tbody.innerHTML = lista.length === 0
      ? `<tr><td colspan="9">
           <div class="empty-state">
             <span class="empty-icon">✔</span>Nenhum pedido concluído
           </div>
         </td></tr>`
      : lista.map(e => `
        <tr>
          <td><strong>${escapar(e.equipamento)}</strong></td>
          <td style="font-family:var(--font-mono);font-size:11px">${escapar(e.serie)||'—'}</td>
          <td style="text-align:center">${e.quantidade}</td>
          <td>${corDot(e.cor)} ${escapar(e.cor)||'—'}</td>
          <td>${this.resumoChecklistExpedicao(e)}</td>
          <td>${this.resumoConferenciaExpedicao(e)}</td>
          <td style="font-family:var(--font-mono);font-size:11px">${fmtData(e.dataConferencia)}</td>
          <td>
            ${e.obs ? `<div>${escapar(e.obs)}</div>` : '—'}
            ${this.resumoProblemasProducao(e)}
          </td>
          <td>
            <div class="actions-cell">
              <button class="btn-icon"
                onclick="App.abrirConferenciaExpedicao('${escapar(e.id)}')"
                title="Ver conferência">👁</button>
            </div>
          </td>
        </tr>`).join('');

    this.compactarHistoricoProducao();
  },

  renderAuditoria() {
    const lista = this.data.logs || [];
    const tbody = document.getElementById('tbody-auditoria');
    if (!tbody) return;
    document.getElementById('count-auditoria').textContent = `${lista.length} registro${lista.length!==1 ? 's' : ''}`;
    tbody.innerHTML = lista.length === 0 ? `<tr><td colspan="5"><div class="empty-state">Nenhum log</div></td></tr>`
      : lista.map(l => `
        <tr>
          <td style="font-family:var(--font-mono);font-size:11px">${fmtData(l.ts)}</td>
          <td>${escapar(l.user)}</td>
          <td>${escapar(l.perfil)}</td>
          <td>${escapar(l.action)}</td>
          <td style="font-family:var(--font-mono);font-size:11px">${escapar(JSON.stringify(l.details))}</td>
        </tr>`).join('');
  },

  async renderUsuarios() {
    const lista = typeof Auth === 'undefined' ? [] : await Auth.carregarUsuarios();
    const tbody = document.getElementById('tbody-usuarios');
    if (!tbody) return;
    document.getElementById('usuarios-empty').style.display = lista.length === 0 ? 'block' : 'none';
    tbody.innerHTML = lista.length === 0 ? '' : lista.map(u => `
      <tr>
        <td>${escapar(u.nome)}</td>
        <td>${escapar(u.login)}</td>
        <td>${escapar(u.perfil)}</td>
        <td>${escapar(Array.isArray(u.permissoes?.paginas) ? u.permissoes.paginas.join(', ') : (typeof u.permissoes?.paginas === 'string' ? u.permissoes.paginas : ''))}</td>
        <td>${escapar(Object.entries(u.permissoes || {})
            .filter(([k,v]) => k !== 'paginas' && v)
            .map(([k]) => k.replace(/editar/g,'Ed. ').replace(/criarPedido/,'Criar pedido').replace(/exportar/,'Exportar'))
            .join(', '))}</td>
        <td style="white-space:nowrap;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-secondary" onclick="App.editarUsuario('${escapar(u.id)}')">Editar</button>
          <button class="btn btn-secondary" onclick="App.excluirUsuario('${escapar(u.id)}')">Excluir</button>
        </td>
      </tr>`).join('');
  },

  abrirUsuarioModal() {
    document.getElementById('usuario-modal-titulo').textContent = 'Novo Usuário';
    document.getElementById('user-id').value = '';
    document.getElementById('user-nome').value = '';
    document.getElementById('user-login').value = '';
    document.getElementById('user-senha').value = '';
    document.getElementById('user-senha').required = true;
    document.getElementById('user-senha').placeholder = '';
    document.getElementById('user-perfil').value = 'expedicao';
    ['dashboard','pedidos','expedicao','concluidos','auditoria','usuarios'].forEach(page => {
      document.getElementById(`user-pg-${page}`).checked = false;
    });
    ['criarPedido','editarComercial','editarAlmoxarifado','editarProducao','editarExpedicao','exportar'].forEach(key => {
      document.getElementById(`user-can-${key}`).checked = false;
    });
    this.openModal('usuario');
  },

  editarUsuario(id) {
    const usuario = Auth.getUsuario(id);
    if (!usuario) return;
    document.getElementById('usuario-modal-titulo').textContent = 'Editar Usuário';
    document.getElementById('user-id').value = usuario.id;
    document.getElementById('user-nome').value = usuario.nome;
    document.getElementById('user-login').value = usuario.login;
    document.getElementById('user-senha').value = '';
    document.getElementById('user-senha').required = false;
    document.getElementById('user-senha').placeholder = 'Deixe em branco para manter';
    document.getElementById('user-perfil').value = usuario.perfil || 'expedicao';
    ['dashboard','pedidos','expedicao','concluidos','auditoria','usuarios'].forEach(page => {
      document.getElementById(`user-pg-${page}`).checked = (usuario.permissoes?.paginas||[]).includes(page);
    });
    ['criarPedido','editarComercial','editarAlmoxarifado','editarProducao','editarExpedicao','exportar'].forEach(key => {
      document.getElementById(`user-can-${key}`).checked = !!usuario.permissoes?.[key];
    });
    this.openModal('usuario');
  },

  async salvarUsuario(ev) {
    ev.preventDefault();
    const id = document.getElementById('user-id').value || null;
    const nome = document.getElementById('user-nome').value.trim();
    const login = document.getElementById('user-login').value.trim();
    const senha = document.getElementById('user-senha').value;
    const perfil = document.getElementById('user-perfil').value;
    if (!nome || !login || (!id && !senha)) {
      this.toast('Preencha nome, login e senha.', 'error');
      return;
    }
    const paginas = ['dashboard','pedidos','expedicao','concluidos','auditoria','usuarios']
      .filter(page => document.getElementById(`user-pg-${page}`).checked);
    const permissoes = {
      paginas,
      criarPedido:      document.getElementById('user-can-criarPedido').checked,
      editarComercial:  document.getElementById('user-can-editarComercial').checked,
      editarAlmoxarifado: document.getElementById('user-can-editarAlmoxarifado').checked,
      editarProducao:   document.getElementById('user-can-editarProducao').checked,
      editarExpedicao:  document.getElementById('user-can-editarExpedicao').checked,
      exportar:         document.getElementById('user-can-exportar').checked,
      excluir:          false
    };
    if (id) {
      const patch = { nome, login, perfil, permissoes };
      if (senha) patch.senha = senha;
      const atualizado = await Auth.atualizarUsuario(id, patch);
      if (!atualizado) {
        this.toast('NÃ£o foi possÃ­vel salvar no servidor.', 'error');
        return;
      }
      this.toast('Usuário atualizado.', 'success');
    } else {
      const novo = await Auth.criarUsuario({ nome, login, senha, perfil, permissoes });
      if (!novo) {
        this.toast('Não foi possível criar usuário. Login duplicado?', 'error');
        return;
      }
      this.toast('Usuário criado.', 'success');
    }
    this.closeModal('usuario');
    this.navigate('usuarios', { force: true });
  },

  async excluirUsuario(id) {
    if (!confirm('Deseja excluir este usuário?')) return;
    if (!await Auth.removerUsuario(id)) {
      this.toast('Usuário não encontrado.', 'error');
      return;
    }
    this.toast('Usuário excluído.', 'success');
    this.navigate('usuarios', { force: true });
  },

  filtrarConcluidos() {
    const busca = (document.getElementById('busca-concluidos')?.value || '').toLowerCase();
    const lista = this.getConcluidos().filter(e => {
      const texto = [
        e.equipamento, e.serie, e.obs, e.statusConferencia,
        e.estadoGeral, ...(e.acessorios || []).map(a => a.nome),
        ...this.problemasProducao(e).flatMap(p => [p.etapa, p.problema, p.descricao])
      ].join(' ').toLowerCase();
      return !busca || texto.includes(busca);
    });
    this.renderConcluidos(lista);
  },

  renderExpedicao(lista) {
    lista = lista ?? this.data.expedicao.filter(e => e.statusConferencia !== 'Aceito');
    const tbody = document.getElementById('tbody-expedicao');
    if (!tbody) return;

    document.getElementById('count-expedicao').textContent =
      `${lista.length} item${lista.length !== 1 ? 'ns' : ''}`;

    const podeExcluirExp = typeof Auth === 'undefined' ||
      Auth.pode('editarExpedicao') || Auth.pode('excluir');
    const podeConferirExp = typeof Auth === 'undefined' || Auth.pode('editarExpedicao');

    tbody.innerHTML = lista.length === 0
      ? `<tr><td colspan="9">
           <div class="empty-state">
             <span class="empty-icon">◱</span>Nenhum item de expedição
           </div>
         </td></tr>`
      : lista.map(e => `
        <tr>
          <td><strong>${escapar(e.equipamento)}</strong></td>
          <td style="font-family:var(--font-mono);font-size:11px">${escapar(e.serie)||'—'}</td>
          <td style="text-align:center">${e.quantidade}</td>
          <td>${corDot(e.cor)} ${escapar(e.cor)||'—'}</td>
          <td>${this.resumoChecklistExpedicao(e)}</td>
          <td>${this.resumoConferenciaExpedicao(e)}</td>
          <td>${escapar(e.obs)||'—'}</td>
          <td style="font-family:var(--font-mono);font-size:11px">${fmtData(e.dataEntrega)}</td>
          <td>
            <div class="actions-cell">
              ${podeConferirExp ? `
                <button class="btn-icon"
                  onclick="App.abrirConferenciaExpedicao('${escapar(e.id)}')"
                  title="Conferir equipamento e acessórios">☑</button>` : ''}
              ${podeExcluirExp ? `
                <button class="btn-icon danger"
                  onclick="App.excluirExpedicao('${escapar(e.id)}')"
                  title="Excluir">✕</button>` : '—'}
            </div>
          </td>
        </tr>`).join('');
  },

  filtrarExpedicao() {
    const busca = (document.getElementById('busca-expedicao')?.value || '').toLowerCase();
    const lista = this.data.expedicao.filter(e => {
      if (e.statusConferencia === 'Aceito') return false;
      const texto = [
        e.equipamento, e.serie, e.obs, e.statusConferencia,
        e.estadoGeral, ...(e.acessorios || []).map(a => a.nome)
      ].join(' ').toLowerCase();
      return !busca || texto.includes(busca);
    });
    this.renderExpedicao(lista);
  },

  parseAcessoriosExpedicao() {
    const texto = document.getElementById('ex-acessorios')?.value || '';
    return texto.split('\n').map(x => x.trim()).filter(Boolean);
  },

  // Parseia acessórios do modal de finalização (kit selecionado ou textarea)
  parseFinAcessorios() {
    const kitVal = document.getElementById('fin-kit')?.value || '';
    if (kitVal && kitVal.startsWith('kit:')) {
      const kitId = kitVal.slice(4);
      const kitObj = (this.data.kits || []).find(k => k.id === kitId);
      return kitObj ? (kitObj.itens || []).slice() : [];
    }
    const texto = document.getElementById('fin-acessorios')?.value || '';
    return texto.split('\n').map(x => x.trim()).filter(Boolean);
  },

  _populateFinKits(produto) {
    const sel = document.getElementById('fin-kit');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Personalizado —</option>';
    const kits = (this.data.kits || []).filter(k => !produto || k.produto === produto);
    kits.forEach(k => {
      const opt = document.createElement('option');
      opt.value = 'kit:' + k.id;
      opt.textContent = `Kit — ${k.produto} (${k.nome})`;
      sel.appendChild(opt);
    });
  },

  renderChecklistFinalizacao() {
    const box = document.getElementById('fin-checklist-acessorios');
    if (!box) return;
    const kitVal = document.getElementById('fin-kit')?.value || '';
    let itens = [];
    if (kitVal && kitVal.startsWith('kit:')) {
      const kitId = kitVal.slice(4);
      const kitObj = (this.data.kits || []).find(k => k.id === kitId);
      itens = kitObj ? (kitObj.itens || []) : [];
      document.getElementById('fin-acessorios').value = itens.join('\n');
    } else {
      itens = (document.getElementById('fin-acessorios')?.value || '').split('\n').map(x => x.trim()).filter(Boolean);
    }
    if (!itens.length) {
      box.innerHTML = 'Cadastre os acessórios ou selecione um kit para liberar a conferência.';
      return;
    }
    box.innerHTML = itens.map((nome, idx) => `
      <label class="checklist-item">
        <input type="checkbox" class="fin-acessorio-check" value="${idx}" />
        <span>${escapar(nome)}</span>
      </label>`).join('');
  },

  getProdutos() {
    const produtos = Array.isArray(this.data?.produtos) ? this.data.produtos : [];
    return [...new Set(produtos.map(p => String(p || '').trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  },

  openProdutosModal() {
    this.resetProdutoForm();
    this.renderProdutosList();
    this.openModal('produtos');
  },

  renderProdutosList() {
    const container = document.getElementById('produtos-list');
    if (!container) return;
    const produtos = this.getProdutos();
    if (!produtos.length) {
      container.innerHTML = '<div class="empty-state">Nenhum produto cadastrado.</div>';
      return;
    }
    container.innerHTML = `<table class="table"><thead><tr><th>Produto</th><th>Ações</th></tr></thead><tbody>${produtos.map(produto => `
      <tr>
        <td><strong>${escapar(produto)}</strong></td>
        <td>
          <div class="actions-cell">
            <button class="btn-icon" onclick="App.editarProduto('${escapar(produto)}')" title="Editar">✏</button>
            <button class="btn-icon danger" onclick="App.excluirProduto('${escapar(produto)}')" title="Excluir">✕</button>
          </div>
        </td>
      </tr>`).join('')}</tbody></table>`;
  },

  salvarProduto(ev) {
    ev.preventDefault();
    const nome = (document.getElementById('produto-nome')?.value || '').trim();
    const original = (document.getElementById('produto-original')?.value || '').trim();
    if (!nome) {
      this.toast('Informe o nome do produto.', 'error');
      return;
    }

    const produtos = this.getProdutos();
    const duplicado = produtos.some(p => p.toLowerCase() === nome.toLowerCase() && p !== original);
    if (duplicado) {
      this.toast('Este produto já está cadastrado.', 'error');
      return;
    }

    this.data.produtos = original
      ? produtos.map(p => p === original ? nome : p)
      : [...produtos, nome];
    this.data.produtos = this.getProdutos();

    Store.save(this.data);
    this.log(original ? 'Editar Produto' : 'Criar Produto', { produto: nome, original });
    this.resetProdutoForm();
    this.renderProdutosList();
    this._populateProdutos();
    this.toast('Produto salvo.', 'success');
  },

  editarProduto(produto) {
    document.getElementById('produto-original').value = produto;
    document.getElementById('produto-nome').value = produto;
    document.getElementById('produto-nome').focus();
  },

  excluirProduto(produto) {
    const emUso = (this.data.pedidos || []).some(p => p.produto === produto)
      || (this.data.expedicao || []).some(e => e.equipamento === produto)
      || (this.data.kits || []).some(k => k.produto === produto);
    if (emUso) {
      this.toast('Produto em uso em pedido, expedição ou kit. Não é possível excluir.', 'error');
      return;
    }
    if (!confirm(`Excluir o produto ${produto}?`)) return;
    this.data.produtos = this.getProdutos().filter(p => p !== produto);
    Store.save(this.data);
    this.log('Excluir Produto', { produto });
    this.renderProdutosList();
    this._populateProdutos();
    this.toast('Produto excluído.', 'success');
  },

  resetProdutoForm() {
    document.getElementById('produto-original').value = '';
    document.getElementById('produto-nome').value = '';
  },

  // ── KITS MANAGEMENT ──
  openKitsModal() {
    this._editingKitId = null;
    this.renderKitsList();
    document.getElementById('kit-produto').value = '';
    document.getElementById('kit-nome').value = '';
    document.getElementById('kit-itens').value = '';
    this.openModal('kits');
  },

  renderKitsList() {
    const container = document.getElementById('kits-list');
    if (!container) return;
    const kits = this.data.kits || [];
    if (!kits.length) {
      container.innerHTML = '<div class="empty-state">Nenhum kit cadastrado.</div>';
      return;
    }
    container.innerHTML = `<table class="table"><thead><tr><th>Equip.</th><th>Nome</th><th>Itens</th><th>Ações</th></tr></thead><tbody>${kits.map(k=>`
      <tr>
        <td>${escapar(k.produto)}</td>
        <td>${escapar(k.nome)}</td>
        <td style="font-family:var(--font-mono);font-size:11px">${escapar((k.itens||[]).join(', '))}</td>
        <td>
          <div class="actions-cell">
            <button class="btn-icon" onclick="App.editarKit('${k.id}')">✏</button>
            <button class="btn-icon danger" onclick="App.excluirKit('${k.id}')">✕</button>
          </div>
        </td>
      </tr>`).join('')}</tbody></table>`;
  },

  salvarKit(ev) {
    ev.preventDefault();
    const produto = (document.getElementById('kit-produto')?.value || '').trim();
    const nome = (document.getElementById('kit-nome')?.value || '').trim();
    const itens = (document.getElementById('kit-itens')?.value || '')
      .split('\n').map(x=>x.trim()).filter(Boolean);
    if (!produto || !nome || !itens.length) {
      this.toast('Preencha produto, nome e pelo menos um item.', 'error');
      return;
    }
    if (!this.data.kits) this.data.kits = [];
    if (this._editingKitId) {
      const idx = this.data.kits.findIndex(k=>k.id===this._editingKitId);
      if (idx >= 0) {
        this.data.kits[idx].produto = produto;
        this.data.kits[idx].nome = nome;
        this.data.kits[idx].itens = itens;
      }
      this._editingKitId = null;
    } else {
      const id = 'kit-' + uid();
      this.data.kits.push({ id, produto, nome, itens });
    }
    Store.save(this.data);
    this.log('Salvar Kit', { kitProduto: produto, kitId: this._editingKitId || null });
    this.renderKitsList();
    this._populateFinKits(this._finalizarProduto || '');
    this.toast('Kit salvo.', 'success');
    document.getElementById('form-kit').reset();
  },

  editarKit(id) {
    const kit = (this.data.kits||[]).find(k=>k.id===id);
    if (!kit) return;
    this._editingKitId = id;
    document.getElementById('kit-produto').value = kit.produto;
    document.getElementById('kit-nome').value = kit.nome;
    document.getElementById('kit-itens').value = (kit.itens||[]).join('\n');
  },

  excluirKit(id) {
    if (!confirm('Excluir este kit?')) return;
    this.data.kits = (this.data.kits||[]).filter(k=>k.id!==id);
    Store.save(this.data);
    this.log('Excluir Kit', { kitId: id });
    this.renderKitsList();
    this._populateFinKits(this._finalizarProduto || '');
    this.toast('Kit excluído.', 'success');
  },

  resetKitForm() {
    this._editingKitId = null;
    document.getElementById('form-kit')?.reset();
  },

  renderChecklistAcessorios() {
    const box = document.getElementById('ex-checklist-acessorios');
    if (!box) return;
    const itens = this.parseAcessoriosExpedicao();
    if (!itens.length) {
      box.innerHTML = 'Cadastre os acessórios para liberar a conferência.';
      return;
    }
    box.innerHTML = itens.map((nome, idx) => `
      <label class="checklist-item">
        <input type="checkbox" class="ex-acessorio-check" value="${idx}"/>
        <span>${escapar(nome)}</span>
      </label>`).join('');
  },

  resumoChecklistExpedicao(item) {
    const acessorios = item.acessorios || [];
    if (!acessorios.length) return '<span class="badge badge-default">Sem acessórios</span>';
    const conferidos = acessorios.filter(a => a.conferido).length;
    const completo = conferidos === acessorios.length;
    const badge = completo ? 'badge-success' : (item.autorizadoAdmin ? 'badge-warning' : 'badge-danger');
    const sufixo = completo ? 'Completo' : (item.autorizadoAdmin ? 'Autorizado admin' : 'Pendente');
    return `<span class="badge ${badge}">${conferidos}/${acessorios.length} ${sufixo}</span>`;
  },

  resumoConferenciaExpedicao(item) {
    const status = item.statusConferencia || statusConferenciaExpedicao(item);
    const mapa = {
      Aceito: 'badge-success',
      Recusado: 'badge-danger',
      Pendente: 'badge-warning',
      'Aprovado parcial': 'badge-warning'
    };
    return `<span class="badge ${mapa[status] || 'badge-default'}">${status}</span>`;
  },

  abrirConferenciaExpedicao(id) {
    const idx = this.data.expedicao.findIndex(e => e.id === id);
    if (idx < 0) return;
    const item = this.data.expedicao[idx];
    this._conferirExpIdx = idx;
    document.getElementById('conf-exp-titulo').textContent =
      `Conferir — ${item.equipamento}${item.serie ? ' / ' + item.serie : ''}`;
    document.getElementById('conf-exp-equipamento').value = item.equipamento || '';
    document.getElementById('conf-exp-serie').value = item.serie || '';
    document.getElementById('conf-exp-estado').value = item.estadoGeral || '';
    document.getElementById('conf-exp-aceite-equip').value = item.aceiteEquipamento || '';
    document.getElementById('conf-exp-aceite-acess').value = item.aceiteAcessorios || '';
    document.getElementById('conf-exp-obs').value = item.observacaoConferencia || '';

    const box = document.getElementById('conf-exp-checklist');
    const acessorios = item.acessorios || [];
    const perfil = typeof Auth === 'undefined' ? null : Auth.getPerfil();
    const canEditExp = !perfil || ['admin','expedicao'].includes(perfil);
    box.innerHTML = acessorios.length ? acessorios.map((a, idxAcessorio) => `
      <label class="checklist-item">
        <input type="checkbox" class="conf-exp-acessorio-check" value="${idxAcessorio}"
          ${a.conferido ? 'checked' : ''} ${canEditExp ? '' : 'disabled'}/>
        <span>${escapar(a.nome)}</span>
      </label>`).join('') : 'Nenhum acessório cadastrado para conferência.';

    document.getElementById('conf-exp-estado').disabled = !canEditExp;
    document.getElementById('conf-exp-aceite-equip').disabled = !canEditExp;
    document.getElementById('conf-exp-aceite-acess').disabled = !canEditExp;
    document.getElementById('conf-exp-obs').disabled = !canEditExp;
    document.getElementById('conf-exp-save-button').style.display = canEditExp ? '' : 'none';

    this._renderConferenciaKitInfo(item);
    this._renderConferenciaProducao(item);
    this.openModal('conferir-expedicao');
  },

  async _promptMasterAuthorization() {
    const login = prompt('Usuário master para autorizar aprovação com item faltando (login):');
    if (!login) return null;
    const senha = prompt('Senha do usuário master:');
    if (!senha) return null;
    const usuario = await Auth.validarCredenciais(login, senha);
    if (!usuario || usuario.perfil !== 'admin') {
      this.toast('Credenciais master inválidas.', 'error');
      return null;
    }
    return usuario;
  },

  async _promptExpedicaoDoubleCheck() {
    if (!confirm('Tem certeza que deseja autorizar este equipamento?')) return null;
    const login = prompt('Login do usuário de expedição ou admin:');
    if (!login) return null;
    const senha = prompt('Senha do usuário de expedição ou admin:');
    if (!senha) return null;
    const usuario = await Auth.validarCredenciais(login, senha);
    if (!usuario || !['expedicao', 'admin'].includes(usuario.perfil)) {
      this.toast('Credenciais de expedição/admin inválidas.', 'error');
      return null;
    }
    return usuario;
  },

  _renderConferenciaKitInfo(item) {
    const kitContainer = document.getElementById('conf-exp-kitinfo-container');
    const kitBox = document.getElementById('conf-exp-kitinfo');
    if (!kitContainer || !kitBox) return;
    const itens = (item.acessorios || []).map(a => escapar(a.nome));
    if (!itens.length) {
      kitContainer.style.display = 'none';
      kitBox.textContent = '';
      return;
    }
    kitContainer.style.display = '';
    kitBox.innerHTML = `<ul style="margin:0;padding-left:18px">${itens.map(i => `<li>${i}</li>`).join('')}</ul>`;
  },

  _renderConferenciaProducao(item) {
    const prodContainer = document.getElementById('conf-exp-producao-container');
    const prodBox = document.getElementById('conf-exp-producao');
    if (!prodContainer || !prodBox) return;
    const snapshot = item.pedidoSnapshot;
    if (!snapshot) {
      prodContainer.style.display = 'none';
      prodBox.textContent = '';
      return;
    }
    const etapas = Object.entries(snapshot.etapas || {}).map(([key, etapa]) => {
      return `<div style="margin-bottom:12px">
        <strong>${escapar(ET_NOMES[key] || key)}</strong><br/>
        Início: ${fmtData(etapa.inicio)}<br/>
        Fim: ${fmtData(etapa.fim)}<br/>
        Problema: ${escapar(etapa.problema)||'—'}
        ${etapa.problemaDescricao ? `<br/>Relato: ${escapar(etapa.problemaDescricao)}` : ''}
      </div>`;
    }).join('');
    prodContainer.style.display = '';
    prodBox.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div><strong>Produto</strong><br/>${escapar(snapshot.produto)}</div>
        <div><strong>Série</strong><br/>${escapar(snapshot.serie)||'—'}</div>
        <div><strong>Cliente</strong><br/>${escapar(snapshot.cliente)||'—'}</div>
        <div><strong>Cor</strong><br/>${escapar(snapshot.cor)||'—'}</div>
        <div><strong>Quantidade</strong><br/>${snapshot.quantidade || '—'}</div>
        <div><strong>Prazo</strong><br/>${fmtData(snapshot.prazo)}</div>
      </div>
      <div style="margin-top:14px">${etapas}</div>`;
  },

  async salvarConferenciaExpedicao(ev) {
    ev.preventDefault();
    if (this._conferirExpIdx === null || this._conferirExpIdx === undefined) return;
    const item = this.data.expedicao[this._conferirExpIdx];
    if (!item) return;
    const perfil = typeof Auth === 'undefined' ? null : Auth.getPerfil();
    const canEditExp = !perfil || ['admin','expedicao'].includes(perfil);
    if (!canEditExp) {
      this.toast('Sem permissão para editar esta conferência.', 'error');
      return;
    }

    const gv = id => document.getElementById(id)?.value || '';
    item.acessorios = (item.acessorios || []).map((a, idx) => ({
      ...a,
      conferido: !!document.querySelector(`.conf-exp-acessorio-check[value="${idx}"]`)?.checked
    }));
    item.checklistCompleto = item.acessorios.length === 0 || item.acessorios.every(a => a.conferido);
    item.estadoGeral = gv('conf-exp-estado');
    item.aceiteEquipamento = gv('conf-exp-aceite-equip');
    item.aceiteAcessorios = gv('conf-exp-aceite-acess');
    item.observacaoConferencia = gv('conf-exp-obs').trim();

    if (!item.estadoGeral || !item.aceiteEquipamento || !item.aceiteAcessorios) {
      this.toast('Informe estado geral, aceite do equipamento e aceite dos acessórios.', 'error');
      return;
    }

    if (!item.checklistCompleto && item.aceiteAcessorios === 'Sim') {
      const master = await this._promptMasterAuthorization();
      if (!master) return;
      item.autorizadoAdmin = true;
      item.autorizadoPor = master.nome;
      item.conferidoPor = master.nome;
    } else if (item.checklistCompleto && item.aceiteEquipamento === 'Sim' && item.aceiteAcessorios === 'Sim' && item.estadoGeral === 'Aprovado') {
      const expedicao = await this._promptExpedicaoDoubleCheck();
      if (!expedicao) return;
      item.autorizadoAdmin = expedicao.perfil === 'admin';
      item.autorizadoPor = expedicao.nome;
      item.conferidoPor = expedicao.nome;
    } else {
      item.autorizadoAdmin = false;
      item.autorizadoPor = '';
      item.conferidoPor = typeof Auth !== 'undefined' ? Auth.getNome() : '';
    }

    item.statusConferencia = statusConferenciaExpedicao(item);
    item.dataConferencia = new Date().toISOString();

    this.log('Salvar Conferência Expedição', { expedicaoId: item.id, status: item.statusConferencia });
    Store.save(this.data);
    this.closeModal('conferir-expedicao');
    delete this._pageContentCache['expedicao'];
    delete this._pageContentCache['concluidos'];
    const destino = item.statusConferencia === 'Aceito' ? 'concluidos' : 'expedicao';
    this.navigate(destino, { force: true });
    this.toast(`Conferência salva: ${item.statusConferencia}.`, item.statusConferencia === 'Recusado' ? 'error' : 'success');
    this._conferirExpIdx = null;
  },

  async salvarExpedicao(ev) {
    ev.preventDefault();
    const gv = id => document.getElementById(id)?.value || '';
    const eq = gv('ex-equipamento').trim();
    if (!eq) { this.toast('Informe o equipamento!', 'error'); return; }
    const nomesAcessorios = this.parseAcessoriosExpedicao();
    const checks = Array.from(document.querySelectorAll('.ex-acessorio-check:checked'))
      .map(el => parseInt(el.value));
    const acessorios = nomesAcessorios.map((nome, idx) => ({
      nome,
      conferido: checks.includes(idx)
    }));
    const checklistCompleto = acessorios.length === 0 || acessorios.every(a => a.conferido);
    const admin = !checklistCompleto ? await this._promptMasterAuthorization() : null;
    if (!checklistCompleto && !admin) return;

    const e = {
      id:          uid(),
      equipamento: eq,
      serie:       gv('ex-serie').trim(),
      quantidade:  parseInt(gv('ex-quantidade')) || 1,
      cor:         gv('ex-cor'),
      obs:         gv('ex-obs').trim(),
      dataEntrega: gv('ex-data'),
      acessorios,
      checklistCompleto,
      autorizadoAdmin: !checklistCompleto && !!admin,
      autorizadoPor: !checklistCompleto && admin ? admin.nome : '',
      estadoGeral: '',
      aceiteEquipamento: '',
      aceiteAcessorios: '',
      observacaoConferencia: '',
      statusConferencia: 'Pendente'
    };

    this.data.expedicao.unshift(e);
    this.log('Criar Expedição', { expedicaoId: e.id });
    Store.save(this.data);
    this.closeModal('nova-expedicao');
    delete this._pageContentCache['expedicao'];
    this.navigate('expedicao', { force: true });
    this._atualizarFooter();
    this.toast('Item de expedição registrado!', 'success');
    document.getElementById('form-expedicao').reset();
    this.renderChecklistAcessorios();
  },

  excluirExpedicao(id) {
    if (!confirm('Deseja excluir este item?')) return;
    this.data.expedicao = this.data.expedicao.filter(e => e.id !== id);
    Store.save(this.data);
    delete this._pageContentCache['expedicao'];
    this.navigate('expedicao', { force: true });
    this.toast('Item excluído.', 'success');
  },

  // ── EXPORTAR ──

  exportarDados() {
    const json = JSON.stringify(this.data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `controle-producao-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.toast('Exportação iniciada!', 'success');
  },

  // ── MODAIS ──

  openModal(nome) {
    const el = document.getElementById(`modal-${nome}`);
    if (el) el.classList.add('open');
    if (nome === 'nova-expedicao') this.renderChecklistAcessorios();
    if (nome === 'novo-pedido') this._populateProdutos();
  },

  closeModal(nome) {
    const el = document.getElementById(`modal-${nome}`);
    if (el) el.classList.remove('open');
  },

  // ── TOAST ──

  toast(msg, tipo = '') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = `toast ${tipo} show`;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { el.className = 'toast'; }, 2800);
  },

  // ── INTERNOS ──

  _populateProdutos() {
    const produtos = this.getProdutos();
    ['np-produto', 'ed-produto'].forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const atual = sel.value;
      sel.innerHTML = '<option value="">Selecione...</option>';
      produtos.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        sel.appendChild(opt);
      });
      if (atual) sel.value = atual;
    });

    const datalist = document.getElementById('produtos-datalist');
    if (datalist) {
      datalist.innerHTML = produtos.map(p => `<option value="${escapar(p)}"></option>`).join('');
    }
  },

  _setDataHoje() {
    const hoje = new Date().toISOString().slice(0, 10);
    const el   = document.getElementById('np-data-pedido');
    if (el) el.value = hoje;
  },

  _atualizarFooter() {
    if (typeof Auth !== 'undefined' && Auth.getSessao()) {
      document.getElementById('total-registros').textContent =
        Auth.getNome();
      document.getElementById('ultima-atualizacao').textContent =
        Auth.getPerfil()?.toUpperCase() || '—';
    } else {
      const tot = this.data.pedidos.length + this.data.expedicao.length;
      document.getElementById('total-registros').textContent =
        `${tot} registros`;
      document.getElementById('ultima-atualizacao').textContent =
        new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
    }
  }
};

// ── BOOT ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.init());
