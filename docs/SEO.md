# SEO

> **O SEO é o principal ativo do CajuGo.** É pela busca (Google e outros) que compradores descobrem os veículos, as lojas e os serviços (Catálogo, Rede Caju, Caju Indica). Toda página pública é pensada primeiro para ser encontrada, entendida e clicada.
>
> **Este arquivo é lido pelo Claude Code.** As seções marcadas com 🤖 são obrigatórias em qualquer página pública.

## 1. O que precisa ranquear
| Página | Busca que ela atende | Exemplo |
|---|---|---|
| Veículo [1b] | "fiat 500 2015 são josé do rio preto" | `/v/{id}-fiat-500-2014-sao-jose-do-rio-preto-sp` |
| Catálogo da loja [1a] | "auto center silva campinas", "seminovos campinas" | `/loja/{slug}` |
| Vitrine [1a] | "carros usados", "seminovos à venda" | `/` |
| Páginas de descoberta (marca, modelo, cidade) | "fiat 500 usado", "carros usados em campinas" | `/carros/fiat/500`, `/carros/campinas-sp` |
| Landing do lojista [5b], Rede Caju [7a], Caju Indica [8c] | "catálogo de carros para loja", "vender carros como autônomo" | `/lojistas`, `/rede`, `/indica` |

## 2. Regras técnicas 🤖
- **Renderizado no servidor:** toda página pública chega com o conteúdo no HTML (SSR/ISR, nunca só no navegador). O que lê sessão fica atrás de `<Suspense>` e fora do conteúdo indexável.
- **Título e descrição únicos** por página, montados por uma função só (`src/platform/seo/`):
  - veículo: `{Marca} {Modelo} {Versão} {Ano} – {Cidade}/{UF} | CajuGo` · descrição com preço, km, câmbio e loja;
  - loja: `{Loja} – Carros usados e seminovos em {Cidade}/{UF} | CajuGo`;
  - descoberta: `{Marca} {Modelo} usados à venda {em Cidade} | CajuGo`.
- **URL amigável e estável:** minúsculas, sem acento, com hífen; o id garante unicidade e o texto ajuda a busca. Se o texto mudar (ex.: o lojista corrige o modelo), a URL antiga faz 301 para a nova.
- **Canônica:** um veículo aparece na vitrine e no catálogo da loja; a `canonical` aponta para **uma** URL (a da vitrine, se o veículo é divulgado na CajuGo; senão, a da loja). Parâmetros de filtro, ordenação, paginação e `?ref=` do vendedor nunca entram na canônica.
- **Dados estruturados (schema.org, JSON-LD):** `Car` + `Offer` (preço, moeda, disponibilidade) no veículo; `AutoDealer` (nome, cidade, telefone, horário) na loja; `BreadcrumbList` em todas; `ItemList` nas listagens; `Organization` + `WebSite` com `SearchAction` na home.
- **Prévia de link (Open Graph):** título, descrição e foto de capa do veículo/loja em `og:*` e `twitter:*`. Links compartilhados no WhatsApp e no Instagram são o canal nº 1 do lojista e do vendedor.
- **Imagens:** `alt` gerado a partir de marca, modelo, ano e cor; tamanhos responsivos pelo Cloudinary (`f_auto,q_auto`); capa com prioridade de carregamento; o resto com lazy-load.
- **Indexação:**
  - `sitemap.xml` índice com sitemaps de veículos, lojas e páginas de descoberta, atualizado a cada publicação/venda;
  - `robots.txt` bloqueia `/painel`, `/rede` (área logada), `/indica` (área logada), `/admin`, `/entrar`, `/api`;
  - páginas logadas, de filtro sem resultado e de prévia da Vercel com `noindex`;
  - veículo **vendido**: continua respondendo (tela [12d] com parecidos), com `noindex` e `Offer` como `SoldOut`; sai do sitemap.
- **Desempenho (Core Web Vitals):** LCP < 2,5 s em 4G, CLS < 0,1, INP < 200 ms nas páginas públicas. Fontes por `next/font`, sem layout shift.
- **Conteúdo útil, não duplicado:** a descrição do veículo vem do lojista; a página soma ficha técnica, itens, cidade e loja. Páginas de descoberta só existem com pelo menos 1 veículo (sem página vazia indexada).
- **Links internos:** veículo → loja, → mesma marca/modelo, → mesma cidade; loja → veículos; descoberta → veículos; breadcrumbs em tudo.

## 3. Domínio
- O endereço `cajugo.vercel.app` não acumula autoridade para um domínio nosso; quanto antes o domínio próprio (`cajugo.com.br`, ~R$ 40/ano) estiver no ar, melhor para o SEO. Ao trocar, todo endereço antigo faz 301 para o novo (`DEPLOYMENT.md`).
- Lojas por caminho, `cajugo.com.br/loja/{slug}` (ADR 0009): a autoridade de todas as lojas soma no domínio principal (subdomínio seria tratado pelo Google como site separado), e o prefixo `/loja/` evita colisão com rotas do sistema e separa as lojas no sitemap e no Search Console.

## 4. Medição (gratuita)
- **Google Search Console** e **Bing Webmaster Tools** verificados no domínio de produção, com o sitemap enviado.
- Acompanhar: páginas indexadas, cliques, impressões e posição por tipo de página; Core Web Vitals do Search Console.

## 5. Testes 🤖
- Unitário: funções de título, descrição, slug de URL, canônica e JSON-LD (com os IDs de requisito da spec).
- e2e: cada tipo de página pública tem `<title>`, `meta description`, `canonical`, JSON-LD válido e conteúdo principal no HTML recebido (sem depender de JavaScript).
- Antes do lançamento (spec 013): auditoria completa de SEO das páginas públicas.

## 6. Checklist por página pública 🤖
- [ ] Conteúdo principal no HTML do servidor
- [ ] Título e descrição únicos pela função de SEO
- [ ] URL amigável; canônica correta; parâmetros fora da canônica
- [ ] JSON-LD do tipo da página + `BreadcrumbList`
- [ ] Open Graph com imagem
- [ ] `alt` nas imagens; capa priorizada
- [ ] Entra no sitemap certo (ou `noindex`, se não deve ser indexada)
- [ ] Links internos para páginas relacionadas
