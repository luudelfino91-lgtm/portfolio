# Copy diet (menos texto, ferramenta primeiro) - status

Branch `feat/copy-diet`. Estado: **Implementado e testado nas suites listadas abaixo**; itens nao verificados no fim.

## O que mudou
- Home: hero com uma frase; cartoes de 1 linha; sem paragrafo intro em Tools; uma unica linha de privacidade (com link). O botao "Como seus dados sao tratados" foi removido (duplicava a linha).
- Ferramentas, CSV, SQL, Python: intro de 1 linha; aviso de privacidade virou linha discreta abaixo da ferramenta (`.tool-priv`); seletor de cenario compacto (so nomes) junto do editor; editor + Executar acima da dobra em 1280x800.
- SQL e Python abrem com exemplo pronto no editor, por cenario (troca de cenario/idioma refaz o exemplo enquanto o usuario nao editou). SQL: Executar com o exemplo intocado e o cenario ainda nao carregado carrega o cenario e executa (`pendingRun` em `sql.js`). Python: exemplo com pandas (`read_csv("/data/<tabela>.csv")`) e nota fixa junto ao botao: "primeira execucao baixa ~14 MB (Python 6 MB + pandas 8 MB)".
- Sem mudanca em sandbox, CSP, barreiras, packageManager, canario.
- Textos PT/EN em `hub/assets/js/i18n.js` (removidas: `hub.home.cta2`, `hub.home.tools.p`, `hub.py.ex.note`; novas: `hub.tool.priv`).

## Palavras visiveis (innerText de `<main>`, EN, 1280x800, estado inicial, sem executar)
| Pagina | Antes | Depois |
|---|---|---|
| hub/ | 197 | 64 |
| hub/ferramentas/ | 120 | 46 |
| csv/ | 531 | 439 |
| sql/ | 971 | 834 |
| python/ | 428 | 159 |

CSV e SQL ficaram longe de -50%: o texto restante e conteudo funcional (tabela de colunas e previa no CSV; 11 consultas de exemplo com descricao, 5 exercicios e regra de verificacao no SQL). Cortar mais exige decidir o que esconder (ex.: recolher consultas e exercicios), nao feito.

## Testes alterados (sem enfraquecer)
- `tests/hub/python.js`: PY-01 e PY-07 agora preenchem `print(1 + 1)` antes de executar (o editor abre com pandas); PY-01 ainda confere o estado inicial, agora exigindo o exemplo de pandas.
- `tests/hub/python-pandas.js`: PD-13 confere a nota "~14 MB" no lugar de "3 MB / 8 MB" e nao le mais `pyExNote` (removida); PD-07 passou a exigir que o exemplo pre-carregado seja igual ao do botao.

## Nao verificado
- REG-70 (`reg.js`) falha: o `index.html` da raiz tem dois links para `hub/`; arquivo nao tocado por esta tarefa (falha previa em origin/main, nao investigada).
- O caminho "Executar carrega o cenario e executa" do SQL nao tem teste automatizado; foi conferido por script avulso nos 5 cenarios (EN, Chrome).
- Contraste AA dos novos estilos so pelos testes axe existentes (a11y, sample); sem calculo manual dos pares.
- Executar visivel em 375x667 sem rolar: NAO atingido (Executar fica ~150-250 px abaixo da dobra; ~1,2 a 1,3 telas). Em 1280x800 esta visivel.
- Firefox/WebKit, Safari real, leitor de tela real.
- Suite completa `run-all.sh` (inclui `datasets`) nao rodada de uma vez apos as mudancas; as suites foram rodadas individualmente, em sequencia.
