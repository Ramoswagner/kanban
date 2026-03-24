/**
 * store.js — Gerenciamento de estado
 * ─────────────────────────────────────
 * Estado central da aplicação com persistência em localStorage
 * e suporte a undo (histórico de estados).
 *
 * API pública:
 *   Store.init()           → carrega dados salvos ou defaults
 *   Store.getState()       → retorna estado atual (readonly)
 *   Store.subscribe(fn)    → escuta mudanças de estado
 *   Store.undo()           → desfaz última alteração
 *
 *   Store.addCard(data)
 *   Store.updateCard(id, data)
 *   Store.deleteCard(id)
 *   Store.moveCard(id, colId, order)
 *
 *   Store.addColumn(data)
 *   Store.updateColumn(id, data)
 *   Store.deleteColumn(id)
 *
 *   Store.importData(data, mode)  mode: 'replace' | 'merge'
 *   Store.updateMeta(data)
 */

const Store = (() => {

  /* ─── Estado privado ─── */
  let _state = { meta: {}, columns: [], cards: [] };
  let _listeners = [];
  let _history = [];   // pilha de strings JSON
  let _saveTimer = null;
  let _dirty = false;

  /* ─── Inicialização ─── */
  function init() {
    const raw = localStorage.getItem(CONFIG.app.storageKey);
    if (raw) {
      try { _state = JSON.parse(raw); }
      catch { _state = _buildDefault(); }
    } else {
      _state = _buildDefault();
    }
    return _state;
  }

  function _buildDefault() {
    return {
      meta: {
        title: 'Meu Projeto',
        description: '',
        createdAt: _now(),
        updatedAt: _now(),
      },
      columns: CONFIG.defaultColumns.map(c => ({ ...c })),
      cards: _sampleCards(),
    };
  }

  function _sampleCards() {
    return [
      { id:'c1', columnId:'backlog',  title:'Mapear fluxo de atendimento',      description:'Levantar as etapas atuais e identificar gargalos.', priority:'high',   assignee:'Ana Lima',    dueDate:'', tags:['processo','mapeamento'], order:0, createdAt:_now(), updatedAt:_now() },
      { id:'c2', columnId:'backlog',  title:'Definir KPIs do projeto',           description:'',                                                  priority:'medium', assignee:'',            dueDate:'', tags:['indicadores'],            order:1, createdAt:_now(), updatedAt:_now() },
      { id:'c3', columnId:'todo',     title:'Agendar reunião de kickoff',        description:'Confirmar presença de todos os stakeholders.',       priority:'high',   assignee:'Wagner',      dueDate:'', tags:['reunião'],                order:0, createdAt:_now(), updatedAt:_now() },
      { id:'c4', columnId:'todo',     title:'Criar template de ata',             description:'',                                                  priority:'low',    assignee:'',            dueDate:'', tags:['documentação'],           order:1, createdAt:_now(), updatedAt:_now() },
      { id:'c5', columnId:'doing',    title:'Análise de stakeholders',           description:'Mapear interesse e influência de cada parte.',       priority:'critical',assignee:'Wagner',     dueDate:'', tags:['estratégia'],             order:0, createdAt:_now(), updatedAt:_now() },
      { id:'c6', columnId:'review',   title:'Proposta de cronograma mestre',     description:'',                                                  priority:'high',   assignee:'Carlos M.',   dueDate:'', tags:['cronograma','revisão'],   order:0, createdAt:_now(), updatedAt:_now() },
      { id:'c7', columnId:'done',     title:'Termo de abertura do projeto',      description:'TAP aprovado pela diretoria.',                       priority:'high',   assignee:'Wagner',      dueDate:'', tags:['TAP','aprovado'],         order:0, createdAt:_now(), updatedAt:_now() },
    ];
  }

  /* ─── State ─── */
  function getState() { return _state; }

  function _setState(newState, saveHistory = true) {
    if (saveHistory) {
      _history.push(JSON.stringify(_state));
      if (_history.length > CONFIG.app.undoLimit) _history.shift();
    }
    _state = {
      ...newState,
      meta: { ...newState.meta, updatedAt: _now() },
    };
    _scheduleSave();
    _notify();
  }

  function _scheduleSave() {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(_save, CONFIG.app.autosaveDelay);
    _dirty = true;
  }

  function _save() {
    localStorage.setItem(CONFIG.app.storageKey, JSON.stringify(_state));
    _dirty = false;
  }

  /* ─── Undo ─── */
  function undo() {
    if (!_history.length) return false;
    _state = JSON.parse(_history.pop());
    _scheduleSave();
    _notify();
    return true;
  }

  function canUndo() { return _history.length > 0; }

  /* ─── Subscribe ─── */
  function subscribe(fn) { _listeners.push(fn); }
  function _notify() { _listeners.forEach(fn => fn(_state)); }

  /* ─── Cards ─── */
  function addCard(data) {
    const card = {
      id: 'c' + Date.now(),
      title: '',
      description: '',
      priority: '',
      assignee: '',
      dueDate: '',
      tags: [],
      order: _state.cards.filter(c => c.columnId === data.columnId).length,
      createdAt: _now(),
      updatedAt: _now(),
      ...data,
    };
    _setState({ ..._state, cards: [..._state.cards, card] });
    return card;
  }

  function updateCard(id, updates) {
    const cards = _state.cards.map(c =>
      c.id === id ? { ...c, ...updates, updatedAt: _now() } : c
    );
    _setState({ ..._state, cards });
  }

  function deleteCard(id) {
    _setState({ ..._state, cards: _state.cards.filter(c => c.id !== id) });
  }

  function moveCard(cardId, newColId, targetIndex) {
    // Remove card da lista e reinsere na posição correta
    let cards = _state.cards.filter(c => c.id !== cardId);
    const card = _state.cards.find(c => c.id === cardId);
    const colCards = cards.filter(c => c.columnId === newColId);
    colCards.splice(targetIndex, 0, { ...card, columnId: newColId });
    // Rebuild com colCards reordenados
    const others = cards.filter(c => c.columnId !== newColId);
    _setState({ ..._state, cards: [...others, ...colCards.map((c, i) => ({ ...c, order: i }))] });
  }

  /* ─── Columns ─── */
  function addColumn(data) {
    const col = {
      id: 'col' + Date.now(),
      title: '',
      wipLimit: 0,
      color: '#6b7280',
      order: _state.columns.length,
      ...data,
    };
    _setState({ ..._state, columns: [..._state.columns, col] });
    return col;
  }

  function updateColumn(id, updates) {
    const columns = _state.columns.map(c => c.id === id ? { ...c, ...updates } : c);
    _setState({ ..._state, columns });
  }

  function deleteColumn(id) {
    _setState({
      ..._state,
      columns: _state.columns.filter(c => c.id !== id),
      cards: _state.cards.filter(c => c.columnId !== id),
    });
  }

  /* ─── Meta ─── */
  function updateMeta(data) {
    _setState({ ..._state, meta: { ..._state.meta, ...data } });
  }

  /* ─── Import ─── */
  function importData(data, mode = 'replace') {
    if (mode === 'replace') {
      _setState(data);
    } else {
      // merge: adiciona colunas e cards sem duplicar IDs
      const existingColIds = new Set(_state.columns.map(c => c.id));
      const existingCardIds = new Set(_state.cards.map(c => c.id));
      const newCols = (data.columns || []).filter(c => !existingColIds.has(c.id));
      const newCards = (data.cards || []).filter(c => !existingCardIds.has(c.id));
      _setState({
        ..._state,
        columns: [..._state.columns, ...newCols],
        cards: [..._state.cards, ...newCards],
      });
    }
  }

  /* ─── Helpers ─── */
  function _now() { return new Date().toISOString(); }

  /* ─── Public API ─── */
  return {
    init, getState, subscribe, undo, canUndo,
    addCard, updateCard, deleteCard, moveCard,
    addColumn, updateColumn, deleteColumn,
    updateMeta, importData,
  };

})();
