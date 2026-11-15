---
spec: 006b
status: approved
---

# Plano · 006b Páginas de descoberta por marca, modelo e cidade

## Resumo técnico
Tudo dentro do domínio `showcase`: um novo escopo de busca (`{ discovery: { makeSlug?, modelSlug?, citySlug? } }`) sobre a mesma regra `publicVisible("showcase")`, reaproveitando `searchShowcase`, `countMatches`, `facets`, `CatalogView` e "Carregar mais" da 006. Três rotas finas em `/carros`, status real (404) decidido no `proxy.ts` como em `/loja` e `/v` (ADR 0013), endereços definidos no ADR 0014. A cidade ganha um trecho de endereço gerado no banco (`stores.city_slug`); a marca ganha nome corrigido (`brandName`) que passa a valer também para `make_slug`.

## Impacto
| Camada | Mudança |
|---|---|
| Dados (migration `0012`, aditiva) | `stores.city_slug` gerado (`{cidade sem acento}-{uf}`) + índice `(city_slug, status)`; índice `vehicles (make_slug, model_slug)` (migration `0013`); `make_slug` recalculado só para as marcas corrigidas que mudam o endereço (`gm-chevrolet` → `chevrolet`, `vw-volkswagen` → `volkswagen` na `0012`; `kia-motors` → `kia`, `caoa-chery-chery` → `caoa-chery` na `0014`, esquecidas na `0012` e achadas no `/verify`; um teste compara a lista de correções com as migrations) |
| `src/domains/fipe/` | `brandName(make)`: lista de correções dos nomes da FIPE (DSC-FR-011) |
| `src/domains/vehicles/` | `syncSearchFields` grava `make_slug = slugify(brandName(make))` |
| `src/domains/showcase/` | `discovery-urls.ts` (puro: lê e monta `/carros/...`); no `service.ts`: escopo `discovery`, `discoveryPage`, `discoveryIndex`, `discoveryLinks`, `gateDecision` para `/carros/*`, `sitemapEntries(db, "discovery")`; facets com `brandName`; `current.ts` com as leituras em cache; actions passam a receber a origem da lista (`source`) em vez de `store`; componentes `DiscoveryView`, `Breadcrumbs`, `RelatedLinks` |
| `src/platform/seo/` | `discoveryTitle`, `discoveryDescription`, `discoveryIntro`; `SITEMAP_IDS` com `discovery` |
| `src/proxy.ts` | `/carros/*` passa pelo `gateDecision` (404 real para o que nunca existiu) |
| `src/app/` | `/carros` (índice), `/carros/[first]`, `/carros/[first]/[second]`; links na vitrine, no veículo e no catálogo da loja |
| `src/ui/` | nada novo |
| Jobs | nenhum |

## Interfaces dos serviços (módulos profundos)
`showcase/discovery-urls.ts` (puro):
```ts
parseDiscoveryPath(segments: string[]): DiscoveryKey | null
// ["fiat"] → { makeSlug: "fiat" }; ["fiat","argo"] → { makeSlug, modelSlug };
// ["campinas-sp"] → { citySlug }; ["campinas-sp","fiat"] → { citySlug, makeSlug }; inválido → null
discoveryPath(key: DiscoveryKey): string
```
`showcase/service.ts` (público, sem sessão; saída montada à mão):
```ts
type Scope = "showcase" | { storeId } | { discovery: DiscoveryKey }
discoveryPage(db, key): Promise<
  | { kind: "listing"; path; names: { make?; model?; city?; state? }; crumbs: { name; path }[];
      stats: { total; stores; cities; minPriceCents; maxPriceCents } }
  | { kind: "empty"; path; names; crumbs; fallback: { key: DiscoveryKey | null; name } }
  | null>                                                   // null = nunca existiu → 404
discoveryIndex(db): Promise<{ makes: { path; name; count }[]; cities: { path; name; state; count }[] }>
discoveryLinks(db, v: { makeSlug; modelSlug; citySlug }): Promise<{ name; path }[]>   // só páginas com veículos
gateDecision(db, path)        // agora também /carros/*
sitemapEntries(db, "discovery")
```
A lista da página reusa `searchShowcase(db, { scope: { discovery: key }, filters })`; o escopo vira condições extras dentro de `publicVisible("showcase")`, então nenhuma consulta de descoberta escapa da regra da vitrine (DSC-SEC-001).

## Mapa requisito → solução
| Requisito | Solução |
|---|---|
| DSC-FR-001 | `/carros/[first]` com `{ makeSlug }`; `discoveryPage` + `searchShowcase` no escopo `discovery` |
| DSC-FR-002 | `/carros/[first]/[second]` com `{ makeSlug, modelSlug }` (filtro por `vehicles.model_slug`) |
| DSC-FR-003 | `{ citySlug }` e `{ citySlug, makeSlug }`, filtrando por `stores.city_slug` |
| DSC-FR-004 | `DiscoveryView` usa `CatalogView` + `CatalogToolbar` + `FiltersSide` com `basePath` = endereço da página; marca fixa esconde a seção Marca dos filtros (`lockMake`); canônica sem query; actions recebem `source: { kind: "discovery", path }`, resolvido no servidor por `parseDiscoveryPath` |
| DSC-FR-005 | `discoveryPage` → `kind: "empty"` quando a página já existiu (D2) mas está sem veículos: mensagem + lista da página acima (`fallback`), `robots: noindex` em `generateMetadata`; volta sozinha pela renovação do cache |
| DSC-FR-006 | `discoveryTitle`/`discoveryDescription`/`discoveryIntro` em `platform/seo` a partir de `names` e `stats` (uma consulta de agregação: total, lojas, cidades, mín. e máx. de preço) |
| DSC-FR-007 | `crumbs` montados no serviço; `Breadcrumbs` visível + `breadcrumbJsonLd` |
| DSC-FR-008 | `vehiclePage` passa a devolver `makeSlug`, `modelSlug`, `citySlug`; a página chama `cachedDiscoveryLinks` e mostra `RelatedLinks` |
| DSC-FR-009 | `storePage` devolve `citySlug`; catálogo mostra o link da cidade se `discoveryLinks` o devolver |
| DSC-FR-010 | `SITEMAP_IDS` + `discovery`; `sitemapEntries(db, "discovery")` lista `/carros` (só com veículos na vitrine; vazio, fica fora do Google e do sitemap) e as páginas com veículos (mesmas consultas do índice + modelos e marca na cidade), com `lastModified` do veículo mais recente |
| DSC-FR-011 | `fipe.brandName(make)`: tabela de correções (prefixo "GM - ", "VW - ", nomes em maiúsculas conhecidos); `make_slug = slugify(brandName(make))`; facets e títulos mostram `brandName` |
| DSC-FR-012 | `parseDiscoveryPath`: 1º segmento termina em `-{uf}` com UF da lista das 27 → cidade; senão marca; segmento só `[a-z0-9-]{1,60}`; ADR 0014 |
| DSC-FR-013 | `/carros` (sem parâmetros, pré-renderizada) com `discoveryIndex`; `ShowcaseView` ganha os links "Buscar por marca" e "Buscar por cidade" (`/carros#marcas`, `/carros#cidades`) |
| DSC-NFR-001 | mesmo layout da vitrine (folha no celular, lateral no desktop); `audit()` em 390 e 1280 px |
| DSC-NFR-002 | sem `<Suspense>` no conteúdo; e2e lê o HTML cru |
| DSC-NFR-003 | mesmas imagens e card da vitrine; medição no build de produção como na 006 |
| DSC-NFR-004 | leituras em `'use cache'` com as tags `vehicles`, `stores`, `settings` (renovadas nas ações) e validade de 30 s |
| DSC-NFR-005 | número de páginas limitado por marcas × cidades com estoque; entradas de cache por endereço normalizado; `/carros` pré-renderizada |
| DSC-SEC-001 | escopo `discovery` só acrescenta condições a `publicVisible("showcase")`; índice, links e sitemap usam a mesma regra |
| DSC-SEC-002 | contagens, faixa de preço e existência de lista vêm da consulta com `share_on_cajugo`; teste com veículo não divulgado como único do modelo |
| DSC-SEC-003 | cards e agregações montados à mão; nenhuma consulta seleciona `plate`, `chassis`, `tax_id`; teste procura os valores no HTML, JSON-LD e sitemap |
| DSC-SEC-004 | `parseDiscoveryPath` rejeita o que não é `[a-z0-9-]`; o banco só recebe slugs validados, por parâmetro; nunca existiu → `gateDecision` reescreve para a 404 |

## Modelo de dados
```ts
// src/platform/db/schema.ts (stores)
citySlug: text("city_slug").generatedAlwaysAs(
  sql`trim(both '-' from regexp_replace(translate(lower(city), ${ACCENTS_FROM}, ${ACCENTS_TO}), '[^a-z0-9]+', '-', 'g')) || '-' || lower(state)`,
),
// índices
index("stores_city_slug_idx").on(t.citySlug, t.status),
index("vehicles_make_model_slug").on(t.makeSlug, t.modelSlug), // 0013
```
```sql
-- drizzle/0012_discovery.sql (aditiva)
ALTER TABLE stores ADD COLUMN city_slug text GENERATED ALWAYS AS (...) STORED;
CREATE INDEX stores_city_slug_idx ON stores (city_slug, status);
-- 0013: CREATE INDEX vehicles_make_model_slug ON vehicles (make_slug, model_slug);
-- marcas com nome corrigido (DSC-FR-011): só o slug muda, o nome da FIPE fica
UPDATE vehicles SET make_slug = 'chevrolet' WHERE make_slug = 'gm-chevrolet';
UPDATE vehicles SET make_slug = 'volkswagen' WHERE make_slug = 'vw-volkswagen';
```
O teste de migration compara a coluna gerada com `slugify` da aplicação para **todas** as cidades de `platform/geo/cities.ts` (D1).

## Estratégia de testes
| Requisito | Unitário | Integração (PGlite) | e2e |
|---|---|---|---|
| DSC-FR-001, 002, 003 | `parseDiscoveryPath`, `discoveryPath` | `discoveryPage` + `searchShowcase` por marca, modelo, cidade, marca na cidade | as quatro páginas no staging |
| DSC-FR-004 | filtros com marca fixa | escopo + filtros + cursor | carregar mais e filtro na URL |
| DSC-FR-005 | — | `kind: "empty"` com fallback; volta ao publicar | vendido → mensagem e `noindex` |
| DSC-FR-006, 007 | títulos, descrição, parágrafo, crumbs | `stats` (total, lojas, cidades, faixa) | HTML cru com título e JSON-LD |
| DSC-FR-008, 009 | — | `discoveryLinks` só com páginas com veículos | links no veículo e no catálogo |
| DSC-FR-010 | `SITEMAP_IDS` | `sitemapEntries("discovery")` entra e sai | `robots.txt` e sitemap |
| DSC-FR-011 | `brandName` com os nomes reais da FIPE | `make_slug` corrigido ao salvar | `/carros/chevrolet` |
| DSC-FR-012 | cidade × marca, UF inválida | coluna gerada = `slugify` em todas as cidades | — |
| DSC-FR-013 | — | `discoveryIndex` | `/carros` e links da vitrine |
| DSC-SEC-001 a 004 | segmentos inválidos | loja suspensa, rascunho, não divulgado, placa | 404 real no build de produção |
| DSC-NFR-001 a 003 | — | — | `audit()` 390/1280; LCP/CLS no build de produção |

## Riscos e alternativas descartadas
- **Risco:** uma marca futura da FIPE terminar em `-{uf}` (ex.: "… SP") e ser lida como cidade. Mitigação: `brandName` e um teste com todas as marcas guardadas; se aparecer, a correção entra na lista.
- **Risco:** a lista de correções de marca fica para trás quando a FIPE cria nomes novos. Efeito limitado: a página existe com o nome da FIPE até a correção.
- **Risco:** memória de 60 s do proxy atrasa o 404 de um endereço recém-criado; é o mesmo limite das outras páginas.
- **Descartado:** prefixos separados (`/carros/marca/…`, `/carros/cidade/…`): escolhido no `/clarify`.
- **Descartado:** `unaccent` para a cidade: a extensão foi descartada na 006 (D3); `translate` com a lista de acentos do português é imutável e cabe em coluna gerada.
- **Descartado:** tabelas próprias de marcas e cidades de descoberta: duplicariam o que `vehicles` e `stores` já dizem e precisariam de sincronização.

## Decisões (aprovadas em 2026-11-15)
- **D1. Cidade no endereço gerada no banco** (`stores.city_slug` como coluna gerada com `translate`), provada igual ao `slugify` da aplicação para todas as cidades da lista do IBGE. Recomendo: não há caminho de escrita para esquecer. A alternativa é gravar pela aplicação no cadastro e na edição da loja, com um ajuste dos registros existentes.
- **D2. Quando a página "já existiu":** marca ou modelo com algum veículo registrado (em qualquer estado), cidade com alguma loja; marca na cidade, com algum veículo da marca numa loja da cidade (ajuste do `/verify`: marca e cidade que existem, mas nunca juntas, respondem 404). Isso decide entre a mensagem com alternativas (DSC-FR-005) e o 404 (DSC-SEC-004). Recomendo: é o que se sabe sem nova tabela. A alternativa é guardar quais páginas já foram publicadas (tabela nova).
- **D3. `make_slug` corrigido também na vitrine** (`?marca=chevrolet` em vez de `?marca=gm-chevrolet`), com o ajuste dos veículos existentes na migration. Recomendo: um nome só em todo lugar. Links antigos com `?marca=gm-chevrolet` passam a mostrar "nenhum resultado" (são filtros, não estão indexados).

## Ajustes de documento (aprovados em 2026-11-15, feitos na T001)
- **PRD [1a]:** links "Buscar por marca" e "Buscar por cidade" e a página `/carros`.
- **SEO.md §1 e §2:** índice `/carros`, marca na cidade, sitemap `discovery.xml`, `/carros/*` no status real do proxy.

## Conformidade
- [x] Todo requisito da spec aparece no mapa requisito → solução (13 FR, 5 NFR, 4 SEC)
- [x] Actions seguem o `API.md` §2: só leitura pública; entrada por schema (`source` em lista fechada, endereço validado por `parseDiscoveryPath`); saída montada à mão; paginação por cursor, 20 por página
- [x] Toda action/rota com id checa a posse: não há dado de loja privado; tudo passa por `publicVisible`
- [x] Schemas de entrada não aceitam campos privilegiados
- [x] Dados pessoais novos: nenhum
- [x] Formulário público com honeypot + rate limit: não há formulário
- [x] Consultas novas têm índice previsto (`stores (city_slug, status)`; `vehicles (make_slug, model_slug)` na `0013`: a 006 não tinha índice de marca, ao contrário do que este plano dizia)
- [x] Migrations aditivas: coluna gerada, dois índices e ajuste de `make_slug` das duas marcas (sem apagar nem renomear)
- [x] Nada do Supabase além de Postgres e Auth
