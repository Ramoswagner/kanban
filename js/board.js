/**
 * board.js — Renderização do board e drag-and-drop
 * ──────────────────────────────────────────────────
 * Responsável por renderizar colunas/cards e gerenciar
 * o drag-and-drop nativo do HTML5.
 */

const Board = (() => {

  let _filters = { search: '', priority: '', assignee: '', tag: '' };
  let _dragCard = null;
  let _placeholder = null;

  /* ═══════════════════ RENDER PRINCIPAL ═══════════════════ */
  function render(state) {
    const board = document.getElementById('board');
    const cols = [...state.columns].sort((a, b) => a.order - b.order);
    board.innerHTML = '';
    cols.forEach(col => {
      const el = _buildColumn(col, state);
      board.appendChild(el);
    });
    _renderStats(state);
  }

  /* ═══════════════════ COLUNA ═══════════════════ */
  function _buildColumn(col, state) {
    const allCards = state.cards.filter(c => c.columnId === col.id);
    const cards = _applyFilters(allCards).sort((a, b) => a.order - b.order);
    const count = allCards.length;
    const wip = col.wipLimit;
    const exceeded = wip > 0 && count > wip;

    const el = document.createElement('div');
    el.className = 'column' + (exceeded ? ' wip-exceeded' : '');
    el.dataset.colId = col.id;

    // ─ Header ─
    const countClass = wip === 0 ? '' : exceeded ? ' wip-warn' : ' wip-ok';
    const wipLabel = wip > 0 ? `${count}/${wip}` : count;
    el.innerHTML = `
      <div class="col-header">
        <span class="col-dot" style="background:${col.color}"></span>
        <span class="col-name" title="${col.title}">${col.title}</span>
        <span class="col-count${countClass}">${wipLabel}</span>
        <button class="col-edit-btn" data-col-id="${col.id}" title="Editar coluna">✎</button>
      </div>
      <div class="cards-container" data-col-id="${col.id}">
        ${cards.length === 0 ? '<div class="col-empty">Nenhum card aqui.<br>Solte ou adicione abaixo.</div>' : ''}
      </div>
      <div class="col-footer">
        <button class="add-card-btn" data-col-id="${col.id}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Adicionar card
        </button>
      </div>
    `;

    const container = el.querySelector('.cards-container');
    cards.forEach(card => container.appendChild(CardRenderer.build(card)));

    // Drag-and-drop na coluna
    _setupDropzone(container, col.id);

    // Botão editar coluna
    el.querySelector('.col-edit-btn').addEventListener('click', () => {
      CardModal.openColumn(col);
    });

    // Botão adicionar card
    el.querySelector('.add-card-btn').addEventListener('click', () => {
      CardModal.open(null, col.id);
    });

    return el;
  }

  /* ═══════════════════ FILTROS ═══════════════════ */
  function setFilter(key, value) {
    _filters[key] = value.trim().toLowerCase();
  }

  function clearFilters() {
    _filters = { search: '', priority: '', assignee: '', tag: '' };
  }

  function _applyFilters(cards) {
    return cards.filter(c => {
      if (_filters.search) {
        const q = _filters.search;
        const hit = c.title.toLowerCase().includes(q)
          || (c.description || '').toLowerCase().includes(q)
          || (c.assignee || '').toLowerCase().includes(q)
          || (c.tags || []).some(t => t.toLowerCase().includes(q));
        if (!hit) return false;
      }
      if (_filters.priority && c.priority !== _filters.priority) return false;
      if (_filters.assignee && !(c.assignee || '').toLowerCase().includes(_filters.assignee)) return false;
      if (_filters.tag && !(c.tags || []).some(t => t.toLowerCase().includes(_filters.tag))) return false;
      return true;
    });
  }

  /* ═══════════════════ STATS BAR ═══════════════════ */
  function _renderStats(state) {
    const bar = document.getElementById('stats-bar');
    const total = state.cards.length;
    const done = state.cards.filter(c => {
      const col = state.columns.find(col => col.id === c.columnId);
      return col && col.title.toLowerCase().includes('concluid');
    }).length;
    const overdue = state.cards.filter(c => c.dueDate && new Date(c.dueDate) < new Date() && !c.dueDate.includes('concluid')).length;
    const wipWarns = state.columns.filter(col => col.wipLimit > 0 && state.cards.filter(c => c.columnId === col.id).length > col.wipLimit);

    let html = `
      <div class="stat-pill"><strong>${total}</strong> cards</div>
      <span class="stat-sep">·</span>
      <div class="stat-pill"><strong>${done}</strong> concluídos</div>
    `;
    if (overdue) html += `<span class="stat-sep">·</span><div class="stat-pill"><strong>${overdue}</strong> atrasados</div>`;
    if (wipWarns.length) {
      html += `<span class="stat-sep">·</span><span class="wip-badge">⚠ WIP: ${wipWarns.map(c => c.title).join(', ')}</span>`;
    }
    bar.innerHTML = html;
  }

  /* ═══════════════════ DRAG AND DROP ═══════════════════ */
  function _setupDropzone(container, colId) {
    container.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      container.closest('.column').classList.add('drag-over');
      _movePlaceholder(container, e.clientY);
    });

    container.addEventListener('dragleave', e => {
      if (!container.contains(e.relatedTarget)) {
        container.closest('.column').classList.remove('drag-over');
      }
    });

    container.addEventListener('drop', e => {
      e.preventDefault();
      container.closest('.column').classList.remove('drag-over');
      if (!_dragCard) return;

      const cardId = e.dataTransfer.getData('text/plain');
      const cards = container.querySelectorAll('.card:not(.drag-placeholder)');
      let targetIndex = cards.length;

      if (_placeholder && _placeholder.parentNode === container) {
        const siblings = [...container.children].filter(c => !c.classList.contains('drag-placeholder'));
        targetIndex = [...container.children].indexOf(_placeholder);
        if (targetIndex > siblings.length) targetIndex = siblings.length;
      }

      _removePlaceholder();
      Store.moveCard(cardId, colId, targetIndex);
    });
  }

  function _movePlaceholder(container, mouseY) {
    if (!_placeholder) {
      _placeholder = document.createElement('div');
      _placeholder.className = 'card drag-placeholder';
    }

    const cards = [...container.querySelectorAll('.card:not(.drag-placeholder)')];
    let inserted = false;

    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      if (mouseY < rect.top + rect.height / 2) {
        container.insertBefore(_placeholder, card);
        inserted = true;
        break;
      }
    }
    if (!inserted) container.appendChild(_placeholder);
  }

  function _removePlaceholder() {
    if (_placeholder && _placeholder.parentNode) {
      _placeholder.parentNode.removeChild(_placeholder);
    }
    _placeholder = null;
  }

  function onDragStart(cardEl, cardId) {
    _dragCard = cardId;
    cardEl.classList.add('dragging');
    setTimeout(() => cardEl.classList.add('dragging'), 0);
  }

  function onDragEnd(cardEl) {
    _dragCard = null;
    cardEl.classList.remove('dragging');
    _removePlaceholder();
    document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over'));
  }

  /* ─── Public ─── */
  return { render, setFilter, clearFilters, onDragStart, onDragEnd };

})();


/* ═══════════════════ CARD RENDERER ═══════════════════
 * Separado do Board para facilitar manutenção independente.
 */
const CardRenderer = (() => {

  function build(card) {
    const el = document.createElement('div');
    el.className = 'card';
    el.draggable = true;
    el.dataset.cardId = card.id;

    const p = CONFIG.priorities[card.priority];
    const pColor = p ? p.color : 'transparent';

    // Due date
    let dueHtml = '';
    if (card.dueDate) {
      const due = new Date(card.dueDate + 'T00:00:00');
      const now = new Date(); now.setHours(0,0,0,0);
      const diff = Math.ceil((due - now) / 86400000);
      const cls = diff < 0 ? 'overdue' : diff <= 3 ? 'soon' : '';
      const label = diff < 0 ? `${Math.abs(diff)}d atraso` : diff === 0 ? 'Hoje' : `${diff}d`;
      dueHtml = `<span class="card-due ${cls}">📅 ${label}</span>`;
    }

    // Tags
    const tagsHtml = (card.tags || []).map(t => `<span class="tag">${t}</span>`).join('');

    // Assignee
    let assigneeHtml = '';
    if (card.assignee) {
      const initials = card.assignee.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      assigneeHtml = `<span class="card-assignee"><span class="avatar">${initials}</span>${card.assignee}</span>`;
    }

    el.innerHTML = `
      <div class="card-priority-bar" style="background:${pColor}"></div>
      <div class="card-title">${_esc(card.title)}</div>
      ${card.description ? `<div class="card-desc">${_esc(card.description)}</div>` : ''}
      ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}
      <div class="card-meta">
        ${assigneeHtml}
        ${dueHtml}
      </div>
      <button class="card-edit-btn" title="Editar">✎</button>
    `;

    // Drag
    el.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', card.id);
      e.dataTransfer.effectAllowed = 'move';
      Board.onDragStart(el, card.id);
    });
    el.addEventListener('dragend', () => Board.onDragEnd(el));

    // Edit
    el.querySelector('.card-edit-btn').addEventListener('click', e => {
      e.stopPropagation();
      CardModal.open(card);
    });
    el.addEventListener('dblclick', () => CardModal.open(card));

    return el;
  }

  function _esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return { build };

})();
