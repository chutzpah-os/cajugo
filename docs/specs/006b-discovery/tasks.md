---
spec: 006b
---

# Tasks · 006b Páginas de descoberta por marca, modelo e cidade

Fatias verticais (`SDD.md` §7, skill `tdd`): cada task de comportamento é um ciclo teste falhando → código → verde. Testes com o ID do requisito no nome. Toda consulta de descoberta passa por `publicVisible("showcase")` e tem o caso "veículo não divulgado da loja A" (DSC-SEC-002). Decisões do plano D1–D3 aprovadas nas opções recomendadas (2026-11-15).

## Fase 1 — Fundação
- [ ] **T001** Documentos: SEO.md §1 e §2 (índice `/carros`, marca na cidade, `discovery.xml`, `/carros/*` no proxy), PRD [1a] (links "Buscar por marca/cidade" e `/carros`), ARCHITECTURE §4 (`stores.city_slug`), ADR 0014 aceito · _—_ (ajustes aprovados em 2026-11-15)
- [ ] **T002** Migration `0012`: `stores.city_slug` gerado, índices `stores (city_slug, status)` e `vehicles (status, model_slug)`, `make_slug` de "GM - Chevrolet" e "VW - VolksWagen" corrigido; teste de migration: coluna gerada igual a `slugify` para todas as cidades de `platform/geo/cities.ts` · _DSC-FR-003, DSC-FR-012_
- [ ] **T003** [P] `fipe.brandName` com a lista de correções, testada contra os nomes reais guardados da FIPE; `vehicles.syncSearchFields` grava `make_slug` pelo nome corrigido; facets da vitrine mostram o nome corrigido · _DSC-FR-011_
- [ ] **T004** [P] `showcase/discovery-urls.ts`: `parseDiscoveryPath` (cidade por `-{uf}` das 27 UFs, marca, modelo, marca na cidade; segmento inválido → `null`) e `discoveryPath` · _DSC-FR-012, DSC-SEC-004_
- [ ] **T005** [P] `platform/seo`: `discoveryTitle`, `discoveryDescription`, `discoveryIntro`; `SITEMAP_IDS` com `discovery` e `robots.txt` · _DSC-FR-006, DSC-FR-010_

## Fase 2 — Fatias verticais (domínio `showcase`)
- [ ] **T006** Escopo `{ discovery }` em `searchShowcase`, `countMatches` e `facets`: marca, modelo, cidade e marca na cidade, sempre dentro da regra da vitrine; loja suspensa, rascunho e não divulgado de fora · _DSC-FR-001, DSC-FR-002, DSC-FR-003, DSC-SEC-001, DSC-SEC-002_
- [ ] **T007** `discoveryPage`: nomes, caminho, `stats` (total, lojas, cidades, faixa de preço); `kind: "empty"` com a página acima quando já existiu (D2); `null` quando nunca existiu · _DSC-FR-005, DSC-FR-006, DSC-FR-007, DSC-SEC-002, DSC-SEC-004_
- [ ] **T008** `discoveryIndex` e `discoveryLinks` (só páginas com veículos) · _DSC-FR-008, DSC-FR-009, DSC-FR-013, DSC-SEC-001_
- [ ] **T009** `gateDecision` para `/carros/*` e `proxy.ts` (404 real para o que nunca existiu); `sitemapEntries(db, "discovery")` entra e sai com o estoque · _DSC-FR-010, DSC-SEC-003, DSC-SEC-004_
- [ ] **T010** Actions de contagem e "Carregar mais" com `source` (vitrine, loja ou descoberta) em lista fechada, resolvida no servidor; `current.ts` com as leituras de descoberta em cache · _DSC-FR-004, DSC-NFR-004, DSC-NFR-005_

## Fase 3 — Telas
- [ ] **T011** `/carros/[first]` e `/carros/[first]/[second]`: `DiscoveryView` com lista, filtros com marca fixa, parágrafo, `Breadcrumbs`, JSON-LD (`ItemList`, `BreadcrumbList`) e o estado "Nenhum … à venda agora" com `noindex` · _DSC-FR-001 a DSC-FR-007, DSC-NFR-002_
- [ ] **T012** `/carros` (índice pré-renderizado) e links "Buscar por marca" e "Buscar por cidade" na vitrine · _DSC-FR-013_
- [ ] **T013** `RelatedLinks` na página do veículo (marca, modelo, cidade) e link da cidade no catálogo da loja · _DSC-FR-008, DSC-FR-009_

## Fase 4 — Fechamento
- [ ] **T014** Playwright (390 e 1280 px, staging): seed com marca, modelo e duas cidades; as quatro páginas, filtro na URL, carregar mais, página vazia após venda, `/carros`, links no veículo e na loja, HTML cru com SEO, sitemap sem placa, `audit()`; contra o build de produção: 404 real, pré-renderização e LCP/CLS · _DSC-FR-001 a DSC-FR-013, DSC-NFR-001 a DSC-NFR-003, DSC-SEC-001 a DSC-SEC-004_
- [ ] **T015** Migration `0012` no staging e no prod e conferir; `/verify`: rastreabilidade verde, spec `implemented`, PLAN, `docs/changes` e `docs/decisions` · _—_
