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
    problemaRetorno: '',
    tecnico: ''
  };
}
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
      produtoEstruturas: [],
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
    if (!Array.isArray(data.produtoEstruturas)) data.produtoEstruturas = [];
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
    if (!Array.isArray(data.produtoEstruturas)) data.produtoEstruturas = [];
    if (!Array.isArray(data.produtos) || !data.produtos.length) data.produtos = PRODUTOS.slice();
    return data;
  }
};

// ── UTILITÁRIOS ──────────────────────────────────────────────

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,6);
}

function normalizarSerie(serie) {
  return String(serie || '').trim().replace(/\s+/g, ' ').toUpperCase();
}

function somarDiasData(dataBase, dias) {
  if (!dataBase && dataBase !== '') return '';
  const data = new Date(`${dataBase}T00:00:00`);
  if (isNaN(data.getTime())) return '';
  data.setDate(data.getDate() + dias);
  return dataLocalISO(data);
}

function dataLocalISO(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function parseDataLocal(val) {
  if (!val) return null;
  const texto = String(val);
  const isoCurto = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoCurto) {
    const [, ano, mes, dia] = isoCurto;
    return new Date(Number(ano), Number(mes) - 1, Number(dia));
  }
  const data = new Date(val);
  return isNaN(data.getTime()) ? null : data;
}

function fmtData(val) {
  if (!val) return '—';
  try {
    const d = parseDataLocal(val);
    if (!d) return val;
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

function etapaProducaoIniciada(etapa) {
  return !!(
    etapa?.inicio ||
    etapa?.recebimentoParcial ||
    etapa?.recebimentoTotal
  );
}

function producaoIniciada(pedido) {
  return ET_KEYS.some(key => etapaProducaoIniciada(pedido?.etapas?.[key]));
}

function diasAtrasoPedido(pedido) {
  const atrasoManual = parseInt(pedido?.diasAtraso) || 0;
  if (atrasoManual > 0) return atrasoManual;
  if (!pedido?.prazo || pedidoConcluido(pedido)) return 0;

  const prazo = new Date(`${pedido.prazo}T00:00:00`);
  if (isNaN(prazo.getTime())) return 0;

  const hoje = new Date();
  const hojeLocal = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const diff = Math.floor((hojeLocal - prazo) / 86400000);
  return diff > 0 ? diff : 0;
}

function badgeVencimento(status, dias, pedido = null) {
  const atraso = pedido ? diasAtrasoPedido(pedido) : (parseInt(dias) || 0);
  if (atraso > 0) return `<span class="badge badge-danger">⚠ ${atraso}d atraso</span>`;
  return '<span class="badge badge-success">No prazo</span>';
}

function badgeStatusProducao(pedido) {
  if (pedidoConcluido(pedido)) {
    return '<span class="badge badge-success">Produção concluída</span>';
  }

  const etapa = etapaAtual(pedido);
  return etapa !== '—'
    ? `<span class="badge badge-warning">${escapar(etapa)}</span>`
    : '<span class="badge badge-default">Aguardando produção</span>';
}

function badgeUrgencia(pedido) {
  return pedido?.urgente ? '<span class="badge badge-danger">Urgente</span>' : '';
}

function badgeSep(status) {
  if (!status) return '<span class="badge badge-default">—</span>';
  const statusLabel = status === 'Aguardando produção' ? 'Aguardando Separação' : status;
  const mapa = {
    'Separado':          'badge-success',
    'Aguardando Separação': 'badge-default',
    'Em Separação':      'badge-warning',
    'Faltando MP':       'badge-danger',
    'Separação Parcial': 'badge-warning'
  };
  return `<span class="badge ${mapa[statusLabel]||'badge-default'}">${statusLabel}</span>`;
}

function etapaAtual(pedido) {
  const ordem = [
    'burnIn','fechamentoFinal','testeFinal',
    'montagemMecanica','testeInicial','montagemRevisao','conferencia'
  ];
  for (const k of ordem) {
    if (etapaProducaoIniciada(pedido.etapas?.[k])) return ET_NOMES[k] || k;
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
    const emAtraso = pedidosLista.filter(p => diasAtrasoPedido(p) > 0);
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
        <td>${badgeVencimento(p.statusVencimento, p.diasAtraso, p)}</td>
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
    const podeOrdenar = this.podeOrdenarPedidos();

    tbody.innerHTML = lista.length === 0
      ? `<tr><td colspan="12">
           <div class="empty-state">
             <span class="empty-icon">◧</span>Nenhum pedido encontrado
           </div>
         </td></tr>`
      : lista.map(p => `
        <tr class="${[
            p.urgente ? 'row-urgente' : '',
            diasAtrasoPedido(p) > 0 ? 'row-atrasado' : ''
          ].filter(Boolean).join(' ')}"
          draggable="${podeOrdenar ? 'true' : 'false'}"
          ondragstart="App.iniciarArrastePedido(event, '${escapar(p.id)}')"
          ondragover="App.permitirSoltarPedido(event)"
          ondrop="App.soltarPedido(event, '${escapar(p.id)}')"
          ondragend="App.finalizarArrastePedido(event)">
          <td>
            <div class="priority-cell">
              ${podeOrdenar ? `
                <span class="drag-handle" title="Arrastar para ordenar">↕</span>
                <button class="btn-icon priority-btn" onclick="App.moverPedidoParaTopo('${escapar(p.id)}')" title="Enviar direto para o topo">⇈</button>
                <button class="btn-icon priority-btn" onclick="App.moverPedido('${escapar(p.id)}', -1)" title="Subir prioridade">↑</button>
                <button class="btn-icon priority-btn" onclick="App.moverPedido('${escapar(p.id)}', 1)" title="Descer prioridade">↓</button>
              ` : '<span class="badge badge-default">Admin</span>'}
            </div>
          </td>
          <td><strong>${escapar(p.produto)}</strong> ${badgeUrgencia(p)}</td>
          <td style="font-family:var(--font-mono);font-size:11px">${escapar(p.serie)||'—'}</td>
          <td class="col-hide-notebook">${escapar(p.cliente)||'—'}</td>
          <td class="col-hide-notebook">${corDot(p.cor)} ${escapar(p.cor)||'—'}</td>
          <td class="col-hide-notebook" style="text-align:center">${p.quantidade}</td>
          <td class="col-hide-notebook" style="font-family:var(--font-mono);font-size:11px">${fmtData(p.dataPedido)}</td>
          <td style="font-family:var(--font-mono);font-size:11px">${fmtData(p.prazo)}</td>
          <td>${badgeVencimento(p.statusVencimento, p.diasAtraso, p)}</td>
          <td>${badgeStatusProducao(p)}</td>
          <td>${badgeSep(p.statusSep)}</td>
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

  podeOrdenarPedidos() {
    return typeof Auth === 'undefined' || Auth.getPerfil() === 'admin';
  },

  normalizarOrdemPedidos() {
    (this.data.pedidos || []).forEach((pedido, indice) => {
      pedido.ordemFila = indice;
    });
  },

  async salvarOrdemPedidos() {
    this.normalizarOrdemPedidos();
    await Store.save(this.data);
    delete this._pageContentCache['pedidos'];
    delete this._pageContentCache['dashboard'];
    this.filtrarPedidos();
    this.toast('Prioridade dos pedidos atualizada.', 'success');
  },

  moverPedidoParaTopo(id) {
    if (!this.podeOrdenarPedidos()) {
      this.toast('Sem permissão para reorganizar pedidos.', 'error');
      return;
    }

    const pedidos = this.data.pedidos || [];
    const origem = pedidos.findIndex(p => p.id === id);
    if (origem <= 0) return;

    const [pedido] = pedidos.splice(origem, 1);
    pedidos.unshift(pedido);
    this.salvarOrdemPedidos();
  },

  moverPedido(id, direcao) {
    if (!this.podeOrdenarPedidos()) {
      this.toast('Sem permissão para reorganizar pedidos.', 'error');
      return;
    }

    const pedidos = this.data.pedidos || [];
    const origem = pedidos.findIndex(p => p.id === id);
    const destino = origem + direcao;
    if (origem < 0 || destino < 0 || destino >= pedidos.length) return;

    const [pedido] = pedidos.splice(origem, 1);
    pedidos.splice(destino, 0, pedido);
    this.salvarOrdemPedidos();
  },

  iniciarArrastePedido(ev, id) {
    if (!this.podeOrdenarPedidos()) {
      ev.preventDefault();
      return;
    }
    this._pedidoArrastadoId = id;
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData('text/plain', id);
    ev.currentTarget.classList.add('dragging');
  },

  permitirSoltarPedido(ev) {
    if (!this._pedidoArrastadoId) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
  },

  soltarPedido(ev, destinoId) {
    ev.preventDefault();
    const origemId = this._pedidoArrastadoId || ev.dataTransfer.getData('text/plain');
    if (!origemId || origemId === destinoId) return;

    const pedidos = this.data.pedidos || [];
    const origem = pedidos.findIndex(p => p.id === origemId);
    let destino = pedidos.findIndex(p => p.id === destinoId);
    if (origem < 0 || destino < 0) return;

    const rect = ev.currentTarget.getBoundingClientRect();
    const soltarDepois = ev.clientY > rect.top + rect.height / 2;
    const [pedido] = pedidos.splice(origem, 1);
    destino = pedidos.findIndex(p => p.id === destinoId);
    pedidos.splice(soltarDepois ? destino + 1 : destino, 0, pedido);
    this._pedidoArrastadoId = null;
    this.salvarOrdemPedidos();
  },

  finalizarArrastePedido(ev) {
    ev.currentTarget.classList.remove('dragging');
    this._pedidoArrastadoId = null;
  },

  filtrarPedidos() {
    const busca  = (document.getElementById('busca-pedido')?.value  || '').toLowerCase();
    const status =  document.getElementById('filtro-status')?.value  || '';
    const venc   =  document.getElementById('filtro-vencimento')?.value || '';

    const lista = this.data.pedidos.filter(p => {
      const texto = [p.produto, p.serie, p.cliente, p.numeroOP, p.observacao, p.observacaoAlmox].join(' ').toLowerCase();
      if (busca && !texto.includes(busca)) return false;
      if (status) {
        const statusSep = p.statusSep === 'Aguardando produção' ? 'Aguardando Separação' : p.statusSep;
        const match = statusSep === status
          || p.statusVencimento === status
          || (status === 'ATRASADO' && diasAtrasoPedido(p) > 0);
        if (!match) return false;
      }
      if (venc) {
        if (venc === 'ATRASADO'  && diasAtrasoPedido(p) <= 0) return false;
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
        ${e.tecnico ? `<div class="etapa-row"><span>Responsável</span><span>${escapar(e.tecnico)}</span></div>` : ''}
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
        <h3>Checklist de Componentes</h3>
        <div class="component-checklist-box">${this.renderChecklistComponentesPedido(p, 'leitura', true)}</div>
      </div>
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
    sv('ed-urgente').checked  = !!p.urgente;
    sv('ed-datapedido').value = p.dataPedido || '';
    sv('ed-prazo').value      = p.prazo      || '';
    sv('ed-obs-comercial-edit').value = p.observacao || '';

    // ── ALMOXARIFADO ──
    sv('ed-serie').value      = p.serie              || '';
    sv('ed-op').value         = p.numeroOP           || '';
    sv('ed-statussep').value  = p.statusSep === 'Aguardando produção'
      ? 'Aguardando Separação'
      : (p.statusSep || 'Aguardando Separação');
    sv('ed-datsep').value     = p.dataSep            || '';
    sv('ed-entparcial').value = p.dataEntregaParcial || '';
    sv('ed-enttotal').value   = p.dataEntregaTotal   || '';
    sv('ed-datapedidopecas').value = p.dataPedidoPecas || '';
    sv('ed-dataretornopecas').value = p.dataRetornoPecas || '';
    sv('ed-pecaspedidas').value = p.pecasPedidas || '';
    sv('ed-obs-comercial').value = p.observacao      || '';
    sv('ed-obs-almox').value  = p.observacaoAlmox    || '';
    this.toggleCamposPecas();
    this.garantirChecklistComponentesPedido(p);
    const almoxBox = document.getElementById('ed-componentes-almox');
    if (almoxBox) {
      const podeAlmChecklist = typeof Auth === 'undefined' || Auth.pode('editarAlmoxarifado');
      almoxBox.innerHTML = this.renderChecklistComponentesPedido(p, 'almoxarifado', !podeAlmChecklist);
    }
    const prodBox = document.getElementById('ed-componentes-producao');
    if (prodBox) {
      const podeProdChecklist = typeof Auth === 'undefined' || Auth.pode('editarProducao');
      prodBox.innerHTML = this.renderChecklistComponentesPedido(p, 'producao', !podeProdChecklist);
    }

    // ── PRODUÇÃO — monta etapas ──
    const form = document.getElementById('etapas-edit-form');
    if (form) {
      const podeProd = typeof Auth === 'undefined' || Auth.pode('editarProducao');
      const dis = podeProd ? '' : 'disabled';
      const tecnicoAtual = typeof Auth !== 'undefined' ? Auth.getNome() : '';
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
            <select class="input" id="ete-${key}-tipo" onchange="App.toggleDatasConferencia()" ${dis}>
              <option value="">Selecione...</option>
              <option${e.tipoConferencia === 'Total' ? ' selected' : ''}>Total</option>
              <option${e.tipoConferencia === 'Parcial' ? ' selected' : ''}>Parcial</option>
            </select>
          </div>
          <div class="form-group conferencia-data-parcial">
            <label>Data Recebimento Parcial</label>
            <input class="input" type="date" id="ete-${key}-recebimento-parcial" value="${e.recebimentoParcial||''}" ${dis}/>
          </div>
          <div class="form-group conferencia-data-total">
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
            <div class="form-group">
              <label>Responsável</label>
              <input class="input" type="text" value="${escapar(e.tecnico)}" disabled />
            </div>
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
      this.toggleDatasConferencia();
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

  toggleDatasConferencia() {
    const tipo = document.getElementById('ete-conferencia-tipo')?.value || '';
    document.querySelectorAll('.conferencia-data-parcial').forEach(el => {
      el.style.display = tipo === 'Parcial' ? '' : 'none';
    });
    document.querySelectorAll('.conferencia-data-total').forEach(el => {
      el.style.display = tipo === 'Total' ? '' : 'none';
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
      if (key === 'conferencia') {
        const tipo = gv(`ete-${key}-tipo`);
        const recebimentoParcial = gv(`ete-${key}-recebimento-parcial`);
        const recebimentoTotal = gv(`ete-${key}-recebimento-total`);
        if ((recebimentoParcial || recebimentoTotal) && !tipo) {
          this.toast('Na conferência, informe se a entrega do Almoxarifado foi total ou parcial.', 'error');
          return false;
        }
        if (tipo === 'Parcial' && !recebimentoParcial) {
          this.toast('Informe a data de recebimento parcial.', 'error');
          return false;
        }
        if (tipo === 'Total' && !recebimentoTotal) {
          this.toast('Informe a data de recebimento total.', 'error');
          return false;
        }
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

  serieJaCadastrada(serie, ignorarId = null) {
    const serieNormalizada = normalizarSerie(serie);
    if (!serieNormalizada) return false;

    return (this.data.pedidos || []).some(p =>
      p.id !== ignorarId && normalizarSerie(p.serie) === serieNormalizada
    );
  },

  salvarEdicao() {
    if (this._editIdx === null) return;
    const p  = this.data.pedidos[this._editIdx];
    const gv = id => document.getElementById(id)?.value || '';
    const produtoAnterior = p.produto;
    let produtoAlterado = false;

    // Salva COMERCIAL (se tiver permissão)
    const podeCom = typeof Auth === 'undefined' || Auth.pode('editarComercial');
    if (podeCom) {
      p.produto    = gv('ed-produto');
      p.cliente    = gv('ed-cliente');
      p.cor        = gv('ed-cor');
      p.quantidade = parseInt(gv('ed-quantidade')) || 1;
      p.situacao   = gv('ed-situacao');
      p.urgente    = !!document.getElementById('ed-urgente')?.checked;
      p.dataPedido = gv('ed-datapedido');
      p.prazo      = gv('ed-prazo');
      p.observacao = gv('ed-obs-comercial-edit').trim();
      produtoAlterado = produtoAnterior !== p.produto;
      if (produtoAlterado) {
        p.componentesChecklist = this.criarChecklistComponentes(p.produto);
      }
    }

    // Salva ALMOXARIFADO (se tiver permissão)
    const podeAlm = typeof Auth === 'undefined' || Auth.pode('editarAlmoxarifado');
    if (podeAlm) {
      const serieEditada = gv('ed-serie').trim();
      const serieFoiAlterada = normalizarSerie(serieEditada) !== normalizarSerie(p.serie);
      if (serieFoiAlterada && this.serieJaCadastrada(serieEditada, p.id)) {
        this.toast('Já existe um pedido cadastrado com este número de série.', 'error');
        return;
      }

      p.serie              = serieEditada;
      p.numeroOP           = gv('ed-op').trim();
      p.statusSep          = gv('ed-statussep');
      p.dataSep            = gv('ed-datsep');
      p.dataEntregaParcial = gv('ed-entparcial');
      p.dataEntregaTotal   = gv('ed-enttotal');
      p.dataPedidoPecas    = p.dataEntregaParcial ? gv('ed-datapedidopecas') : '';
      p.dataRetornoPecas   = p.dataEntregaParcial ? gv('ed-dataretornopecas') : '';
      p.pecasPedidas       = p.dataEntregaParcial ? gv('ed-pecaspedidas').trim() : '';
      p.observacaoAlmox    = gv('ed-obs-almox').trim();
      if (!produtoAlterado) this.salvarChecklistComponentesPedido(p, 'almoxarifado');
    }

    // Salva PRODUÇÃO (se tiver permissão)
    const podeProd = typeof Auth === 'undefined' || Auth.pode('editarProducao');
    if (podeProd) {
      if (!this.validarProducao()) return;
      if (!p.etapas) p.etapas = {};
      const tecnicoAtual = typeof Auth !== 'undefined' ? Auth.getNome() : '';
      ET_KEYS.forEach(key => {
        const atual = p.etapas[key] || {};
        const inicio = gv(`ete-${key}-ini`);
        const problema = gv(`ete-${key}-prob`);
        const fim = gv(`ete-${key}-fim`);
        const tipoConferencia = key === 'conferencia' ? gv(`ete-${key}-tipo`) : '';
        const problemaSaida = key !== 'conferencia' ? gv(`ete-${key}-prob-saida`) : '';
        const problemaRetorno = key !== 'conferencia' ? gv(`ete-${key}-prob-retorno`) : '';
        const problemaDescricao = (key === 'conferencia')
          ? gv(`ete-${key}-prob-desc`).trim()
          : (!['', 'Não', 'NaN'].includes(problema) ? gv(`ete-${key}-prob-desc`).trim() : '');
        const recebimentoParcial = key === 'conferencia' && tipoConferencia === 'Parcial' ? gv(`ete-${key}-recebimento-parcial`) : '';
        const recebimentoTotal = key === 'conferencia' && tipoConferencia === 'Total' ? gv(`ete-${key}-recebimento-total`) : '';
        const novoTecnico = atual.tecnico || (
          key === 'conferencia'
            ? ((recebimentoParcial || recebimentoTotal) && !atual.recebimentoParcial && !atual.recebimentoTotal ? tecnicoAtual : '')
            : (fim && !atual.fim ? tecnicoAtual : '')
        );
        p.etapas[key] = {
          inicio,
          problema,
          fim,
          tipoConferencia,
          problemaSaida,
          problemaDescricao,
          problemaRetorno,
          recebimentoParcial,
          recebimentoTotal,
          tecnico: novoTecnico
        };
      });
      if (!produtoAlterado) this.salvarChecklistComponentesPedido(p, 'producao');
    }

    Store.save(this.data);
    this.closeModal('editar-pedido');
    delete this._pageContentCache['pedidos'];
    delete this._pageContentCache['dashboard'];
    this.log('Editar Pedido', {
      pedidoId: p.id,
      produto: p.produto,
      serie: p.serie,
      cliente: p.cliente
    });
    this.navigate(this.paginaAtual, { force: true });
    this.toast('Pedido atualizado com sucesso!', 'success');
    this._editIdx = null;
  },

  // ── NOVO PEDIDO ──

  calcularPrazoPorDias() {
    const dataPedido = document.getElementById('np-data-pedido')?.value || '';
    const diasRaw = document.getElementById('np-prazo-dias')?.value || '';
    const prazoEl = document.getElementById('np-prazo');
    if (!prazoEl || !dataPedido || diasRaw === '') return;

    const dias = parseInt(diasRaw, 10);
    if (Number.isNaN(dias) || dias < 0) {
      prazoEl.value = '';
      return;
    }

    prazoEl.value = somarDiasData(dataPedido, dias);
  },

  salvarPedido(ev) {
    ev.preventDefault();
    const gv   = id => document.getElementById(id)?.value || '';
    const prod = gv('np-produto');
    if (!prod) { this.toast('Selecione um produto!', 'error'); return; }

    const quantidade = parseInt(gv('np-quantidade'), 10);
    if (!quantidade || quantidade < 1) {
      this.toast('Informe uma quantidade válida.', 'error');
      return;
    }

    const dataPedido = gv('np-data-pedido');
    if (!dataPedido) {
      this.toast('Informe a data do pedido.', 'error');
      return;
    }

    const prazo = gv('np-prazo');
    if (!prazo) {
      this.toast('Informe o prazo de produção.', 'error');
      return;
    }

    const serie = gv('np-serie').trim();
    if (this.serieJaCadastrada(serie)) {
      this.toast('Já existe um pedido cadastrado com este número de série.', 'error');
      return;
    }
    const urgente = !!document.getElementById('np-urgente')?.checked;
    const posicaoLista = gv('np-posicao-lista') === 'topo' ? 'topo' : 'final';
    const prazoDias = gv('np-prazo-dias') === '' ? '' : parseInt(gv('np-prazo-dias'), 10);
    if (prazoDias !== '' && (Number.isNaN(prazoDias) || prazoDias < 0)) {
      this.toast('Informe uma quantidade de dias de prazo válida.', 'error');
      return;
    }

    const p = {
      id:               uid(),
      produto:          prod,
      serie,
      cliente:          gv('np-cliente').trim(),
      cor:              gv('np-cor'),
      quantidade,
      situacao:         gv('np-situacao'),
      urgente,
      posicaoLista,
      dataPedido,
      prazoDias,
      prazo,
      observacao:       gv('np-observacao').trim(),
      observacaoAlmox:  '',
      statusVencimento: 'Aguardando produção',
      diasAtraso:       0,
      statusSep:        'Aguardando Separação',
      dataSep:          '',
      numeroOP:         '',
      materialCorreto:  '',
      dataEntregaParcial: '',
      dataEntregaTotal:   '',
      dataPedidoPecas:    '',
      dataRetornoPecas:   '',
      pecasPedidas:       '',
      componentesChecklist: this.criarChecklistComponentes(prod),
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

    if (posicaoLista === 'topo') this.data.pedidos.unshift(p);
    else this.data.pedidos.push(p);
    Store.save(this.data);
    this.log('Criar Pedido', {
      pedidoId: p.id,
      produto: p.produto,
      serie: p.serie,
      cliente: p.cliente
    });
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
    const pedido = this.data.pedidos.find(p => p.id === id);
    this.data.pedidos = this.data.pedidos.filter(p => p.id !== id);
    Store.save(this.data);
    this.log('Excluir Pedido', {
      pedidoId: id,
      produto: pedido?.produto || '',
      serie: pedido?.serie || '',
      cliente: pedido?.cliente || ''
    });
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
    document.getElementById('fin-data').value = dataLocalISO();
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
      dataEntrega: document.getElementById('fin-data')?.value || dataLocalISO(),
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
    this.log('Finalizar Pedido', {
      pedidoId: p.id,
      expedicaoId: itemExpedicao.id,
      produto: p.produto,
      equipamento: itemExpedicao.equipamento,
      serie: p.serie,
      cliente: p.cliente
    });
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

    const podeExcluir = typeof Auth === 'undefined' || Auth.pode('excluir');

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
              ${podeExcluir ? `
                <button class="btn-icon danger"
                  onclick="App.excluirConcluido('${escapar(e.id)}')"
                  title="Excluir">✕</button>` : ''}
            </div>
          </td>
        </tr>`).join('');

    this.compactarHistoricoProducao();
  },

  excluirConcluido(id) {
    if (!confirm('Deseja excluir este concluído?')) return;
    const item = (this.data.expedicao || []).find(e => e.id === id);
    this.data.expedicao = (this.data.expedicao || []).filter(e => e.id !== id);
    Store.save(this.data);
    this.log('Excluir Concluído', {
      expedicaoId: id,
      equipamento: item?.equipamento || '',
      serie: item?.serie || '',
      cliente: item?.pedidoSnapshot?.cliente || ''
    });
    delete this._pageContentCache['concluidos'];
    delete this._pageContentCache['expedicao'];
    delete this._pageContentCache['dashboard'];
    this.navigate('concluidos', { force: true });
    this._atualizarFooter();
    this.toast('Concluído excluído.', 'success');
  },

  buscarPedidoAuditoria(id) {
    if (!id) return null;
    const pedidos = this.data.pedidos || [];
    const expedicao = this.data.expedicao || [];

    return pedidos.find(p => p.id === id)
      || expedicao.find(e => e.origemPedidoId === id)?.pedidoSnapshot
      || expedicao.find(e => e.pedidoSnapshot?.id === id)?.pedidoSnapshot
      || null;
  },

  buscarExpedicaoAuditoria(id) {
    if (!id) return null;
    return (this.data.expedicao || []).find(e => e.id === id)
      || (this.data.expedicao || []).find(e => e.origemPedidoId === id)
      || null;
  },

  dadosEquipamentoAuditoria(item = {}) {
    const snapshot = item.pedidoSnapshot || {};
    return {
      produto: item.produto || item.equipamento || snapshot.produto || snapshot.equipamento || '',
      serie: item.serie || snapshot.serie || '',
      cliente: item.cliente || snapshot.cliente || ''
    };
  },

  resumoPedidoAuditoria(pedido, fallbackId = '') {
    if (!pedido) return fallbackId ? `pedido ID ${fallbackId}` : 'pedido';
    const dados = this.dadosEquipamentoAuditoria(pedido);
    const partes = [];
    if (dados.produto && dados.serie) partes.push(`produto ${dados.produto}, série ${dados.serie}`);
    else if (dados.produto) partes.push(`produto ${dados.produto}`);
    else if (dados.serie) partes.push(`série ${dados.serie}`);
    if (dados.cliente) partes.push(`cliente ${dados.cliente}`);
    return partes.length ? partes.join(' / ') : `pedido ID ${pedido.id || fallbackId}`;
  },

  resumoExpedicaoAuditoria(item, fallbackId = '') {
    if (!item) return fallbackId ? `expedição ID ${fallbackId}` : 'expedição';
    const dados = this.dadosEquipamentoAuditoria(item);
    const partes = [];
    if (dados.produto && dados.serie) partes.push(`produto ${dados.produto}, série ${dados.serie}`);
    else if (dados.produto) partes.push(`produto ${dados.produto}`);
    else if (dados.serie) partes.push(`série ${dados.serie}`);
    if (dados.cliente) partes.push(`cliente ${dados.cliente}`);
    return partes.length ? partes.join(' / ') : `expedição ID ${item.id || fallbackId}`;
  },

  detalheAuditoria(log) {
    const d = log.details || {};
    const expedicao = this.buscarExpedicaoAuditoria(d.expedicaoId)
      || (d.equipamento || d.serie || d.status ? d : null);
    const pedido = this.buscarPedidoAuditoria(d.pedidoId)
      || expedicao?.pedidoSnapshot
      || (d.produto || d.equipamento || d.serie || d.cliente ? d : null);
    const acao = String(log.action || '').toLowerCase();

    if (acao.includes('criar pedido')) {
      const posicao = d.posicaoLista === 'topo' ? ' no topo da lista' : (d.posicaoLista === 'final' ? ' no final da lista' : '');
      return `Cadastrou ${this.resumoPedidoAuditoria(pedido, d.pedidoId)}${posicao}.`;
    }
    if (acao.includes('editar pedido')) return `Editou ${this.resumoPedidoAuditoria(pedido, d.pedidoId)}.`;
    if (acao.includes('excluir pedido')) return `Excluiu ${this.resumoPedidoAuditoria(pedido, d.pedidoId)}.`;
    if (acao.includes('finalizar pedido')) return `Finalizou ${this.resumoPedidoAuditoria(pedido, d.pedidoId)} e enviou para ${this.resumoExpedicaoAuditoria(expedicao, d.expedicaoId)}.`;
    if (acao.includes('salvar conferência')) {
      const status = d.status ? ` Resultado: ${d.status}.` : '';
      return `Conferiu ${this.resumoExpedicaoAuditoria(expedicao, d.expedicaoId)}.${status}`;
    }
    if (acao.includes('criar expedição')) return `Criou ${this.resumoExpedicaoAuditoria(expedicao, d.expedicaoId)}.`;
    if (acao.includes('excluir concluído')) return `Excluiu o concluído de ${this.resumoExpedicaoAuditoria(expedicao, d.expedicaoId)}.`;
    if (acao.includes('criar produto')) return `Cadastrou o produto ${d.produto || 'sem nome informado'}.`;
    if (acao.includes('editar produto')) {
      return d.original && d.original !== d.produto
        ? `Renomeou o produto ${d.original} para ${d.produto}.`
        : `Editou o produto ${d.produto || 'sem nome informado'}.`;
    }
    if (acao.includes('excluir produto')) return `Excluiu o produto ${d.produto || 'sem nome informado'}.`;
    if (acao.includes('salvar kit')) return `Salvou o kit de acessórios do produto ${d.kitProduto || 'não identificado'}.`;
    if (acao.includes('excluir kit')) return `Excluiu o kit ID ${d.kitId || 'não identificado'}.`;

    const detalhes = Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(', ');
    return detalhes || 'Sem detalhes adicionais.';
  },

  renderAuditoria() {
    const filtro = (document.getElementById('busca-auditoria')?.value || '').toLowerCase();
    const lista = (this.data.logs || []).filter(log => {
      const detalhe = this.detalheAuditoria(log);
      const texto = [log.ts, log.user, log.perfil, log.action, detalhe].join(' ').toLowerCase();
      return !filtro || texto.includes(filtro);
    });
    const tbody = document.getElementById('tbody-auditoria');
    if (!tbody) return;
    document.getElementById('count-auditoria').textContent = `${lista.length} registro${lista.length!==1 ? 's' : ''}`;
    tbody.innerHTML = lista.length === 0 ? `<tr><td colspan="5"><div class="empty-state">Nenhum log</div></td></tr>`
      : lista.map(l => {
        const detalhe = this.detalheAuditoria(l);
        return `
        <tr>
          <td style="font-family:var(--font-mono);font-size:11px">${fmtData(l.ts)}</td>
          <td>${escapar(l.user)}</td>
          <td>${escapar(l.perfil)}</td>
          <td>${escapar(l.action)}</td>
          <td>${escapar(detalhe)}</td>
        </tr>`;
      }).join('');
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
                  title="Conferir equipamento e acessórios">☑</button>` : `
                <button class="btn-icon"
                  onclick="App.abrirConferenciaExpedicao('${escapar(e.id)}')"
                  title="Ver checklist e conferência">👁</button>`}
              ${podeExcluirExp ? `
                <button class="btn-icon danger"
                  onclick="App.excluirExpedicao('${escapar(e.id)}')"
                  title="Excluir">✕</button>` : ''}
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

  getProdutoFormAtual() {
    return (document.getElementById('produto-original')?.value || document.getElementById('produto-nome')?.value || '').trim();
  },

  getEstruturaProduto(produto) {
    if (!produto) return null;
    if (!Array.isArray(this.data.produtoEstruturas)) this.data.produtoEstruturas = [];
    return this.data.produtoEstruturas.find(e => String(e.produto || '').toLowerCase() === String(produto).toLowerCase()) || null;
  },

  getComponentesProduto(produto) {
    return (this.getEstruturaProduto(produto)?.itens || []).slice();
  },

  ordenarComponentesArvore(itens = []) {
    const lista = Array.isArray(itens) ? itens : [];
    const ids = new Set(lista.map(item => item.id).filter(Boolean));
    const filhosPorPai = lista.reduce((acc, item) => {
      const pai = item.parentId && ids.has(item.parentId) ? item.parentId : '';
      if (!acc[pai]) acc[pai] = [];
      acc[pai].push(item);
      return acc;
    }, {});
    const ordenados = [];
    const visitar = (parentId, nivel) => {
      (filhosPorPai[parentId] || []).forEach(item => {
        const nivelFinal = item.parentId ? nivel : (parseInt(item.nivel, 10) || nivel);
        ordenados.push({ ...item, nivel: nivelFinal });
        visitar(item.id, nivelFinal + 1);
      });
    };
    visitar('', 0);
    return ordenados;
  },

  setComponentesProduto(produto, itens) {
    if (!produto) return;
    if (!Array.isArray(this.data.produtoEstruturas)) this.data.produtoEstruturas = [];
    const idx = this.data.produtoEstruturas.findIndex(e => String(e.produto || '').toLowerCase() === String(produto).toLowerCase());
    const registro = { produto, itens: Array.isArray(itens) ? itens : [] };
    if (idx >= 0) this.data.produtoEstruturas[idx] = registro;
    else this.data.produtoEstruturas.push(registro);
  },

  criarChecklistComponentes(produto) {
    return this.ordenarComponentesArvore(this.getComponentesProduto(produto)).map(item => ({
      id: uid(),
      origemId: item.id || '',
      parentId: item.parentId || '',
      codigo: item.codigo || '',
      descricao: item.descricao || '',
      quantidade: item.quantidade || 1,
      unidade: item.unidade || 'UN',
      nivel: parseInt(item.nivel, 10) || 0,
      separado: false,
      conferido: false,
      observacao: ''
    }));
  },

  garantirChecklistComponentesPedido(pedido) {
    if (!pedido) return [];
    const estrutura = this.getComponentesProduto(pedido.produto);
    if (!Array.isArray(pedido.componentesChecklist) || (!pedido.componentesChecklist.length && estrutura.length)) {
      pedido.componentesChecklist = this.criarChecklistComponentes(pedido.produto);
    }
    return pedido.componentesChecklist;
  },

  renderProdutoComponentes(produto = this.getProdutoFormAtual()) {
    const info = document.getElementById('produto-componentes-info');
    const container = document.getElementById('produto-componentes-list');
    if (!container) return;
    if (!produto) {
      if (info) info.textContent = 'Informe ou selecione um produto para cadastrar os componentes.';
      container.innerHTML = '';
      this.renderProdutoComponenteParentSelect([]);
      return;
    }

    if (info) info.textContent = `Componentes cadastrados para ${produto}.`;
    const itens = this.getComponentesProduto(produto);
    const itensOrdenados = this.ordenarComponentesArvore(itens);
    this.renderProdutoComponenteParentSelect(itensOrdenados);
    if (!itens.length) {
      container.innerHTML = '<div class="empty-state">Nenhum componente cadastrado para este produto.</div>';
      return;
    }

    container.innerHTML = itensOrdenados.map(item => `
      <div class="component-tree-row">
        <small>${escapar(item.codigo) || '�'}</small>
        <div style="padding-left:${Math.min((parseInt(item.nivel, 10) || 0) * 18, 90)}px">
          ${parseInt(item.nivel, 10) > 0 ? '-> ' : ''}<strong>${escapar(item.descricao)}</strong>
        </div>
        <span>${escapar(item.quantidade)}</span>
        <small>${escapar(item.unidade || 'UN')}</small>
        <button type="button" class="btn-icon danger" onclick="App.removerComponenteProduto('${escapar(produto)}','${escapar(item.id)}')" title="Remover">x</button>
      </div>`).join('');
  },

  renderProdutoComponenteParentSelect(itens = []) {
    const select = document.getElementById('produto-comp-parent');
    if (!select) return;
    const atual = select.value;
    select.innerHTML = '<option value="">Produto principal</option>' + itens.map(item => {
      const nivel = parseInt(item.nivel, 10) || 0;
      const prefixo = nivel > 0 ? '� '.repeat(Math.min(nivel, 4)) : '';
      const label = `${prefixo}${item.codigo ? item.codigo + ' - ' : ''}${item.descricao}`;
      return `<option value="${escapar(item.id)}">${escapar(label)}</option>`;
    }).join('');
    if ([...select.options].some(opt => opt.value === atual)) select.value = atual;
  },

  extrairProdutoDaPlanilha(rows = []) {
    const linhaComponente = rows.find(row => String(row[0] || '').trim() === 'Componente:');
    const texto = linhaComponente ? String(rows[rows.indexOf(linhaComponente) + 1]?.[0] || '') : '';
    const matches = texto.match(/\b[A-Z]{2,}\d{2,}\b/g);
    return matches?.[matches.length - 1] || '';
  },

  lerLinhasExcelXml(texto) {
    const xml = new DOMParser().parseFromString(texto, 'text/xml');
    if (xml.querySelector('parsererror')) throw new Error('Arquivo XML invalido.');
    return [...xml.getElementsByTagNameNS('urn:schemas-microsoft-com:office:spreadsheet', 'Row')].map(row => {
      const valores = [];
      let col = 1;
      [...row.getElementsByTagNameNS('urn:schemas-microsoft-com:office:spreadsheet', 'Cell')].forEach(cell => {
        const idx = parseInt(cell.getAttributeNS('urn:schemas-microsoft-com:office:spreadsheet', 'Index') || '', 10);
        if (idx) {
          while (col < idx) { valores.push(''); col += 1; }
        }
        const data = cell.getElementsByTagNameNS('urn:schemas-microsoft-com:office:spreadsheet', 'Data')[0];
        valores.push((data?.textContent || '').trim());
        col += 1;
      });
      return valores;
    });
  },

  codigoItemPlanilha(row) {
    return String(row?.[2] || '').replace(/\./g, '').trim();
  },

  identificacaoItemPlanilha(row) {
    return String(row?.[5] || '').trim();
  },
  parseQuantidadeComponente(valor) {
    const texto = String(valor || '1').trim();
    const normalizado = texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto;
    const numero = parseFloat(normalizado);
    return Number.isNaN(numero) || numero <= 0 ? 1 : numero;
  },

  importarComponentesDaPlanilha(texto, produtoInformado = '') {
    const rows = this.lerLinhasExcelXml(texto);
    const produto = produtoInformado || this.extrairProdutoDaPlanilha(rows);
    const linhas = rows.filter(row => /^\d+(\.\d+)*$/.test(String(row[1] || '').trim()));
    const itens = [];
    const porNivel = new Map();
    const principaisPmt = new Set();

    linhas.forEach(row => {
      const nivel = String(row[1] || '').trim();
      const partes = nivel.split('.');
      if (partes.length !== 2) return;
      const codigo = this.codigoItemPlanilha(row);
      const descricao = String(row[7] || '').trim();
      if (!descricao) return;
      const item = {
        id: uid(),
        parentId: '',
        codigo,
        descricao,
        quantidade: this.parseQuantidadeComponente(row[13]),
        unidade: String(row[18] || row[15] || 'UN').trim() || 'UN',
        nivel: 0
      };
      itens.push(item);
      porNivel.set(nivel, item);
      if (this.identificacaoItemPlanilha(row).toUpperCase().startsWith('PMT')) principaisPmt.add(nivel);
    });

    linhas.forEach(row => {
      const nivel = String(row[1] || '').trim();
      const partes = nivel.split('.');
      if (partes.length !== 3) return;
      const nivelPai = `${partes[0]}.${partes[1]}`;
      const pai = porNivel.get(nivelPai);
      if (!pai || principaisPmt.has(nivelPai)) return;
      const codigo = this.codigoItemPlanilha(row);
      const descricao = String(row[7] || '').trim();
      if (!descricao) return;
      itens.push({
        id: uid(),
        parentId: pai.id,
        codigo,
        descricao,
        quantidade: this.parseQuantidadeComponente(row[13]),
        unidade: String(row[18] || row[15] || 'UN').trim() || 'UN',
        nivel: 1
      });
    });

    return { produto, itens: this.ordenarComponentesArvore(itens) };
  },

  async importarEstruturaProdutoArquivo(ev) {
    const input = ev.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const texto = await file.text();
      const produtoTela = this.getProdutoFormAtual();
      const { produto, itens } = this.importarComponentesDaPlanilha(texto, produtoTela);
      if (!produto) {
        this.toast('Informe o produto antes de importar a planilha.', 'error');
        return;
      }
      if (!itens.length) {
        this.toast('Nenhum componente compativel encontrado na planilha.', 'error');
        return;
      }
      const existentes = this.getComponentesProduto(produto).length;
      if (existentes && !confirm(`Substituir os ${existentes} componentes atuais de ${produto} pelos ${itens.length} itens importados?`)) return;

      if (!this.getProdutos().some(p => p.toLowerCase() === produto.toLowerCase())) {
        this.data.produtos = [...this.getProdutos(), produto];
      }
      document.getElementById('produto-original').value = produto;
      document.getElementById('produto-nome').value = produto;
      this.setComponentesProduto(produto, itens);
      Store.save(this.data);
      this.renderProdutosList();
      this.renderProdutoComponentes(produto);
      this._populateProdutos();
      this.toast(`${itens.length} componentes importados para ${produto}.`, 'success');
    } catch (err) {
      console.error(err);
      this.toast('Nao foi possivel importar esta planilha.', 'error');
    } finally {
      input.value = '';
    }
  },
  adicionarComponenteProduto() {
    const produto = this.getProdutoFormAtual();
    if (!produto) {
      this.toast('Informe o nome do produto antes de adicionar componentes.', 'error');
      return;
    }

    const codigo = (document.getElementById('produto-comp-codigo')?.value || '').trim();
    const descricao = (document.getElementById('produto-comp-desc')?.value || '').trim();
    const quantidadeRaw = document.getElementById('produto-comp-qtd')?.value || '1';
    const quantidade = parseFloat(String(quantidadeRaw).replace(',', '.'));
    const unidade = (document.getElementById('produto-comp-unidade')?.value || 'UN').trim();
    const parentId = document.getElementById('produto-comp-parent')?.value || '';

    if (!descricao || Number.isNaN(quantidade) || quantidade <= 0) {
      this.toast('Informe descrição e quantidade válida para o componente.', 'error');
      return;
    }

    const itens = this.getComponentesProduto(produto);
    const pai = parentId ? itens.find(item => item.id === parentId) : null;
    itens.push({
      id: uid(),
      parentId,
      codigo,
      descricao,
      quantidade,
      unidade,
      nivel: pai ? ((parseInt(pai.nivel, 10) || 0) + 1) : 0
    });
    this.setComponentesProduto(produto, itens);
    Store.save(this.data);
    this.renderProdutoComponentes(produto);
    ['produto-comp-codigo', 'produto-comp-desc'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const qtd = document.getElementById('produto-comp-qtd');
    if (qtd) qtd.value = '1';
    this.toast('Componente adicionado.', 'success');
  },

  removerComponenteProduto(produto, id) {
    const itensAtuais = this.getComponentesProduto(produto);
    const removerIds = new Set([id]);
    let mudou = true;
    while (mudou) {
      mudou = false;
      itensAtuais.forEach(item => {
        if (item.parentId && removerIds.has(item.parentId) && !removerIds.has(item.id)) {
          removerIds.add(item.id);
          mudou = true;
        }
      });
    }
    const itens = itensAtuais.filter(item => !removerIds.has(item.id));
    this.setComponentesProduto(produto, itens);
    Store.save(this.data);
    this.renderProdutoComponentes(produto);
  },

  renderChecklistComponentesPedido(pedido, modo = 'almoxarifado', disabled = false) {
    const itens = this.garantirChecklistComponentesPedido(pedido);
    if (!itens.length) {
      return '<div class="empty-state">Nenhuma estrutura cadastrada para este produto.</div>';
    }
    const dis = disabled ? 'disabled' : '';
    const filhosPorPai = itens.reduce((acc, item, idx) => {
      const pai = item.parentId || '';
      if (!acc[pai]) acc[pai] = [];
      acc[pai].push({ item, idx });
      return acc;
    }, {});
    const renderLinha = ({ item, idx }, isFilho = false) => {
      const conferido = modo === 'almoxarifado' ? '' : `
        <label><input type="checkbox" class="comp-conferido-check" data-modo="${modo}" data-idx="${idx}" ${item.conferido ? 'checked' : ''} ${dis} onchange="App.aplicarCheckPaiComponentes(this, 'conferido')"/> Conferido</label>`;
      return `
      <div class="component-check-row component-check-row-${modo} ${isFilho ? 'component-child-row' : 'component-parent-row'}" data-parent="${escapar(item.parentId || '')}">
        <small>${escapar(item.codigo) || '�'}</small>
        <div class="component-check-name" style="padding-left:${isFilho ? 18 : 0}px">
          ${isFilho ? '-> ' : ''}<strong>${escapar(item.descricao)}</strong>
        </div>
        <span>${escapar(item.quantidade)}</span>
        <small>${escapar(item.unidade || 'UN')}</small>
        <label><input type="checkbox" class="comp-separado-check" data-modo="${modo}" data-idx="${idx}" ${item.separado ? 'checked' : ''} ${modo === 'producao' ? 'disabled' : dis} onchange="App.aplicarCheckPaiComponentes(this, 'separado')"/> Separado</label>
        ${conferido}
      </div>`;
    };

    const grupos = (filhosPorPai[''] || []).map(grupo => {
      const listaFilhos = filhosPorPai[grupo.item.origemId || grupo.item.id] || [];
      const filhosHtml = listaFilhos.map(filho => renderLinha(filho, true)).join('');
      const botao = listaFilhos.length
        ? `<button type="button" class="component-toggle" onclick="App.toggleComponentesFilhos(this)">+</button>`
        : '<span class="component-toggle-placeholder"></span>';
      return `
        <div class="component-group">
          <div class="component-group-head">
            ${botao}
            <div class="component-group-main">${renderLinha(grupo, false)}</div>
          </div>
          <div class="component-children" style="display:none">${filhosHtml}</div>
        </div>`;
    }).join('');

    const toolbar = modo === 'almoxarifado' && !disabled
      ? `<div class="component-actions"><button type="button" class="btn btn-secondary" onclick="App.alternarTodosComponentesSeparados()">Marcar/desmarcar separados</button></div>`
      : '';
    return toolbar + grupos;
  },

  alternarTodosComponentesSeparados() {
    const checks = [...document.querySelectorAll('#ed-componentes-almox .comp-separado-check:not(:disabled)')];
    const marcar = checks.some(input => !input.checked);
    checks.forEach(input => { input.checked = marcar; });
  },

  aplicarCheckPaiComponentes(input, tipo) {
    const group = input.closest('.component-group');
    if (!group || !group.querySelector('.component-group-main')?.contains(input)) return;
    const selector = tipo === 'conferido' ? '.comp-conferido-check' : '.comp-separado-check';
    group.querySelectorAll(`.component-children ${selector}:not(:disabled)`).forEach(child => {
      child.checked = input.checked;
    });
  },
  toggleComponentesFilhos(btn) {
    const group = btn.closest('.component-group');
    const children = group?.querySelector('.component-children');
    if (!children) return;
    const aberto = children.style.display !== 'none';
    children.style.display = aberto ? 'none' : '';
    btn.textContent = aberto ? '+' : '-';
  },

  salvarChecklistComponentesPedido(pedido, modo) {
    if (!pedido || !Array.isArray(pedido.componentesChecklist)) return;
    pedido.componentesChecklist.forEach((item, idx) => {
      if (modo === 'almoxarifado') {
        item.separado = !!document.querySelector(`.comp-separado-check[data-modo="almoxarifado"][data-idx="${idx}"]`)?.checked;
      }
      if (modo === 'producao') {
        item.conferido = !!document.querySelector(`.comp-conferido-check[data-modo="producao"][data-idx="${idx}"]`)?.checked;
      }
    });
  },

  getProdutos() {
    const produtos = Array.isArray(this.data?.produtos) ? this.data.produtos : [];
    return [...new Set(produtos.map(p => String(p || '').trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  },

  openProdutosModal() {
    this.resetProdutoForm();
    this.renderProdutosList();
    this.renderProdutoComponentes();
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
    if (original && original !== nome) {
      const estrutura = this.getEstruturaProduto(original);
      if (estrutura) estrutura.produto = nome;
    }

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
    this.renderProdutoComponentes(produto);
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
    this.data.produtoEstruturas = (this.data.produtoEstruturas || []).filter(e => e.produto !== produto);
    Store.save(this.data);
    this.log('Excluir Produto', { produto });
    this.renderProdutosList();
    this._populateProdutos();
    this.toast('Produto excluído.', 'success');
  },

  resetProdutoForm() {
    document.getElementById('produto-original').value = '';
    document.getElementById('produto-nome').value = '';
    ['produto-comp-codigo', 'produto-comp-desc'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const qtd = document.getElementById('produto-comp-qtd');
    if (qtd) qtd.value = '1';
    const unidade = document.getElementById('produto-comp-unidade');
    if (unidade) unidade.value = 'UN';
    const parent = document.getElementById('produto-comp-parent');
    if (parent) parent.value = '';
    this.renderProdutoComponentes();
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
    const canEditExp = typeof Auth === 'undefined' || Auth.pode('editarExpedicao');
    document.getElementById('conf-exp-titulo').textContent =
      `${canEditExp ? 'Conferir' : 'Visualizar'} — ${item.equipamento}${item.serie ? ' / ' + item.serie : ''}`;
    document.getElementById('conf-exp-equipamento').value = item.equipamento || '';
    document.getElementById('conf-exp-serie').value = item.serie || '';
    document.getElementById('conf-exp-estado').value = item.estadoGeral || '';
    document.getElementById('conf-exp-aceite-equip').value = item.aceiteEquipamento || '';
    document.getElementById('conf-exp-aceite-acess').value = item.aceiteAcessorios || '';
    document.getElementById('conf-exp-obs').value = item.observacaoConferencia || '';

    const box = document.getElementById('conf-exp-checklist');
    const acessorios = item.acessorios || [];
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
    const canEditExp = typeof Auth === 'undefined' || Auth.pode('editarExpedicao');
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

    this.log('Salvar Conferência Expedição', {
      expedicaoId: item.id,
      equipamento: item.equipamento,
      serie: item.serie,
      cliente: item.pedidoSnapshot?.cliente || '',
      status: item.statusConferencia
    });
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
    this.log('Criar Expedição', {
      expedicaoId: e.id,
      equipamento: e.equipamento,
      serie: e.serie
    });
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
    a.download = `controle-producao-${dataLocalISO()}.json`;
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
    const hoje = dataLocalISO();
    const el   = document.getElementById('np-data-pedido');
    if (el) el.value = hoje;
    this.calcularPrazoPorDias();
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
