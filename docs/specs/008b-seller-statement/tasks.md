---
spec: 008b
---

# Tasks · 008b Rede Caju · extrato do vendedor

Fatias verticais (`SDD.md` §7, skill `tdd`): cada task de comportamento é um ciclo teste falhando → código → verde. Testes com o ID do requisito no nome.

Toda ação com id tem o caso "vendedor B" (`TESTING.md`): venda de outro vendedor → 404, sem mudar nada na venda de A.

Decisões D1–D4 do plano aprovadas em 2026-11-23.

## Fase 1 — Fundação
- [x] **T001** Documentos:
  - ARCHITECTURE §4 (`sales.commission_received_at`);
  - API.md §5 (`/rede/extrato`, `setCommissionReceivedAction`);
  - GLOSSARY (Desfazer de 24 h no status da comissão).

  · _—_
- [x] **T002** Migration `0021`, só acrescenta:
  - `sales.commission_received_at`;
  - `notice_kind` + `sale_confirmed`, `commission_received`, `commission_unreceived`.

  Teste de schema.

  · _—_
- [x] **T003** [P] Permissão `commission.receive` (só `seller`) e os 3 avisos novos (tipos e frases), com testes unitários.

  · _EXT-SEC-002, EXT-FR-006, EXT-FR-010_

## Fase 2 — Fatias verticais (servidor)
- [x] **T004** `sellerStatement`:
  - vendas do vendedor da sessão, sem as desfeitas, da mais recente;
  - veículo, loja, data, valor final, comissão, status;
  - filtros e contagens;
  - cursor de 20;
  - sem dados do comprador;
  - vendedor B não vê as de A.

  · _EXT-FR-001, EXT-FR-002, EXT-FR-007, EXT-FR-008, EXT-NFR-002, EXT-SEC-001, EXT-SEC-003_
- [x] **T005** `setCommissionReceived`, marcar:
  - Recebi passa a Paga com a data;
  - repetir não muda nada;
  - aviso à loja (`notifyStore`);
  - registro;
  - vendedor B → 404;
  - lojista, suporte e admin → 403;
  - vendedor bloqueado pode (D2).

  · _EXT-FR-003, EXT-FR-004, EXT-FR-010, EXT-SEC-001, EXT-SEC-002, EXT-SEC-004_
- [x] **T006** `setCommissionReceived`, desfazer:
  - em até 24 h volta a A receber;
  - depois, 409;
  - comissão marcada pela loja não desfaz;
  - aviso e registro;
  - `canUndoUntil` no item.

  · _EXT-FR-009, EXT-FR-010, EXT-SEC-004_
- [x] **T007** `sellerHome` com a receber, vendas do mês (São Paulo) e as 5 últimas, sem as desfeitas; aviso `sale_confirmed` no `confirmSale` (009).

  · _EXT-FR-005, EXT-FR-006, EXT-FR-007, EXT-FR-008_

## Fase 3 — Telas
- [x] **T008** `/rede/extrato` [7d]:
  - filtros na URL com as contagens;
  - cards da venda;
  - **Recebi** com confirmação;
  - **Desfazer** em 24 h;
  - **Carregar mais**;
  - estado vazio.

  · _EXT-FR-001, EXT-FR-002, EXT-FR-003, EXT-FR-008, EXT-FR-009, EXT-NFR-001, EXT-NFR-002_
- [x] **T009** Painel `/rede` [7b]: KPIs a receber e vendas do mês, últimas vendas e "Ver extrato".

  · _EXT-FR-005, EXT-FR-008, EXT-NFR-001_
- [x] **T010** Seed do e2e (uma venda A receber e uma Paga da E2EVENDE) e `tests/e2e/seller-statement.spec.ts`:
  - [7b] com os KPIs;
  - [7d] com filtros;
  - Recebi e Desfazer;
  - aviso no painel da loja;
  - 390 e 1280 px com `audit()`.

  · _EXT-FR-001…010, EXT-NFR-001_

## Fase 4 — Fechamento
- [x] **T011** `/verify`: rastreabilidade verde; status da spec `implemented` e `docs/PLAN.md`. A migration `0021` no prod só com a sua autorização.

  · _—_
