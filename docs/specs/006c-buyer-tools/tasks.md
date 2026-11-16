---
spec: 006c
---

# Tasks · 006c Ferramentas do comprador: simulador e favoritos

Fatias verticais (`SDD.md` §7, skill `tdd`): cada task de comportamento é um ciclo teste falhando → código → verde. Testes com o ID do requisito no nome. Sem ação com id de loja: a única action é leitura pública, e o caso "veículo não divulgado / vendido / loja suspensa" substitui o "loja B" (BUY-SEC-002). Decisões D1–D3 do plano aprovadas nas opções recomendadas (2026-11-16).

## Fase 1 — Fundação
- [x] **T001** Documentos: GLOSSARY ("Simulador de parcelas"; "Favorito" no aparelho), API.md §5 (`favoriteCardsAction`), ARCHITECTURE §3 (`buyers/` com favoritos no aparelho) · _—_
- [x] **T002** [P] `simulateInstallment` (entrada, financiado, parcela, total pela Price; taxa 0; entrada 50%) e `estimatedInstallment` passa a usá-la; teste de igualdade card × simulador · _BUY-FR-002, BUY-NFR-003_
- [x] **T003** [P] `buyers/favorites.ts`: adicionar, remover, sem duplicar, mais recente primeiro, até 200 (`"full"`), JSON estragado = lista vazia, chave versionada, evento `storage` · _BUY-FR-004, BUY-FR-005, BUY-NFR-004_

## Fase 2 — Fatias verticais (servidor)
- [x] **T004** Escopo `{ vehicleIds }` em `publicVisible` e `favoriteCards`: publicado e loja no ar, divulgado ou não; sem vendido, rascunho e loja suspensa; card sem placa/chassi · _BUY-FR-007, BUY-SEC-002_
- [x] **T005** `favoriteCardsAction`: schema (uuid, 1 a 200, campo desconhecido rejeitado), só leitura, nada gravado · _BUY-NFR-004, BUY-SEC-001, BUY-SEC-002_
- [x] **T006** `vehiclePage.simulator` (regras [4c] vigentes, número do contato, título, link) ou `null` sem "Exibir parcela estimada" ou sem preço; `simulationMessage` e opções com o valor das regras (D2) · _BUY-FR-001, BUY-FR-003_

## Fase 3 — Telas
- [x] **T007** Simulador [14b]: "Simular" abaixo do preço e "Ver parcelas" na barra fixa abrem o `Drawer`; troca de entrada e prazo recalcula; aviso de estimativa; "Enviar simulação à loja" · _BUY-FR-001, BUY-FR-002, BUY-FR-003, BUY-NFR-001_
- [x] **T008** `FavoriteButton` no `PublicCard` (sobre a foto, fora do link; vitrine, descoberta, catálogo e "Carregar mais") e na página do veículo; HTML do servidor sempre desmarcado e com o mesmo tamanho · _BUY-FR-004, BUY-NFR-001, BUY-NFR-002_
- [x] **T009** `/favoritos` [14a]: ♡ no cabeçalho, casca pré-renderizada com `noindex` fora do sitemap, `FavoritesView` com a ordem, "Baixou R$ X", "Vendido" levando à página do veículo (D3) e estado vazio · _BUY-FR-005, BUY-FR-006, BUY-FR-007, BUY-FR-008, BUY-SEC-002_

## Fase 4 — Fechamento
- [x] **T010** Playwright (390 e 1280 px, staging): simulador pelos dois botões e sem a opção, números de 30%/36x, link do WhatsApp; coração no card, na página e no catálogo (veículo não divulgado); [14a] com ordem, "Baixou", "Vendido" (veículo vendido do seed) e vazio; painel do lojista sem dado de favorito; HTML sem placa; `audit()`; contra o build de produção: LCP/CLS da vitrine, do veículo e de `/favoritos` · _BUY-FR-001 a BUY-FR-008, BUY-NFR-001 a BUY-NFR-004, BUY-SEC-001, BUY-SEC-002_
- [x] **T011** `/verify`: rastreabilidade verde, spec `implemented`, PLAN, `docs/changes` e `docs/decisions` · _—_
