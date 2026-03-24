/**
 * import.js — Importação de dados
 * ──────────────────────────────────
 * Suporta JSON (formato nativo) e CSV (formato planilha).
 * O CSV importado é convertido para o formato interno.
 */

const Importer = (() => {

  let _parsedData = null;
  let _fileName = '';

  /* ═══════════════════ PARSE ═══════════════════ */

  function parseJSON(text) {
    const data = JSON.parse(text); // lança se inválido
    // Validação mínima
    if (!Array.isArray(data.columns) || !Array.isArray(data.cards)) {
      throw new Error('JSON inválido: precisa ter "columns" e "cards".');
    }
    return data;
  }

  function parseCSV(text) {
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) throw new Error('CSV precisa de cabeçalho + ao menos uma linha.');

    const headers = _splitCSVLine(lines[0]).map(h => h.trim().toLowerCase());

    // Mapeamento de colunas únicas
    const columnMap = {}; // colName → id
    const cards = [];

    for (let i = 1; i < lines.length; i++) {
      const vals = _splitCSVLine(lines[i]);
      const row = {};
      headers.forEach((h, idx) => { row[h] = (vals[idx] || '').trim(); });

      const colName = row['coluna'] || row['column'] || row['status'] || 'Backlog';
      if (!columnMap[colName]) {
        columnMap[colName] = 'col-' + Object.keys(columnMap).length + '-' + Date.now();
      }

      cards.push({
        id: 'c-csv-' + i + '-' + Date.now(),
        columnId: columnMap[colName],
        title: row['título'] || row['titulo'] || row['title'] || `Card ${i}`,
        description: row['descrição'] || row['descricao'] || row['description'] || '',
        priority: _normalizePriority(row['prioridade'] || row['priority'] || ''),
        assignee: row['responsável'] || row['responsavel'] || row['assignee'] || '',
        dueDate: _normalizeDate(row['data limite'] || row['duedate'] || row['due_date'] || row['prazo'] || ''),
        tags: (row['tags'] || '').split(';').map(t => t.trim()).filter(Boolean),
        order: i - 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const columns = Object.entries(columnMap).map(([title, id], idx) => ({
      id,
      title,
      wipLimit: 0,
      color: CONFIG.colorPresets[idx % CONFIG.colorPresets.length],
      order: idx,
    }));

    return {
      meta: {
        title: 'Importado via CSV',
        description: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      columns,
      cards,
    };
  }

  function _splitCSVLine(line) {
    // Respeita campos entre aspas
    const result = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if ((ch === ',' || ch === ';') && !inQuotes) {
        result.push(field);
        field = '';
      } else {
        field += ch;
      }
    }
    result.push(field);
    return result;
  }

  function _normalizePriority(val) {
    const v = val.toLowerCase();
    if (v.includes('crít') || v.includes('critic')) return 'critical';
    if (v.includes('alta') || v.includes('high'))   return 'high';
    if (v.includes('méd') || v.includes('medi'))    return 'medium';
    if (v.includes('baix') || v.includes('low'))    return 'low';
    return '';
  }

  function _normalizeDate(val) {
    if (!val) return '';
    // Tenta converter dd/mm/yyyy → yyyy-mm-dd
    const parts = val.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
    return val; // já pode estar no formato correto
  }

  /* ═══════════════════ MODAL ═══════════════════ */

  function openModal() {
    _parsedData = null;
    _fileName = '';
    document.getElementById('import-preview').classList.add('hidden');
    document.getElementById('import-dropzone').classList.remove('hidden');
    document.getElementById('import-btn-confirm').disabled = true;
    document.getElementById('import-file-input').value = '';
    document.getElementById('import-modal-overlay').classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('import-modal-overlay').classList.add('hidden');
  }

  async function handleFile(file) {
    if (!file) return;
    _fileName = file.name;
    const ext = file.name.split('.').pop().toLowerCase();

    try {
      const text = await file.text();
      if (ext === 'json') {
        _parsedData = parseJSON(text);
      } else if (ext === 'csv') {
        _parsedData = parseCSV(text);
      } else {
        Toast.show('Formato não suportado. Use JSON ou CSV.', 'error');
        return;
      }

      // Preview
      const colCount = _parsedData.columns.length;
      const cardCount = _parsedData.cards.length;
      document.getElementById('import-preview-name').textContent = file.name;
      document.getElementById('import-preview-content').textContent =
        `✓ ${colCount} colunas, ${cardCount} cards encontrados.\n\n` +
        'Colunas: ' + _parsedData.columns.map(c => c.title).join(', ');

      document.getElementById('import-dropzone').classList.add('hidden');
      document.getElementById('import-preview').classList.remove('hidden');
      document.getElementById('import-btn-confirm').disabled = false;

    } catch (err) {
      Toast.show('Erro ao ler arquivo: ' + err.message, 'error');
    }
  }

  function confirmImport() {
    if (!_parsedData) return;
    const mode = document.querySelector('input[name="import-mode"]:checked').value;
    Store.importData(_parsedData, mode);
    Toast.show(`Dados importados com sucesso (${mode === 'replace' ? 'substituição' : 'mesclagem'}).`, 'success');
    closeModal();
  }

  /* ─── Templates para download ─── */
  function downloadCSVTemplate() {
    const rows = [
      ['Título','Coluna','Prioridade','Responsável','Data Limite','Tags','Descrição'],
      ['Minha tarefa','A Fazer','Alta','João Silva','31/12/2025','design;ux','Contexto da tarefa'],
      ['Outra tarefa','Backlog','Média','','','',''],
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    _download(csv, 'kanban-template.csv', 'text/csv');
  }

  function downloadJSONTemplate() {
    const template = {
      meta: { title: 'Meu Projeto', description: '', createdAt: '', updatedAt: '' },
      columns: [
        { id: 'backlog', title: 'Backlog', wipLimit: 0, color: '#6366f1', order: 0 },
        { id: 'todo', title: 'A Fazer', wipLimit: 5, color: '#d4a843', order: 1 },
        { id: 'doing', title: 'Em Andamento', wipLimit: 3, color: '#3b82f6', order: 2 },
        { id: 'done', title: 'Concluído', wipLimit: 0, color: '#22c55e', order: 3 },
      ],
      cards: [
        { id: 'c1', columnId: 'todo', title: 'Exemplo de card', description: 'Descrição opcional', priority: 'high', assignee: 'Nome', dueDate: '2025-12-31', tags: ['tag1','tag2'], order: 0, createdAt: '', updatedAt: '' },
      ],
    };
    _download(JSON.stringify(template, null, 2), 'kanban-template.json', 'application/json');
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
    document.getElementById('btn-import').addEventListener('click', openModal);
    document.getElementById('import-modal-close').addEventListener('click', closeModal);
    document.getElementById('import-btn-cancel').addEventListener('click', closeModal);
    document.getElementById('import-modal-overlay').addEventListener('click', e => {
      if (e.target.id === 'import-modal-overlay') closeModal();
    });

    // File input
    document.getElementById('import-file-input').addEventListener('change', e => {
      handleFile(e.target.files[0]);
    });

    // Dropzone click
    document.getElementById('import-dropzone').addEventListener('click', () => {
      document.getElementById('import-file-input').click();
    });

    // Drag over dropzone
    const dz = document.getElementById('import-dropzone');
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-active'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-active'));
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.classList.remove('drag-active');
      handleFile(e.dataTransfer.files[0]);
    });

    // Clear preview
    document.getElementById('import-clear').addEventListener('click', () => {
      _parsedData = null;
      document.getElementById('import-preview').classList.add('hidden');
      document.getElementById('import-dropzone').classList.remove('hidden');
      document.getElementById('import-btn-confirm').disabled = true;
    });

    document.getElementById('import-btn-confirm').addEventListener('click', confirmImport);

    // Templates
    document.getElementById('btn-download-csv-template').addEventListener('click', downloadCSVTemplate);
    document.getElementById('btn-download-json-template').addEventListener('click', downloadJSONTemplate);
  }

  return { bindEvents, openModal };

})();
