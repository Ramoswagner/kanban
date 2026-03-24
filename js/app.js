/**
 * app.js — Inicialização e eventos globais
 * ──────────────────────────────────────────
 * Ponto de entrada da aplicação. Inicializa o Store,
 * conecta o Store ao Board e vincula eventos globais.
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ─── 1. Init Store ─── */
  Store.init();

  /* ─── 2. Subscribe: re-renderiza board em cada mudança ─── */
  Store.subscribe(state => {
    Board.render(state);
    _updateBoardTitle(state);
    _updateUndoBtn();
  });

  /* ─── 3. Render inicial ─── */
  Board.render(Store.getState());
  _updateBoardTitle(Store.getState());

  /* ─── 4. Bind events de módulos ─── */
  CardModal.bindEvents();
  Importer.bindEvents();
  Exporter.bindEvents();

  /* ─── 5. Board title (editable h1) ─── */
  const titleEl = document.getElementById('board-title');
  titleEl.addEventListener('blur', () => {
    const newTitle = titleEl.textContent.trim() || 'Meu Projeto';
    titleEl.textContent = newTitle;
    Store.updateMeta({ title: newTitle });
  });
  titleEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); }
  });

  /* ─── 6. Search ─── */
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');

  searchInput.addEventListener('input', () => {
    const val = searchInput.value;
    Board.setFilter('search', val);
    searchClear.classList.toggle('hidden', !val);
    Board.render(Store.getState());
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    Board.setFilter('search', '');
    searchClear.classList.add('hidden');
    Board.render(Store.getState());
  });

  /* ─── 7. Filters ─── */
  document.getElementById('filter-priority').addEventListener('change', e => {
    Board.setFilter('priority', e.target.value);
    Board.render(Store.getState());
  });

  document.getElementById('filter-assignee').addEventListener('input', e => {
    Board.setFilter('assignee', e.target.value);
    Board.render(Store.getState());
  });

  document.getElementById('filter-tag').addEventListener('input', e => {
    Board.setFilter('tag', e.target.value);
    Board.render(Store.getState());
  });

  document.getElementById('btn-clear-filters').addEventListener('click', () => {
    document.getElementById('filter-priority').value = '';
    document.getElementById('filter-assignee').value = '';
    document.getElementById('filter-tag').value = '';
    searchInput.value = '';
    searchClear.classList.add('hidden');
    Board.clearFilters();
    Board.render(Store.getState());
    Toast.show('Filtros limpos.', 'info', 1500);
  });

  /* ─── 8. Undo global ─── */
  document.getElementById('btn-undo').addEventListener('click', () => {
    const ok = Store.undo();
    if (ok) Toast.show('Ação desfeita.', 'success', 1500);
    else Toast.show('Nada para desfazer.', 'warn', 1500);
  });

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      const ok = Store.undo();
      if (ok) Toast.show('Ação desfeita.', 'success', 1500);
    }
    // Esc fecha modais abertos
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => {
        m.classList.add('hidden');
      });
    }
  });

  /* ─── Helpers ─── */
  function _updateBoardTitle(state) {
    const el = document.getElementById('board-title');
    if (document.activeElement !== el) {
      el.textContent = state.meta?.title || 'Meu Projeto';
    }
    document.title = (state.meta?.title || 'Kanban') + ' — Kanban Board';
  }

  function _updateUndoBtn() {
    document.getElementById('btn-undo').style.opacity = Store.canUndo() ? '1' : '0.3';
  }

});
