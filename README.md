# Lucas Delfino · Portfólio de Business Intelligence

Site pessoal de portfólio com projetos de Power BI, SQL e Python aplicados a Crédito & Cobrança.

> "Dez anos cobrando dívidas. Hoje, cobro respostas dos dados."

## Visão geral

Site estático (HTML, CSS e JavaScript puro), sem build e sem dependências. Basta abrir o `index.html` no navegador.

| Seção | O que mostra |
|---|---|
| Hero | Apresentação, foto, selo PL-300 e números-chave |
| Portfólio | Projetos organizados em trilhas, com índice fixo e filtro por ferramenta |
| Case técnico | Página de detalhe de cada projeto (`#/case/<slug>`): pergunta, dados, construção, resultado |
| Trajetória | Linha do tempo de Operação → Dados |
| Stack & credenciais | Ferramentas, domínio de negócio, formação e certificações |
| Contato | E-mail, LinkedIn e GitHub |

## Estrutura

```
.
├── index.html              # Estrutura da página
├── assets/
│   ├── css/styles.css      # Tokens de identidade visual + estilos
│   ├── js/data.js          # ✏️ CONTEÚDO: projetos, trilhas e trajetória
│   ├── js/app.js           # Renderização, rotas, tema e interações
│   └── img/                # Foto, favicon e capas dos projetos
├── docs/
│   ├── EDITANDO-CONTEUDO.md   # Como adicionar/editar projetos
│   ├── IDENTIDADE-VISUAL.md   # Paleta, tipografia e regras de uso
│   └── ROADMAP.md             # Próximos passos
└── CHANGELOG.md
```

## Rodando localmente

```bash
# qualquer servidor estático serve, por exemplo:
python -m http.server 8000
# abra http://localhost:8000
```

## Editando o conteúdo

Todo o conteúdo dos projetos fica em [`assets/js/data.js`](assets/js/data.js). Veja o passo a passo em [docs/EDITANDO-CONTEUDO.md](docs/EDITANDO-CONTEUDO.md).

## Deploy

Recomendado: **Vercel** conectado a este repositório (deploy automático a cada push e link de pré-visualização por Pull Request).
Alternativa: **GitHub Pages** em *Settings → Pages → Deploy from branch → `main` / root*.

## Contato

- LinkedIn: [/in/lucasdelfino-](https://www.linkedin.com/in/lucasdelfino-/)
- E-mail: lucasdelfino91@hotmail.com
