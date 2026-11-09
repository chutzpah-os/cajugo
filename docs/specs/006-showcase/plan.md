---
spec: 006
status: approved
---

# Plano · 006 Vitrine, catálogo da loja e página do veículo

## Resumo técnico
Novo domínio **`showcase`**: leitura pública de veículos, separada de `vehicles` (que cuida da escrita pela loja). As páginas públicas usam dados com `'use cache'` (tags `vehicles` e `stores`, validade de 60 s) e entregam o conteúdo inteiro no HTML.

Três decisões vêm de medição (build de produção contra o staging, 2026-11-09):
1. **`/loja/[slug]` hoje quebra em produção** para loja existente (`NEXT_STATIC_GEN_BAILOUT`: `params` lido fora de `<Suspense>`). Com `export const instant = false` a página abre. É a 1ª task; `/v/[slug]` nasce assim.
2. **O status HTTP continua 200** mesmo com a rota bloqueante, porque o cabeçalho sai antes de a página decidir. Status real (308/404) é decidido no `proxy.ts`, para `/loja/*` e `/v/*`.
3. **Plano gratuito:** o proxy faria uma consulta por acesso; por isso guarda a resposta em memória por 60 s.

## Impacto
| Camada | Mudança |
|---|---|
| Dados (migration `0011`, aditiva) | `vehicles`: `make_slug`, `model_slug`, `search_text`, `search` (tsvector gerado), `rank_score`; índices GIN em `search`, `(status, rank_score desc, id)`, `(status, price_cents, id)`, `(status, published_at desc, id)`, `(store_id, status, rank_score desc, id)`; regras `installment_down_bps` (2000) e `installment_months` (48) |
| `src/platform/` | `br/installment.ts` (Price); `br/slug.ts` (texto sem acento); `seo/` (títulos, canônica, `Car`/`Offer`, `AutoDealer`, `ItemList`, `BreadcrumbList`, `WebSite`); `http/public-gate.ts` (decisão de status do proxy, com memória de 60 s) |
| `src/domains/showcase/` | `service.ts`, `filters.ts` (URL ↔ filtros), `urls.ts` (endereço do veículo), `current.ts` (cache), `actions.ts` (Carregar mais, contagem ao vivo), `components/` |
| `src/domains/vehicles/` | grava `make_slug`, `model_slug`, `search_text` e `rank_score` ao salvar, publicar e mudar fotos; `listVehicles` paginada |
| `src/domains/settings/` | as duas regras novas, em [4c] |
| `src/proxy.ts` | `/loja/*` e `/v/*` → 308/404 reais; `?ref=` → cookie; `/?filtros` → reescrita para `/vitrine` |
| `src/app/` | `/` (vitrine sem filtros), `/vitrine` (com filtros, interna), `/loja/[slug]`, `/v/[slug]`, `/loja/[slug]/v/[id]` (redireciona), `sitemap` em índice |
| Jobs | nenhum |

## Interfaces dos serviços (módulos profundos)
`showcase/service.ts` (público, sem sessão; saída montada à mão):
```ts
searchShowcase(db, { scope: "showcase" | { storeId }, filters, cursor? }): Promise<{ items: PublicCard[]; total: number; stores: number; nextCursor: string | null }>
countMatches(db, scope, filters): Promise<number>      // "Ver N veículos"
facets(db, scope): Promise<{ makes: { slug; name; count }[] }>
vehiclePage(db, id): Promise<VehiclePage | { unavailable: "sold" | "suspended"; similar: PublicCard[] } | null>
storePage(db, slug): Promise<StorePage | { unavailable: "suspended" } | { redirectTo } | null>
gateDecision(db, path): Promise<"ok" | { redirect: string } | "not-found">   // proxy
sitemapEntries(db, kind): Promise<{ url; lastModified }[]>
```
`filters.ts` (puro): `parseFilters(searchParams)` ignora o que é inválido (SHW-SEC-004); `filtersToQuery`.
`urls.ts` (puro): `vehiclePath(v)` e `idFromVehicleParam(param)`.

## Mapa requisito → solução
| Requisito | Solução |
|---|---|
| SHW-FR-001 | `/` com `searchShowcase` em cache; visível = publicado, divulgado e loja no ar (`LIVE_STATUSES`); `total` e `stores` numa consulta; sem veículos: mensagem e convite, com `robots: noindex` calculado em `generateMetadata` (muda sozinho no 1º veículo) |
| SHW-FR-002 | `/loja/[slug]` com o mesmo `CatalogView`, `scope: { storeId }` (publicados, divulgados ou não); cabeçalho com logo ou sigla |
| SHW-FR-003 | `PublicCard` com capa, contagem de fotos, nomes, anos, km, cidade; parcela por `installment` com as 3 regras; `pickBadge`: 1º de Abaixo da FIPE (`price < fipe_price`), Único dono, Aceita troca, Garantia de fábrica |
| SHW-FR-004 | `search_text` (marca, modelo, versão, sem acento e em minúsculas, feito pela aplicação) e `search` gerado com `to_tsvector('simple', …)`; consulta por prefixo de cada palavra, sem depender da extensão `unaccent` (D3) |
| SHW-FR-005 | `FiltersSheet` (cliente) sobre `<dialog>`; `countMatches` com pausa de 300 ms; estado em `?marca=&preco_de=&preco_ate=&ano_de=&ano_ate=&km_ate=&cambio=&combustivel=&ordem=&q=`; marca por `make_slug` |
| SHW-FR-006 | `ordem` em lista fechada; relevância = `rank_score` (dia da publicação + até 7 pontos de completude: 6 fotos ou mais, descrição, itens), um número só, indexável e estável na paginação |
| SHW-FR-007 | cursor por chave (valor da ordem + `id`); `loadMoreAction`; `listVehicles` usa o mesmo formato; 20 por página |
| SHW-FR-008 | `/v/[slug]` com `vehiclePage`; galeria com rolagem nativa (`scroll-snap`, sem dependência); ficha com `plate_end`; `whatsappLink(contact_whatsapp, texto com veículo e link)`; não divulgado: cabeçalho da loja |
| SHW-FR-009 | `ShareButton` (Web Share, senão copiar, sempre sem `?ref=`); cookie `cajugo_ref` no proxy: 30 dias, `HttpOnly`, formato do código validado, último vence |
| SHW-FR-010 | vendido ou excluído: `unavailable: "sold"` com parecidos (mesma marca, senão mesma cidade), `noindex`, `Offer` `SoldOut` |
| SHW-FR-011 | loja `suspended`: `[12g]` no catálogo e no veículo, sem motivo, `noindex` |
| SHW-FR-012 | sem resultado: sugestões e `noindex`; `error.tsx` com "Tentar de novo"; `loading`/`Skeleton` no formato do card, só nas transições do cliente |
| SHW-FR-013 | funções únicas em `platform/seo`; `Metadata` por página; canônica sem query; `alt` por marca, modelo, ano e cor; capa com `fetchPriority="high"`, demais `lazy` |
| SHW-FR-014 | `proxy.ts` chama `gateDecision`: slug antigo → 308; texto do veículo desatualizado → 308; `/loja/{slug}/v/{id}` → 308; inexistente → reescreve para a 404 com status 404. A página continua decidindo também, como segunda barreira |
| SHW-FR-015 | `generateSitemaps` (estáticas, lojas, veículos) com `sitemapEntries` em cache; tags renovam na mudança |
| SHW-NFR-001 | `audit()` em todas as telas; `lg:` com filtros laterais e 3 colunas |
| SHW-NFR-002 | sem `<Suspense>` em volta do conteúdo indexável; e2e lê o HTML cru com `request.get` |
| SHW-NFR-003 | `/` pré-renderizada; `next/font` (já usa); larguras fixas do Cloudinary; prova no Lighthouse antes do lançamento (013) |
| SHW-NFR-004 | `updateTag("vehicles")` nas ações (005) + validade de 60 s |
| SHW-NFR-005 | dados com `'use cache'`; `/vitrine` compartilha o cache por filtros normalizados; proxy com memória de 60 s |
| SHW-SEC-001 | `PublicCard`/`VehiclePage` montados à mão; a consulta nem seleciona `plate`, `chassis`, `tax_id`; teste procura os valores no HTML, JSON-LD e sitemap |
| SHW-SEC-002 | escopo no `where` da consulta: `share_on_cajugo` na vitrine, `store_id` no catálogo |
| SHW-SEC-003 | filtro único `publicVisible` usado por listagem, sitemap e `countMatches` |
| SHW-SEC-004 | `parseFilters` com listas fechadas e faixas; consultas parametrizadas |
| SHW-SEC-005 | cookie `HttpOnly`, valor só o código; a página nunca lê nem mostra |

## Modelo de dados (migration `0011`, aditiva)
```ts
// vehicles: +
makeSlug: text("make_slug"), modelSlug: text("model_slug"),
searchText: text("search_text").notNull().default(""),
search: tsvector("search").generatedAlwaysAs(sql`to_tsvector('simple', search_text)`),
rankScore: integer("rank_score").notNull().default(0),
// índices: GIN(search); (status, rank_score desc, id); (status, price_cents, id);
//          (status, published_at desc, id); (store_id, status, rank_score desc, id)
// setting_values: installment_down_bps = 2000; installment_months = 48
```
Veículos que já existirem recebem os campos novos na migração por um script único da aplicação (a normalização sem acento é feita no código). Staging e prod são conferidos antes.

## Testes
- **Unitários:** `parseFilters`, `vehiclePath`/`idFromVehicleParam`, `installment` (Price), `pickBadge`, funções de SEO, `gateDecision` com memória.
- **Integração (PGlite):** FR-001 a FR-007, FR-010, FR-011, FR-015 e SEC-001 a SEC-004 pelo serviço, com busca sem acento e paginação sem repetição em cada ordem.
- **Build de produção:** `pnpm e2e` ganha uma etapa contra o servidor standalone para o que o modo de desenvolvimento não revela: status 308/404, `/loja/*` e `/v/*` renderizando.
- **Ponta a ponta (390 px e 1280 px):** vitrine, filtros na URL, carregar mais, veículo, compartilhar, `?ref=`, vendido, suspensa, HTML cru com título, canônica, JSON-LD e OG, `audit()`.

## Riscos e alternativas descartadas
- **Só `instant = false` para o status real:** medido, continua 200.
- **Consulta no proxy sem memória:** uma ida ao banco por acesso público, contra a cota gratuita.
- **`unaccent` do Postgres:** a extensão precisaria existir igual no Supabase e no PGlite dos testes; normalizar na aplicação é igual nos dois (D3).
- **Biblioteca de carrossel:** `scroll-snap` nativo resolve sem dependência nem JavaScript.
- **Risco:** memória do proxy atrasa em até 60 s um redirecionamento novo. É o mesmo limite de atualização das páginas (PRD §5.3).
- **Risco:** a reescrita de `/?filtros` depende do proxy; se ele falhar, a pessoa vê a vitrine sem filtro, nunca um erro.

## Decisões (aprovadas)
- **D1. Vitrine com filtros numa rota interna:** `/` sem filtros fica pré-renderizada (melhor velocidade, principal página de SEO), e `/?marca=…` é reescrita pelo proxy para `/vitrine`, com o endereço visível igual. Recomendo. A alternativa é uma rota só, sempre calculada no servidor, mais lenta no primeiro acesso.
- **D2. Status real no `proxy.ts`** com memória de 60 s. Recomendo; é a única forma medida que devolve 308/404 de verdade. Muda `SEO.md` e o PLAN, que tratavam isso como opção.
- **D3. Busca sem `unaccent`:** o ARCHITECTURE previa a extensão; a alternativa é `search_text` normalizado pela aplicação. Recomendo.

## Conformidade
- [x] Todo requisito da spec aparece no mapa requisito → solução (15 FR, 5 NFR, 5 SEC)
- [x] Actions seguem o `API.md` §2: só leitura pública; filtros por schema; saída montada à mão; paginação por cursor, 20 por página
- [x] Toda action/rota com id checa a posse: páginas públicas só expõem o visível (`publicVisible`); `listVehicles` continua com a loja da sessão
- [x] Schemas de entrada não aceitam campos privilegiados
- [x] Dados pessoais: nada novo em página pública; cookie `cajugo_ref` só com o código, a incluir no texto de privacidade [12i]
- [x] Formulário público com honeypot + rate limit: não há formulário nesta spec
- [x] Consultas novas têm índice previsto
- [x] Migrations aditivas
- [x] Nada do Supabase além de Postgres e Auth
- [x] D1–D3 aprovadas nas opções recomendadas (2026-11-09, ao iniciar o `/implement`); D3 atualiza o ARCHITECTURE na T002
