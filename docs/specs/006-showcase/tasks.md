---
spec: 006
---

# Tasks · 006 Vitrine, catálogo da loja e página do veículo

Fatias verticais (`SDD.md` §7, skill `tdd`): cada task de comportamento é um ciclo teste falhando → código → verde. Testes com o ID do requisito no nome. Isolamento entre lojas (SHW-SEC-002) entra em toda consulta com escopo. Decisões do plano D1–D3 nas opções recomendadas (confirmar antes do `/implement`).

## Fase 1 — Fundação
- [x] **T001** Correção do `/loja/[slug]` em produção (`instant = false`) e etapa de teste contra o build de produção (servidor standalone: a loja renderiza) · _SHW-NFR-002_
- [x] **T002** Documentos: ARCHITECTURE §4 e §5 (campos novos de `vehicles`, busca sem `unaccent`), SEO.md (status real pelo proxy), GLOSSARY ("Relevância"), ADR 0013 (status real e reescrita de filtros no proxy, D1/D2) · _—_
- [x] **T003** Migration `0011`: `make_slug`, `model_slug`, `search_text`, `search` gerado, `rank_score`, índices e as regras `installment_down_bps`/`installment_months`; regras em [4c]; teste de migration · _SHW-FR-003, SHW-FR-004_
- [x] **T004** [P] `src/platform/br/installment.ts` (Price) e `br/slug.ts` (texto sem acento) · _SHW-FR-003, SHW-FR-004_
- [x] **T005** [P] `showcase/filters.ts` (`parseFilters` ignora inválidos, `filtersToQuery`) e `showcase/urls.ts` (`vehiclePath`, `idFromVehicleParam`) · _SHW-FR-005, SHW-FR-008, SHW-SEC-004_
- [x] **T006** [P] `src/platform/seo/`: títulos e descrições, canônica, `Car`/`Offer`, `AutoDealer`, `ItemList`, `BreadcrumbList`, `WebSite` · _SHW-FR-013_
- [x] **T007** `vehicles` grava `make_slug`, `model_slug`, `search_text` e `rank_score` ao salvar, publicar e mudar fotos (staging e prod sem veículos: não precisa de script) · _SHW-FR-004, SHW-FR-006_

## Fase 2 — Fatias verticais (domínio `showcase`)
- [ ] **T008** `searchShowcase` vitrine: só publicado, divulgado e de loja no ar; total e número de lojas; card com selo e parcela · _SHW-FR-001, SHW-FR-003, SHW-SEC-001, SHW-SEC-002, SHW-SEC-003_
- [ ] **T009** `searchShowcase` catálogo da loja e `storePage` (loja no ar, suspensa, endereço antigo) · _SHW-FR-002, SHW-FR-011, SHW-SEC-002_
- [ ] **T010** Busca sem acento, filtros, `countMatches` e `facets` · _SHW-FR-004, SHW-FR-005_
- [ ] **T011** Ordenações e paginação por cursor, sem repetição em cada ordem; `listVehicles` [1c] paginada · _SHW-FR-006, SHW-FR-007_
- [ ] **T012** `vehiclePage`: publicado (divulgado ou não), vendido e excluído com parecidos, loja suspensa; sem placa nem chassi · _SHW-FR-008, SHW-FR-010, SHW-FR-011, SHW-SEC-001, SHW-SEC-003_
- [ ] **T013** `gateDecision` com memória de 60 s e `proxy.ts`: 308/404 reais, `/loja/{slug}/v/{id}`, cookie `?ref=` e reescrita de `/?filtros` · _SHW-FR-009, SHW-FR-014, SHW-SEC-005, SHW-NFR-005_
- [ ] **T014** `sitemapEntries` e sitemap em índice (estáticas, lojas, veículos) · _SHW-FR-015, SHW-SEC-001, SHW-SEC-003_

## Fase 3 — Telas
- [ ] **T015** `VehicleCard` público, `CatalogView`, `/` com mensagem de vitrine vazia e SEO · _SHW-FR-001, SHW-FR-003, SHW-FR-013, SHW-NFR-002_
- [ ] **T016** `/loja/[slug]` no novo layout, com `AutoDealer` e [12g] · _SHW-FR-002, SHW-FR-011, SHW-FR-013_
- [ ] **T017** Filtros [6d], busca, ordenação e `/vitrine` · _SHW-FR-004, SHW-FR-005, SHW-FR-006_
- [ ] **T018** "Carregar mais" na vitrine, no catálogo e em [1c]; estados [12a], [12b] e [12c] · _SHW-FR-007, SHW-FR-012_
- [ ] **T019** `/v/[slug]`: galeria, ficha, selos, card da loja, barra WhatsApp, compartilhar, `Car` + `Offer`, [12d] · _SHW-FR-008, SHW-FR-009, SHW-FR-010, SHW-FR-013_
- [ ] **T020** Desktop [15a] (filtros laterais e 3 colunas) · _SHW-NFR-001_

## Fase 4 — Fechamento
- [ ] **T021** Playwright (390 e 1280 px, staging): vitrine, filtros na URL, carregar mais, veículo, compartilhar, `?ref=`, vendido, suspensa, HTML cru com SEO, `audit()`; contra o build de produção: status 308/404 e medição de LCP e CLS da vitrine, do catálogo e do veículo · _SHW-FR-001 a SHW-FR-015, SHW-NFR-001, SHW-NFR-002, SHW-NFR-003, SHW-NFR-004, SHW-SEC-001 a SHW-SEC-005_
- [ ] **T022** Migration `0011` no staging e no prod e conferir; `/verify`: rastreabilidade verde, spec `implemented`, PLAN, `docs/changes` e `docs/decisions` · _—_
