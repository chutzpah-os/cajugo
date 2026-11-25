---
spec: 016
---

# Tasks · 016 LaudoCaju

## Fase 1 — Fundação
- [ ] **T001** Migration `0025` (`laudo_requests`), permissão `laudos.manage`, regra `laudo_price_cents` e docs (ARCHITECTURE, API, GLOSSARY, PRD). · _LAU-FR-007, LAU-SEC-003_

## Fase 2 — Fatias verticais
- [ ] **T002** `requestLaudo` + `laudoPix`: pedido com isca e limite, código, preço da época; Pix com QR. · _LAU-FR-003, LAU-FR-004, LAU-SEC-001_
- [ ] **T003** Fila do admin: `laudoQueue`, `markPaid`, `markSent`, registro; `purgeOldLaudos` no cron. · _LAU-FR-005, LAU-SEC-002, LAU-SEC-003_

## Fase 3 — Telas
- [ ] **T004** `/laudocaju/pedir` e `/laudocaju/pedido/[codigo]`. · _LAU-FR-003, LAU-FR-004_
- [ ] **T005** Faixa e bloco do LaudoCaju na página do veículo. · _LAU-FR-001, LAU-FR-002_
- [ ] **T006** Página de vendas `/laudocaju`. · _LAU-FR-006_
- [ ] **T007** `/admin/laudos` e o item LaudoCaju no menu com contador. · _LAU-FR-005_

## Fase 4 — Fechamento
- [ ] **T008** e2e em 390 e 1280 px, rastreabilidade, status `implemented`; migration no prod só com autorização. · _LAU-NFR-001_
