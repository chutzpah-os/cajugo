---
spec: 009
---

# Tasks · 009 Rede Caju · lojista e venda

Fatias verticais (`SDD.md` §7, skill `tdd`): cada task de comportamento é um ciclo teste falhando → código → verde. Testes com o ID do requisito no nome.

Toda ação com id tem o caso "loja B" (`TESTING.md`): comissão, pedido, parceria, ajuste e venda de outra loja → 404, sem mudar nada na loja A.

Decisões D1–D4 do plano aprovadas em 2026-11-17.

## Fase 1 — Fundação
- [x] **T001** Documentos:
  - ARCHITECTURE §4 (`stores.accepts_sellers`, comissão e `sale_id` em `vehicles`, `sales`);
  - API.md §5 (actions de [7e], [7f], [7g] e as rotas `/painel/rede/*`);
  - GLOSSARY (Parceria que vale, status da comissão).

  · _—_
- [x] **T002** Migration `0019`, aditiva:
  - `stores.accepts_sellers` (padrão `false`);
  - `vehicles.commission_override_*` e `sale_id`;
  - enums `sale_attribution` e `commission_status`;
  - tabela `sales` (venda ativa única por veículo).

  Teste de schema.

  · _RCL-SEC-003_
- [x] **T003** [P] Schemas:
  - `networkRulesSchema` (até 10% e R$ 10.000);
  - `commissionOverrideSchema`;
  - `partnershipDecisionSchema`;
  - `confirmSaleSchema` (`.strict()`, só o valor final como número).

  `feeFor(valor, bps)`.

  · _RCL-FR-002, RCL-FR-003, RCL-SEC-003_

## Fase 2 — Fatias verticais (servidor)
- [x] **T004** Parceria que vale (`effectivePartner`) e o lado do vendedor:
  - `requestPartnership` recusa loja que não aceita;
  - `sellerShowcase` devolve `closed` e esconde "Você ganha";
  - `sellerForLead` não marca;
  - religar devolve tudo;
  - testes da 008 com a loja aceitando (fixture).

  · _RCL-FR-001, RCL-FR-005_
- [x] **T005** `storeNetwork` e `setNetworkRules`:
  - "Aceitar vendedores" e comissão padrão;
  - pedidos pendentes do mais antigo, só de vendedor ativo;
  - parceiros com celular, Pix, vendas e "Bloqueado pela CajuGo";
  - usuário da loja e outros → 403;
  - loja B.

  · _RCL-FR-001, RCL-FR-002, RCL-FR-004, RCL-FR-006, RCL-FR-007, RCL-SEC-001, RCL-SEC-002, RCL-SEC-004_
- [ ] **T006** `decidePartnership`:
  - aprovar, recusar (pedir de novo depois) e encerrar;
  - `activity_log` sem CPF nem Pix;
  - loja B → 404.

  · _RCL-FR-005, RCL-FR-006, RCL-SEC-001, RCL-SEC-005_
- [ ] **T007** `vehicles.setCommissionOverride`: ajuste no lugar da padrão em "Você ganha"; remover o ajuste; só o lojista; loja B → 404.

  · _RCL-FR-003, RCL-SEC-001, RCL-SEC-002_
- [ ] **T008** `saleTerms`:
  - comissão (ajuste ou padrão) e taxa sobre o valor final;
  - vendedor sugerido pelo lead mais recente com parceria que vale;
  - lista de parceiros que valem.

  · _RCL-FR-009, RCL-FR-010, RCL-FR-013_
- [ ] **T009** `confirmSale` e `vehicles.sellInTx`:
  - venda com vendedor ("A receber" ou "Paga", taxa guardada);
  - venda da loja sem comissão nem taxa;
  - veículo `sold` com `sale_id`;
  - "outro parceiro" sem parceria → 422;
  - repetir → 409;
  - usuário da loja vende;
  - loja B → 404;
  - `activity_log`.

  · _RCL-FR-011, RCL-FR-012, RCL-SEC-001, RCL-SEC-002, RCL-SEC-003, RCL-SEC-005_
- [ ] **T010** `undoSale` e `vehicles.reopenInTx`:
  - desfazer cancela a venda, a comissão e a taxa e reabre o veículo (7 dias);
  - comissão paga → 409;
  - `undoSold` direto com `sale_id` → 409.

  · _RCL-FR-015_
- [ ] **T011** `networkSummary` (aceita? e pedidos pendentes) para o bloco da Conta.

  · _RCL-FR-014_

## Fase 3 — Telas
- [ ] **T012** `/painel/rede/comissao` [7e]:
  - toggle "Aceitar vendedores";
  - tipo e valor com a prévia (comissão e taxa);
  - informativo da taxa;
  - ajustes por veículo (adicionar e remover).

  · _RCL-FR-001, RCL-FR-002, RCL-FR-003, RCL-NFR-001_
- [ ] **T013** `/painel/rede/vendedores` [7f]: pedidos com **Aprovar** e **Recusar**; parceiros com celular, Pix, vendas, selo de bloqueado e **Encerrar parceria** (confirmação).

  · _RCL-FR-004, RCL-FR-005, RCL-FR-006, RCL-FR-007_
- [ ] **T014** Bloco **Rede Caju** na `/painel/conta` (Comissão e Vendedores, com o número de pendentes).

  · _RCL-FR-014_
- [ ] **T015** `ConfirmSaleSheet` [7g] e os slots do `VehicleActions` em [6e]:
  - valor final;
  - quem vendeu;
  - comissão e taxa ao vivo;
  - "Já paguei a comissão".

  "Vendido" em [1c] leva a `[6e]?vender=1`. `UndoSaleButton` com a mensagem da comissão paga.

  · _RCL-FR-008, RCL-FR-009, RCL-FR-010, RCL-FR-011, RCL-FR-015, RCL-NFR-002_
- [ ] **T016** Seed do e2e (loja da vitrine aceitando vendedores, pedido pendente) e `tests/e2e/store-network.spec.ts`:
  - [7e] com toggle e prévia;
  - aprovar em [7f];
  - link → lead → [7g] com o sugerido;
  - confirmar e veículo fora da vitrine;
  - desfazer;
  - usuário da loja sem [7e];
  - 390 e 1280 px com `audit()`.

  · _RCL-FR-001…015, RCL-SEC-002, RCL-NFR-001, RCL-NFR-002_

## Fase 4 — Fechamento
- [ ] **T017** `/verify`: rastreabilidade verde; status da spec `implemented` e `docs/PLAN.md`. A migration `0019` no prod só com a sua autorização.

  · _—_
