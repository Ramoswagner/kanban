# Kanban Board — Guia de Manutenção

Aplicação Kanban local, sem dependência de servidor. Basta abrir o `index.html` no navegador.

---

## Estrutura de arquivos

```
kanban-app/
├── index.html          # Shell principal — HTML, modais e CDN scripts
├── style.css           # Todo o visual — cores, tipografia, layout
├── js/
│   ├── config.js       # ⚙️ Configurações (colunas, cores, comportamentos)
│   ├── store.js        # Estado central, localStorage e undo
│   ├── board.js        # Renderização do board e drag-and-drop
│   ├── card.js         # Modal de card/coluna e notificações Toast
│   ├── import.js       # Importação de JSON e CSV
│   └── export.js       # Exportação: JSON, CSV, XLSX, PDF
│   └── app.js          # Inicialização e eventos globais
├── sample-data.json    # Exemplo de dados para importar
└── README.md           # Este arquivo
```

---

## O que editar para cada necessidade

| Necessidade | Arquivo |
|---|---|
| Mudar colunas padrão | `js/config.js` → `defaultColumns` |
| Mudar cores ou paleta | `style.css` → variáveis em `:root` |
| Mudar tipografia | `style.css` → `--font-*` e import Google Fonts em `index.html` |
| Ajustar WIP limits | `js/config.js` → `defaultColumns[n].wipLimit` |
| Adicionar novo formato de exportação | `js/export.js` → nova função + novo `case` em `runExport()` |
| Mudar campos do card | `index.html` (formulário) + `js/card.js` (_saveCard) + `js/board.js` (CardRenderer.build) |
| Mudar o alerta do PDF | `js/config.js` → `export.pdfWarn` (false para desativar) |
| Mudar nome padrão dos arquivos exportados | `js/config.js` → `export.defaultFilename` |

---

## Formatos de importação

### JSON (recomendado)
Estrutura esperada:
```json
{
  "meta": { "title": "Meu Projeto" },
  "columns": [{ "id":"col1", "title":"Backlog", "wipLimit":0, "color":"#6366f1", "order":0 }],
  "cards": [{ "id":"c1", "columnId":"col1", "title":"Tarefa", "priority":"high", ... }]
}
```

### CSV
Cabeçalhos aceitos (em português ou inglês):

| Português | Inglês alternativo |
|---|---|
| Título | title |
| Coluna | column / status |
| Prioridade | priority |
| Responsável | assignee |
| Data Limite | dueDate / due_date / prazo |
| Tags (separar por `;`) | tags |
| Descrição | description |

> Use o botão **"⬇ Template CSV"** no modal de importação para baixar um modelo pronto.

---

## Formatos de exportação

| Formato | Quando usar |
|---|---|
| **JSON** ✅ | Backup, reimportação, versionamento (Git) |
| **CSV** ✅ | Excel, Google Sheets, filtros e gráficos de acompanhamento |
| **XLSX** | Planilha formatada pronta para o Excel |
| **PDF** | Apresentações, snapshots, registro estático |

> ⚠️ PDF não pode ser reimportado. Para acompanhamento ativo, prefira CSV ou JSON.

---

## Funcionalidades

- **Drag-and-drop** nativo entre colunas
- **WIP Limits** com alerta visual por coluna
- **Undo** ilimitado (Ctrl+Z ou botão)
- **Persistência automática** em localStorage (sem servidor)
- **Busca em tempo real** por título, descrição, responsável ou tag
- **Filtros combinados** por prioridade, responsável e tag
- **Cards com** prioridade (barra colorida), responsável (avatar), data limite (alerta de atraso), tags
- **Edição inline** do título do board (clique para editar)
- **Modal de coluna** com cor, nome e WIP limit
- **Exportação XLSX** com aba de resumo por coluna automática

---

## Dependências (CDN — sem instalação)

| Lib | Uso |
|---|---|
| jsPDF 2.5.1 | Geração de PDF |
| SheetJS 0.18.5 | Exportação XLSX |
| Google Fonts | Fraunces + DM Sans + JetBrains Mono |

---

## Como versionar os dados no Git

1. Exporte em **JSON** regularmente
2. Salve o arquivo como `kanban-[projeto]-[data].json` na pasta do repositório
3. Use `sample-data.json` como ponto de partida para novos membros do time

---

*Desenvolvido como ferramenta local de gestão visual — sem backend, sem login, sem dependências externas além dos CDNs.*
