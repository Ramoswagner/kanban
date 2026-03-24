/**
 * card.js — Modal de criação/edição de cards e colunas
 * ──────────────────────────────────────────────────────
 * Gerencia abertura, preenchimento, validação e salvamento
 * do modal de card e do modal de edição de colunas.
 */

const CardModal = (() => {

  let _editingCardId = null;
  let _editingColId = null;

  /* ═══════════════════ CARD MODAL ═══════════════════ */
  function open(card = null, defaultColId = null) {
    _editingCardId = card ? card.id : null;
    const isNew = !card;
    const state = Store.getState();

    // Título do modal
    document.getElementById('card-modal-title').textContent = isNew ? 'Novo Card' : 'Editar Card';

    // Popula select de colunas
    const colSelect = document.getElementById('card-input-column');
    colSelect.innerHTML = state.columns
      .sort((a, b) => a.order - b.order)
      .map(c => `<option value="${c.id}">${c.title}</option>`)
      .join('');

    // Preenche campos
    const col = defaultColId || (card ? card.columnId : state.columns[0]?.id || '');
    document.getElementById('card-input-title').value    = card?.title || '';
    document.getElementById('card-input-desc').value     = card?.description || '';
    document.getElementById('card-input-priority').value = card?.priority || '';
    document.getElementById('card-input-assignee').value = card?.assignee || '';
    document.getElementById('card-input-duedate').value  = card?.dueDate || '';
    document.getElementById('card-input-tags').value     = (card?.tags || []).join(', ');
    colSelect.value = col;

    // Botão excluir
    const delBtn = document.getElementById('card-btn-delete');
    if (isNew) delBtn.classList.add('hidden');
    else delBtn.classList.remove('hidden');

    _showModal('card-modal-overlay');
    setTimeout(() => document.getElementById('card-input-title').focus(), 50);
  }

  function _saveCard() {
    const title = document.getElementById('card-input-title').value.trim();
    if (!title) {
      Toast.show('O título é obrigatório.', 'error');
      document.getElementById('card-input-title').focus();
      return;
    }

    const data = {
      title,
      description: document.getElementById('card-input-desc').value.trim(),
      columnId:    document.getElementById('card-input-column').value,
      priority:    document.getElementById('card-input-priority').value,
      assignee:    document.getElementById('card-input-assignee').value.trim(),
      dueDate:     document.getElementById('card-input-duedate').value,
      tags:        document.getElementById('card-input-tags').value
                     .split(',').map(t => t.trim()).filter(Boolean),
    };

    if (_editingCardId) {
      Store.updateCard(_editingCardId, data);
      Toast.show('Card atualizado.', 'success');
    } else {
      Store.addCard(data);
      Toast.show('Card criado.', 'success');
    }
    _closeCard();
  }

  function _deleteCard() {
    if (!_editingCardId) return;
    if (!confirm('Excluir este card? Essa ação não pode ser desfeita.')) return;
    Store.deleteCard(_editingCardId);
    Toast.show('Card excluído.', 'success');
    _closeCard();
  }

  function _closeCard() {
    _hideModal('card-modal-overlay');
    _editingCardId = null;
  }

  /* ═══════════════════ COLUMN MODAL ═══════════════════ */
  function openColumn(col = null) {
    _editingColId = col ? col.id : null;
    const isNew = !col;

    document.getElementById('col-modal-title').textContent = isNew ? 'Nova Coluna' : 'Editar Coluna';
    document.getElementById('col-input-title').value = col?.title || '';
    document.getElementById('col-input-wip').value   = col?.wipLimit ?? 0;
    document.getElementById('col-input-color').value = col?.color || '#6b7280';

    // Presets de cor
    const presetsEl = document.getElementById('color-presets');
    presetsEl.innerHTML = CONFIG.colorPresets.map(hex => `
      <div class="color-preset ${col?.color === hex ? 'active' : ''}"
           style="background:${hex}"
           data-color="${hex}"
           title="${hex}"></div>
    `).join('');
    presetsEl.querySelectorAll('.color-preset').forEach(el => {
      el.addEventListener('click', () => {
        document.getElementById('col-input-color').value = el.dataset.color;
        presetsEl.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
        el.classList.add('active');
      });
    });

    const delBtn = document.getElementById('col-btn-delete');
    if (isNew) delBtn.classList.add('hidden');
    else delBtn.classList.remove('hidden');

    _showModal('col-modal-overlay');
    setTimeout(() => document.getElementById('col-input-title').focus(), 50);
  }

  function _saveColumn() {
    const title = document.getElementById('col-input-title').value.trim();
    if (!title) {
      Toast.show('O nome da coluna é obrigatório.', 'error');
      return;
    }
    const data = {
      title,
      wipLimit: parseInt(document.getElementById('col-input-wip').value) || 0,
      color:    document.getElementById('col-input-color').value,
    };

    if (_editingColId) {
      Store.updateColumn(_editingColId, data);
      Toast.show('Coluna atualizada.', 'success');
    } else {
      Store.addColumn(data);
      Toast.show('Coluna criada.', 'success');
    }
    _closeColumn();
  }

  function _deleteColumn() {
    if (!_editingColId) return;
    const state = Store.getState();
    const cardsInCol = state.cards.filter(c => c.columnId === _editingColId).length;
    const msg = cardsInCol > 0
      ? `Esta coluna tem ${cardsInCol} card(s) que também serão excluídos. Confirma?`
      : 'Excluir esta coluna?';
    if (!confirm(msg)) return;
    Store.deleteColumn(_editingColId);
    Toast.show('Coluna excluída.', 'success');
    _closeColumn();
  }

  function _closeColumn() {
    _hideModal('col-modal-overlay');
    _editingColId = null;
  }

  /* ─── Helpers ─── */
  function _showModal(id) { document.getElementById(id).classList.remove('hidden'); }
  function _hideModal(id) { document.getElementById(id).classList.add('hidden'); }

  /* ─── Bind events ─── */
  function bindEvents() {
    // Card modal
    document.getElementById('card-btn-save').addEventListener('click', _saveCard);
    document.getElementById('card-btn-cancel').addEventListener('click', _closeCard);
    document.getElementById('card-modal-close').addEventListener('click', _closeCard);
    document.getElementById('card-btn-delete').addEventListener('click', _deleteCard);
    document.getElementById('card-modal-overlay').addEventListener('click', e => {
      if (e.target.id === 'card-modal-overlay') _closeCard();
    });
    document.getElementById('card-input-title').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _saveCard(); }
    });

    // Column modal
    document.getElementById('col-btn-save').addEventListener('click', _saveColumn);
    document.getElementById('col-btn-cancel').addEventListener('click', _closeColumn);
    document.getElementById('col-modal-close').addEventListener('click', _closeColumn);
    document.getElementById('col-btn-delete').addEventListener('click', _deleteColumn);
    document.getElementById('col-modal-overlay').addEventListener('click', e => {
      if (e.target.id === 'col-modal-overlay') _closeColumn();
    });

    // Add column button
    document.getElementById('btn-add-column').addEventListener('click', () => openColumn());
  }

  return { open, openColumn, bindEvents };

})();


/* ═══════════════════ TOAST ═══════════════════ */
const Toast = (() => {

  function show(msg, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add('fade-out');
      setTimeout(() => el.remove(), 400);
    }, duration);
  }

  return { show };

})();
