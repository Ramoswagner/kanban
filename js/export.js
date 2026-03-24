/**
 * export.js — Exportação de dados
 * ──────────────────────────────────
 * Formatos suportados: JSON, CSV, XLSX (SheetJS), PDF (jsPDF)
 *
 * PDF tem aviso inteligente sugerindo formatos melhores
 * para acompanhamento ativo.
 */

const Exporter = (() => {

  let _selectedFormat = 'json';

  /* ═══════════════════ MODAL ═══════════════════ */

  function openModal() {
    _selectedFormat = 'json';
    _selectCard('json');
    document.getElementById('pdf-warning').classList.add('hidden');
    document.getElementById('export-modal-overlay').classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('export-modal-overlay').classList.add('hidden');
  }

  function _selectCard(format) {
    _selectedFormat = format;
    document.querySelectorAll('.export-card').forEach(el => {
      el.classList.toggle('selected', el.dataset.format === format);
    });
    // PDF warning
    const warn = document.getElementById('pdf-warning');
    if (format === 'pdf' && CONFIG.export.pdfWarn) {
      warn.classList.remove('hidden');
    } else {
      warn.classList.add('hidden');
    }
  }

  function _getOptions() {
    return {
      includeDone: document.getElementById('export-include-done').checked,
      includeDesc: document.getElementById('export-include-desc').checked,
    };
  }

  function runExport() {
    const state = Store.getState();
    const opts = _getOptions();
    const filename = CONFIG.export.defaultFilename + '-' + _dateStamp();

    switch (_selectedFormat) {
      case 'json':  exportJSON(state, filename, opts); break;
      case 'csv':   exportCSV(state, filename, opts);  break;
      case 'xlsx':  exportXLSX(state, filename, opts); break;
      case 'pdf':   exportPDF(state, filename, opts);  break;
    }

    Toast.show(`Arquivo ${_selectedFormat.toUpperCase()} gerado com sucesso!`, 'success');
    closeModal();
  }

  /* ═══════════════════ JSON ═══════════════════ */

  function exportJSON(state, filename, opts = {}) {
    let data = { ...state };
    if (!opts.includeDone) {
      const doneColIds = _getDoneColIds(state);
      data = { ...data, cards: data.cards.filter(c => !doneColIds.has(c.columnId)) };
    }
    if (!opts.includeDesc) {
      data = { ...data, cards: data.cards.map(c => ({ ...c, description: '' })) };
    }
    _download(JSON.stringify(data, null, 2), filename + '.json', 'application/json');
  }

  /* ═══════════════════ CSV ═══════════════════ */

  function exportCSV(state, filename, opts = {}) {
    const rows = _buildRows(state, opts);
    const headers = ['ID','Título','Coluna','Prioridade','Responsável','Data Limite','Tags','Criado em','Descrição'];
    const csv = [headers, ...rows.map(r => [
      r.id, r.title, r.column, r.priority, r.assignee,
      r.dueDate, r.tags, r.createdAt, r.description,
    ])].map(row => row.map(v => `"${String(v || '').replace(/"/g,'""')}"`).join(',')).join('\n');

    // BOM para Excel reconhecer UTF-8
    _download('\uFEFF' + csv, filename + '.csv', 'text/csv;charset=utf-8');
  }

  /* ═══════════════════ XLSX ═══════════════════ */

  function exportXLSX(state, filename, opts = {}) {
    if (typeof XLSX === 'undefined') {
      Toast.show('Biblioteca XLSX não carregada. Verifique a conexão.', 'error');
      return;
    }

    const rows = _buildRows(state, opts);
    const ws_data = [
      ['ID','Título','Coluna','Prioridade','Responsável','Data Limite','Tags','Criado em','Descrição'],
      ...rows.map(r => [r.id, r.title, r.column, r.priority, r.assignee, r.dueDate, r.tags, r.createdAt, r.description]),
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Larguras das colunas
    ws['!cols'] = [
      {wch:12},{wch:35},{wch:18},{wch:12},{wch:20},
      {wch:14},{wch:25},{wch:22},{wch:50},
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Kanban');

    // Aba de resumo por coluna
    const summaryData = [['Coluna','Total de Cards','WIP Limite','Status WIP']];
    state.columns.forEach(col => {
      const total = state.cards.filter(c => c.columnId === col.id).length;
      const wip = col.wipLimit;
      const status = wip === 0 ? 'Sem limite' : total > wip ? '⚠ Excedido' : 'OK';
      summaryData.push([col.title, total, wip || '-', status]);
    });
    const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
    ws2['!cols'] = [{wch:22},{wch:16},{wch:14},{wch:14}];
    XLSX.utils.book_append_sheet(wb, ws2, 'Resumo por Coluna');

    XLSX.writeFile(wb, filename + '.xlsx');
  }

  /* ═══════════════════ PDF ═══════════════════ */

  function exportPDF(state, filename, opts = {}) {
    if (typeof jspdf === 'undefined') {
      Toast.show('Biblioteca jsPDF não carregada. Verifique a conexão.', 'error');
      return;
    }

    const { jsPDF } = jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const margin = 12;
    const now = new Date().toLocaleString('pt-BR');

    // Fundo
    doc.setFillColor(12, 16, 24);
    doc.rect(0, 0, W, H, 'F');

    // Cabeçalho
    doc.setFillColor(25, 33, 53);
    doc.rect(0, 0, W, 18, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(212, 168, 67);
    doc.text(state.meta?.title || CONFIG.export.pdfTitle, margin, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(139, 147, 176);
    doc.text(`Gerado em ${now}`, W - margin, 12, { align: 'right' });

    // Colunas do board
    const cols = [...state.columns].sort((a, b) => a.order - b.order);
    const doneColIds = _getDoneColIds(state);
    const colsToShow = opts.includeDone ? cols : cols.filter(c => !doneColIds.has(c.id));

    const colCount = colsToShow.length;
    const colW = (W - margin * 2 - (colCount - 1) * 5) / colCount;
    let startY = 22;

    colsToShow.forEach((col, ci) => {
      const x = margin + ci * (colW + 5);
      let y = startY;

      const cards = state.cards
        .filter(c => c.columnId === col.id)
        .sort((a, b) => a.order - b.order);
      const count = cards.length;

      // Header da coluna
      const [r, g, b] = _hexToRGB(col.color);
      doc.setFillColor(r, g, b);
      doc.rect(x, y, colW, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(`${col.title} (${count})`, x + 2, y + 5);
      y += 9;

      // Cards
      cards.forEach(card => {
        if (y > H - 14) return; // evita overflow simples
        const cardH = opts.includeDesc && card.description ? 20 : 13;

        doc.setFillColor(26, 36, 56);
        doc.roundedRect(x, y, colW, cardH, 1, 1, 'F');

        // Barra de prioridade
        const pColor = CONFIG.priorities[card.priority]?.color || '#4a5568';
        const [pr, pg, pb] = _hexToRGB(pColor);
        doc.setFillColor(pr, pg, pb);
        doc.rect(x, y, 2, cardH, 'F');

        // Título
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(232, 234, 245);
        const titleLines = doc.splitTextToSize(card.title, colW - 6);
        doc.text(titleLines.slice(0, 2), x + 4, y + 5);

        // Descrição
        if (opts.includeDesc && card.description) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6);
          doc.setTextColor(139, 147, 176);
          const descLines = doc.splitTextToSize(card.description, colW - 6);
          doc.text(descLines.slice(0, 2), x + 4, y + 11);
        }

        // Assignee e due date
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(80, 88, 120);
        if (card.assignee) doc.text(card.assignee, x + 4, y + cardH - 3);
        if (card.dueDate) doc.text(card.dueDate, x + colW - 3, y + cardH - 3, { align: 'right' });

        y += cardH + 2;
      });
    });

    // Rodapé
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(80, 88, 120);
    doc.text('Kanban Board · exportação estática — use JSON ou CSV para reimportar e editar.', margin, H - 5);

    doc.save(filename + '.pdf');
  }

  /* ═══════════════════ HELPERS ═══════════════════ */

  function _buildRows(state, opts) {
    const doneColIds = _getDoneColIds(state);
    return state.cards
      .filter(c => opts.includeDone || !doneColIds.has(c.columnId))
      .sort((a, b) => a.order - b.order)
      .map(c => {
        const col = state.columns.find(cl => cl.id === c.columnId);
        return {
          id: c.id,
          title: c.title,
          column: col?.title || '',
          priority: CONFIG.priorities[c.priority]?.label || '',
          assignee: c.assignee || '',
          dueDate: c.dueDate || '',
          tags: (c.tags || []).join('; '),
          createdAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString('pt-BR') : '',
          description: opts.includeDesc ? (c.description || '') : '',
        };
      });
  }

  function _getDoneColIds(state) {
    return new Set(
      state.columns
        .filter(c => c.title.toLowerCase().includes('concluid') || c.title.toLowerCase().includes('done'))
        .map(c => c.id)
    );
  }

  function _hexToRGB(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [parseInt(result[1],16), parseInt(result[2],16), parseInt(result[3],16)] : [74,85,104];
  }

  function _dateStamp() {
    return new Date().toISOString().slice(0, 10);
  }

  function _download(content, filename, mime) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: mime }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* ─── Bind ─── */
  function bindEvents() {
    document.getElementById('btn-export').addEventListener('click', openModal);
    document.getElementById('export-modal-close').addEventListener('click', closeModal);
    document.getElementById('export-btn-cancel').addEventListener('click', closeModal);
    document.getElementById('export-modal-overlay').addEventListener('click', e => {
      if (e.target.id === 'export-modal-overlay') closeModal();
    });

    // Selecionar formato
    document.querySelectorAll('.export-card').forEach(el => {
      el.addEventListener('click', () => _selectCard(el.dataset.format));
    });

    // PDF warning switch buttons
    document.getElementById('pdf-warn-csv').addEventListener('click', () => _selectCard('csv'));
    document.getElementById('pdf-warn-json').addEventListener('click', () => _selectCard('json'));

    document.getElementById('export-btn-confirm').addEventListener('click', runExport);
  }

  return { bindEvents, openModal, exportJSON, exportCSV, exportXLSX, exportPDF };

})();
