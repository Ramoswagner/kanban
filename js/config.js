/**
 * config.js — Configurações do Kanban
 * ─────────────────────────────────────
 * Edite este arquivo para customizar colunas padrão,
 * prioridades, cores e comportamentos da aplicação.
 */

const CONFIG = {

  app: {
    name: 'Kanban Board',
    version: '1.0.0',
    storageKey: 'kanban-v1-data',
    autosave: true,
    autosaveDelay: 2000,   // ms após última alteração
    undoLimit: 30,
  },

  // Colunas que serão criadas quando não houver dados salvos
  defaultColumns: [
    { id: 'backlog',  title: 'Backlog',         wipLimit: 0, color: '#7FA653', order: 0 },
    { id: 'todo',     title: 'A Fazer',          wipLimit: 6, color: '#d4a843', order: 1 },
    { id: 'doing',    title: 'Em Andamento',     wipLimit: 3, color: '#2980b9', order: 2 },
    { id: 'review',   title: 'Em Revisão',       wipLimit: 2, color: '#8e44ad', order: 3 },
    { id: 'done',     title: 'Concluído',        wipLimit: 0, color: '#63783D', order: 4 },
  ],

  // Prioridades disponíveis nos cards
  priorities: {
    critical: { label: 'Crítica',  color: '#ef4444', emoji: '🔴' },
    high:     { label: 'Alta',     color: '#f97316', emoji: '🟠' },
    medium:   { label: 'Média',    color: '#d4a843', emoji: '🟡' },
    low:      { label: 'Baixa',    color: '#63783D', emoji: '🟢' },
  },

  // Cores de preset na edição de colunas
  colorPresets: [
    '#7FA653', '#2980b9', '#0ea5e9', '#06b6d4',
    '#63783D', '#84cc16', '#d4a843', '#f97316',
    '#ef4444', '#ec4899', '#8e44ad', '#6b7280',
  ],

  export: {
    pdfWarn: true,                      // Exibir aviso ao exportar PDF
    defaultFilename: 'kanban-export',   // Nome base dos arquivos
    pdfTitle: 'Kanban Board — Snapshot',
    csvDelimiter: ',',
  },

};
