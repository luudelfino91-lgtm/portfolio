# Editando o conteúdo

Todo o conteúdo dinâmico está em `assets/js/data.js`. O `app.js` lê esses dados e monta a página: não é preciso mexer em HTML para adicionar um projeto.

## Adicionar um projeto

Copie um objeto dentro de `PROJECTS` e ajuste os campos:

| Campo | Obrigatório | Descrição |
|---|---|---|
| `slug` | sim | Identificador único, usado na URL do case (`#/case/slug`). Sem espaços nem acentos. |
| `lane` | sim | Trilha: `autoral`, `negocio` ou `automacao` (ou crie uma nova em `LANES`). |
| `domain` | sim | Setor/tema exibido acima do título. |
| `title` | sim | Nome do projeto. |
| `file` | sim | Nome de arquivo exibido na moldura da prévia (ex.: `lets-cola.pbix`). |
| `lede` | sim | Frase principal: o que é o projeto. |
| `side` | sim | Segunda coluna: o ângulo ou a pergunta de negócio. |
| `kpi` | sim | `{v: "96 h", l: "por mês devolvidas"}` — número de destaque. |
| `tools` | sim | Ferramentas (alimentam o filtro). |
| `tags` | não | Temas extras. |
| `report` | não | Link público do Power BI. Vazio = sem botão "Abrir relatório". |
| `repo` | não | Link do GitHub do projeto. |
| `cover` | não | Captura do relatório, ex.: `assets/img/projetos/lets-cola.webp`. Vazio = prévia ilustrativa automática. |
| `mock` | não | Estilo da prévia ilustrativa: `area`, `line`, `bars`, `donut`, `pipeline`. |
| `draft` | não | `true` mostra um aviso de rascunho no case. |
| `internal` | não | `true` marca como projeto interno (dados confidenciais). |
| `case` | sim | `{pergunta, dados: [], tecnicas: [], dax, resultado}` — conteúdo do case técnico. |

## Capas dos projetos

1. Exporte uma captura do relatório em 16:9 (ex.: 1600×900).
2. Converta para `.webp` (menor e mais rápido).
3. Salve em `assets/img/projetos/<slug>.webp` e preencha `cover`.

## Avisos de rascunho

Quando os textos estiverem revisados, mude `SHOW_DRAFT_NOTES` para `false` no topo do `data.js`.

## Checklist antes de publicar

- [ ] Links `report` de todos os projetos conferidos
- [ ] Capas reais adicionadas
- [ ] Cases revisados e `SHOW_DRAFT_NOTES = false`
- [ ] Testado no celular (≈ 400 px) e nos temas claro e escuro
