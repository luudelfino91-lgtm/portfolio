# Infrastructure Costs: Data & AI Community Hub

Fase 1 (Architecture) · Data de referência: 2026-11-12 · Status: proposta, reconciliada com `docs/decisions/phase-1-reconciliation.md`. O documento arquitetural vinculante é `solution-architecture.md` (M7).

Legenda: **[V]** lido nesta sessão em URL **primária** · **[C]** lido no código · **[S]** suposição ou não verificado. Espelhos de terceiros e dados de API não reproduzida são [S] (C8).

**Suposições explícitas:** D2 (GitHub Pages) e D3 (arquivos próprios em vez de CDN) estão **pendentes**; todo custo abaixo supõe ambas. D5 (PIX) bloqueia a Fase 6 e D8 (backend) a Fase 7. A conclusão "custo recorrente US$ 0" é **condicionada à verificação dos termos do GitHub Pages (P6)**: a página de limites lida nesta sessão não declara gratuidade.

Aviso: só os limites do GitHub Pages foram verificados na fonte oficial. Preços e limites de Cloudflare Pages, Netlify, Vercel, domínios e Actions **não foram verificados** nesta sessão (consultas bloqueadas por falta de aprovação de permissão). Nenhum valor monetário de terceiros está escrito aqui para não citar de memória. Antes de qualquer migração ou contratação, preencher a tabela de pendências (seção 8).

---

## 1. Resumo executivo

| Item | Custo recorrente | Observação |
|---|---|---|
| Hospedagem no GitHub Pages | **US$ 0** [S: gratuidade para repositório público não foi lida na página de limites] | Sujeita a limites brandos (seção 2). |
| Bibliotecas (sql.js, Papa Parse, Pyodide) | **US$ 0** | Software livre [S: licenças a confirmar]. Servidas pelos arquivos próprios. |
| Fontes locais | **US$ 0** | Licença livre [S: confirmar]. |
| Contribuição PIX estática | **US$ 0** de infraestrutura | Taxas de PIX para pessoa física não analisadas [S]. Sem backend. |
| Domínio próprio | **Custo recorrente > 0** (anuidade) | Está no ROADMAP v1.2 [C]. Viola "custo zero"; opcional e exige aprovação. Valor não pesquisado. |
| CI (GitHub Actions) opcional | Gratuito em repositório público [S] | Só validação, sem build. |
| Qualquer serviço externo novo | Proibido sem aprovação | Documentação obrigatória na seção 6. |

Conclusão (condicional): **se** os termos do GitHub Pages confirmarem a gratuidade para este repositório (P6, não verificado) e D2 e D3 forem aprovados, a arquitetura recomendada tem custo recorrente de infraestrutura de US$ 0. Sem essa verificação, "US$ 0" é uma hipótese [S]. Ressalva adicional: domínio próprio (anuidade).

---

## 2. GitHub Pages: limites verificados [V] (suposição D2)

Fonte primária, relida nesta sessão: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

Trechos lidos em 2026-11-12 (N6/C10.5): "Published GitHub Pages sites may be no larger than 1 GB."; "GitHub Pages sites have a *soft* bandwidth limit of 100 GB per month."; "GitHub Pages sites have a *soft* limit of 10 builds per hour." (não se aplica a build e publicação por workflow customizado de GitHub Actions). Tamanho do sql.js: https://data.jsdelivr.com/v1/packages/npm/sql.js@1.15.0?structure=flat devolveu `/dist/sql-wasm.wasm` 684,897 bytes e `/dist/sql-wasm.js` 46,635 bytes (731.532 B).

| Limite | Valor | Tipo |
|---|---|---|
| Tamanho do site publicado | 1 GB | máximo |
| Repositório-fonte | 1 GB | recomendado |
| Banda | 100 GB/mês | **brando** |
| Builds | 10 por hora | brando; não se aplica a workflow customizado de GitHub Actions |
| Timeout de deploy | 10 minutos | , |
| Respostas por rate limit | HTTP 429 | , |
| Contas | um site de usuário ou organização por conta | , |
| Uso proibido | hospedar negócio online, e-commerce ou SaaS comercial; proibidas transações sensíveis (senhas, cartões) | política |
| Se exceder | o GitHub pode parar de servir o site ou contatar o dono (sugere CDN de terceiros ou outro host) | consequência |

Gratuidade, termos de serviço completos e a interpretação sobre contribuição voluntária **não constam** do que foi lido (P6).

Limite brando significa que o GitHub pode reagir (aviso ou restrição) se ultrapassado, sem preço definido na página [S, interpretação].

### 2.1 Estimativa de consumo de banda (aritmética sobre tamanhos verificados)

Premissas: sem cache do navegador e sem compressão (pior caso), 1 GB = 1.000 MB.

| Cenário | Peso por carga | Cargas para consumir 100 GB/mês |
|---|---|---|
| Laboratório SQL (sql.js 1.15.0: 731.532 B [V]) | ~0,73 MB | ~137.000 |
| Papa Parse (19.012 B [S]) | ~0,02 MB | ~5.260.000 |
| DuckDB-WASM, bundle eh (36.718.970 B [S]) | ~36,7 MB | ~2.700 |
| Pyodide | não medido [S] | a calcular com a Fase 4 |
| Shell do Hub (meta provisória C3: ≤ 150 KB sem fontes e imagens; fontes ≤ 120 KB à parte) | ~0,15 MB (+ até ~0,12 MB de fontes) | ~667.000 só shell |

Leitura: com sql.js e o shell, o limite brando é improvável para um hub comunitário de porte pequeno. **DuckDB-WASM consome a banda com ordem de grandeza menor** (~2.700 cargas/mês no pior caso) e é desaconselhado na v1. Pyodide é a incógnita e define o risco real (R1 em `solution-architecture.md`). O cache do navegador reduz o consumo em visitas repetidas, mas o `Cache-Control` do Pages não é configurável [S].

### 2.2 Tamanho do repositório

- Cada versão de WASM commitada permanece no histórico do Git. Aritmética: vendor completo do DuckDB-WASM com `mvp` e `eh` e seus workers ≈ 78,9 MB por versão (41.325.187 + 35.913.747 + 839.642 + 773.223 + 32.000 bytes); só `eh` ≈ 36,7 MB.
- Orçamento proposto de vendor: abaixo de 300 MB acumulados, de modo a ficar bem abaixo do 1 GB recomendado, deixando espaço para imagens do portfólio (que já existem) e o conteúdo do Hub.
- O tamanho atual do repositório e do site publicado **não foi medido** nesta sessão (sem acesso a shell). Registrar na Fase 2.
- Limite por arquivo do Git e comportamento de LFS **não verificados** [S].

---

## 3. Custo recorrente de cada opção

| Opção | Custo recorrente | Limites | Privacidade | Veredito |
|---|---|---|---|---|
| **Arquivos próprios em GitHub Pages** (recomendada) | US$ 0 [S] | 1 GB site, 100 GB/mês brando [V] | Visitante contacta só GitHub; GitHub pode registrar acessos [S] | Padrão |
| CDN pública para bibliotecas (ex.: jsDelivr) | US$ 0 [S, política da CDN não lida] | Política da CDN não verificada | IP do visitante vai a um terceiro [S] | Só por exceção D3 |
| Google Fonts | US$ 0 [S] | , | Visitante contacta Google [S] | Só no portfólio atual (não alterado); fora do Hub |
| Fontes locais | US$ 0 | Contam no tamanho do site | Sem terceiros | Padrão do Hub |
| Domínio próprio | Anuidade (valor não pesquisado) | , | Neutro | Opcional; exige aprovação |
| Cloudflare Pages | **não verificado** | **não verificado** | **não verificado** | Plano B (seção 5) |
| Netlify | **não verificado** | **não verificado** | **não verificado** | Plano B |
| Vercel (citado no README) [C] | **não verificado** | **não verificado** | **não verificado** | Plano B; README precisa ser atualizado |
| Backend / API / banco | **Fora do escopo (D8)** | , | , | Proibido sem aprovação |
| LLM local no navegador | US$ 0 de servidor, mas modelo vem de host externo [S] | Centenas de MB a GB [S] | Download externo | Fora da v1; exige aprovação |

---

## 4. Privacidade

| Tópico | Situação | Ação |
|---|---|---|
| Processamento de dados do usuário (CSV, SQL, Python) | Local, no navegador; nenhum dado enviado a servidor [arquitetura] | Aviso claro na interface (PT/EN). |
| Requisições a terceiros no Hub | Zero por projeto, a verificar com a aba de rede a cada release | Checklist de release. |
| Fontes | Google Fonts expõe IP ao Google [S]; páginas do Hub usam fontes locais (se D3 aprovado) | O portfólio mantém Google Fonts (C9); "zero requisição externa" vale só para o Hub. |
| Logs do GitHub Pages | GitHub é o operador do servidor e pode registrar acessos [S, política não lida] | Declarar na página de privacidade do Hub. |
| `localStorage` | Chaves `ld-theme`, `ld-lang` (portfólio) [C]; Hub usa `hub-*`. Mesma origem entre todos os sites de projeto da conta [S] | Nunca guardar dado pessoal. |
| Analytics | Nenhum previsto | Qualquer analytics (mesmo "gratuito") é serviço externo: regra de custo, seção 6. |
| PIX | Chave exposta no repositório e na página [S] | Preferir chave aleatória; Lucas decide. Não gravar CPF. Sem confirmação de pagamento (sem backend), logo sem dados de doadores. |
| LGPD/GDPR | Sem coleta de dados pessoais no Hub; o e-mail de contato do portfólio já é público [C] | Revisão jurídica não feita [S]. |

**Ponto de política do Pages (risco R2).** A página de limites proíbe hospedar negócios online, e-commerce e SaaS comercial [V]; a expressão "primariamente para transações comerciais" vem de leitura anterior e é [S]. Contribuição voluntária via PIX, sem venda, sem paywall e com conteúdo gratuito, parece diferente de e-commerce, mas **a interpretação não é minha para decidir** e não foi confirmada com o GitHub. Recomendação: manter a contribuição discreta e secundária, sem contrapartida comercial, e registrar o plano de migração (seção 5) caso o GitHub discorde.

---

## 5. Alternativas de migração

Premissa técnica: o Hub é só arquivos estáticos com **caminhos relativos** (`solution-architecture.md`, seção 5). Migrar para outro host estático exige copiar a pasta, sem reescrever código.

| Destino | Ganha | Perde ou risco | Verificação pendente |
|---|---|---|---|
| **GitHub Pages** (atual, D2) | Zero configuração; mesmo repositório; domínio `github.io` | Sem cabeçalhos; limites brandos; política comercial | , |
| **Cloudflare Pages** | Em geral permite arquivo `_headers` (COOP/COEP, CSP, cache longo) [S] | Conta e serviço novos; limites de arquivo e de builds não verificados | Limites atuais, preço, tamanho máx. por arquivo |
| **Netlify** | `_headers` ou `netlify.toml` [S] | Conta nova; limites de plano gratuito não verificados | Limites e política de uso |
| **Vercel** | Deploy por PR (README sugere) [C] | Termos do plano gratuito para uso não comercial [S]; conta nova | Termos, limites |
| **Domínio próprio sobre qualquer host** | URL estável independente do host | Custo anual | Preço do registrador |
| **Self-host** | Controle total | Servidor, custo, operação | Fora do escopo |

Gatilhos para considerar migração:

1. Necessidade real de COOP/COEP (por exemplo DuckDB-WASM multi-thread).
2. Banda perto de 100 GB/mês ou aviso do GitHub.
3. Questionamento do GitHub sobre a contribuição PIX.
4. Necessidade de cache imutável para WASM grande.

Passos de migração (resumo): publicar o repositório no novo host; manter URLs relativas; adicionar `_headers` se for o motivo; atualizar `canonical` e `og:url`, **o que altera páginas atuais e exige aprovação**; manter redirecionamento no GitHub Pages antigo por tempo definido [S].

---

## 6. Documentação exigida para qualquer serviço novo

Nenhum serviço externo é proposto neste documento. Antes de propor qualquer serviço (hospedagem, CDN, analytics, domínio, API, banco, formulário, IA), preencher **todos** os campos abaixo e submeter ao Lucas. Sem os oito campos preenchidos e a aprovação, não entra no plano.

| # | Campo | Conteúdo mínimo |
|---|---|---|
| 1 | Necessidade | Por que é necessário; qual requisito do Hub não é atendido sem ele. |
| 2 | Alternativas gratuitas | Pelo menos duas, incluindo "não fazer" e a opção sem serviço; por que foram descartadas. |
| 3 | Custo recorrente | Valor mensal e anual, moeda e data da consulta; custo de saída. "Gratuito" exige citar o plano. |
| 4 | Limites de uso | Cotas, rate limits, tamanhos máximos, política de uso aceitável; o que acontece ao exceder (bloqueio, cobrança, degradação). |
| 5 | Privacidade | Dados que saem do navegador; operador e jurisdição; logs e retenção; cookies; impacto em LGPD/GDPR. |
| 6 | Migração | Como sair: formato dos dados, esforço, tempo, riscos de lock-in; alternativa nomeada. |
| 7 | Fonte e verificação | URL da página oficial de preço e limites e data da leitura. |
| 8 | Aprovação | Registro da decisão do Lucas (data e escopo). |

Gate adicional para **bibliotecas**: licença lida no arquivo original; versão fixada; hash SHA-256; tamanho; data de verificação (`vendor/manifest.json`).

### Exemplo preenchido (ilustrativo, ainda não aprovado): "CDN pública para Pyodide"

| Campo | Resposta |
|---|---|
| Necessidade | Só se o Pyodide medido exceder o orçamento de repositório/banda (pendência P1). |
| Alternativas gratuitas | Arquivos próprios com núcleo mínimo; MicroPython (sem pandas); não oferecer Python. |
| Custo recorrente | A verificar; política da CDN não lida. |
| Limites | A verificar. |
| Privacidade | IP do visitante vai ao operador da CDN [S]. |
| Migração | Trocar a URL base por arquivos próprios (um ponto de configuração em `vendor/manifest.json`). |
| Fonte | Pendente. |
| Aprovação | Pendente. |

---

## 7. Cenários de custo total

| Cenário | Composição | Recorrente | Risco principal |
|---|---|---|---|
| **A, recomendado** | Pages + arquivos próprios + sql.js + Papa Parse + fontes locais + PIX estático; Pyodide próprio se couber | US$ 0 [S] | Peso do Pyodide; política do Pages |
| **B** | A + Pyodide por CDN pública | US$ 0 [S]; adiciona terceiro | Privacidade; exceção D3 |
| **C** | A + domínio próprio | Anuidade | Viola "custo zero", precisa aprovação |
| **D** | Migração para host com cabeçalhos | A verificar | Nova conta e termos |
| **E** | DuckDB-WASM adicionado | US$ 0, mas ~36,7 MB por carga e por versão no repositório | Banda e histórico |

---

## 8. Pendente de verificação

Além de P1 a P8: releases do GitHub de sql.js e Papa Parse e metadados jsDelivr de Papa Parse e DuckDB-WASM não foram lidos nesta rodada (P9); seus números estão como [S].

| ID | Pendência | Por que importa |
|---|---|---|
| P1 | Tamanho do Pyodide 314.x e do conjunto mínimo (blog e página de deploy oficiais não lidos; versão 314.0 só por espelho, [S]) | Define cenário A ou B |
| P2 | Licenças reais (sql.js, Papa Parse, Pyodide, DuckDB-WASM, fontes) | Gate de vendor |
| P3 | Cabeçalhos reais do Pages: MIME `.wasm`, compressão, `Cache-Control` | Banda e carregamento |
| P4 | Limites e preços de Cloudflare Pages, Netlify, Vercel e domínios | Plano B |
| P5 | Limite de arquivo do Git; LFS com Pages | Política de arquivos grandes |
| P6 | Gratuidade e termos do Pages para este repositório; leitura dos termos sobre contribuição | Premissa de custo zero e risco R2 |
| P7 | Tamanho atual do repositório e do site | Linha de base do orçamento |
| P8 | Custo de GitHub Actions em repositório público | Só se CI for aprovado |
