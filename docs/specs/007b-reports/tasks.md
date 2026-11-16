---
spec: 007b
---

# Tasks · 007b Denúncias de anúncio

Fatias verticais (`SDD.md` §7, skill `tdd`): cada task de comportamento é um ciclo teste falhando → código → verde. Testes com o ID do requisito no nome.

Toda ação com id tem o caso "loja B" (`TESTING.md`). Em `hide`, `show` e `keep`, a decisão sobre o veículo da loja A não muda nem avisa a loja B. As leituras do lojista só trazem o veículo da própria loja.

Decisões D1–D4 do plano aprovadas em 2026-11-16.

## Fase 1 — Fundação
- [x] **T001** Documentos:
  - ARCHITECTURE §3 (`platform/browser/`) e §4 (`vehicle_reports`, marca de moderação em `vehicles`);
  - API.md §5 (actions e `/admin/denuncias`);
  - SECURITY §8 (denúncia sem autor nem IP, anônima para a loja);
  - GLOSSARY (Ocultar, Mostrar de novo, status da denúncia).

  · _—_
- [x] **T002** Migration `0017`, aditiva:
  - enums `report_reason` e `report_status`;
  - tabela `vehicle_reports` com índice parcial das abertas;
  - colunas `hidden_reason`, `hidden_note`, `hidden_at`, `hidden_by` em `vehicles`;
  - `notice_kind` + `vehicle_hidden`, `vehicle_shown`.
  
  Teste: `vehicle_reports` sem coluna de autor nem de IP.

  · _RPT-SEC-006_
- [x] **T003** [P] `platform/browser/marks.ts` com `claimOncePer(storage, key, id, now, windowMs)`. `leads/device.ts` passa a usá-lo, e os testes da 007 continuam verdes. Teste de 1 h × 25 h.

  · _RPT-FR-010_
- [x] **T004** [P] `moderation/reasons.ts` e `moderation/schemas.ts`:
  - `reasons.ts`: rótulos dos motivos;
  - `reportSchema` (`.strict()`): motivo obrigatório e sem `other`, descrição ≤ 1.000, honeypot, `requestId` v7;
  - `hideSchema`: "Outro" exige nota de 1 a 200 caracteres.

  · _RPT-FR-001, RPT-FR-004, RPT-SEC-002_

## Fase 2 — Fatias verticais (servidor)
- [x] **T005** `reportVehicle` e `reportVehicleAction`:
  - grava a denúncia `open` com `id = requestId` (`on conflict do nothing`);
  - recusa veículo fora do ar (`contactTarget`);
  - honeypot com sucesso falso;
  - limite por IP de 5/min e 30/dia;
  - nada de autor nem IP.

  · _RPT-FR-001, RPT-SEC-002, RPT-SEC-006_
- [x] **T006** `reportQueue` e `openReportsCount`:
  - agrupa por veículo, com contagem por motivo e descrições, da denúncia mais antiga para a mais nova;
  - só veículos `published`: vendido sai da fila e volta ao desfazer a venda;
  - `admin.moderate` (lojista, usuário da loja e vendedor → 403; contador 0).

  · _RPT-FR-002, RPT-FR-007, RPT-SEC-003_
- [x] **T007** `keep` e `keepReportsAction`: arquiva as denúncias abertas como `kept`, e uma denúncia nova reabre o anúncio. Grava no `activity_log` sem texto das denúncias. Teste de 403.

  · _RPT-FR-003, RPT-SEC-003, RPT-SEC-005_
- [ ] **T008** `vehicles`: `hideVehicle`, `showVehicle` e as transições com a marca de moderação:
  - `markSold`, `unpublish` e `remove` aceitam `hidden`;
  - `publish` e `undoSale` vão para `hidden` quando há marca;
  - `setShare` e a edição recusam `hidden` (409);
  - caso loja B.

  · _RPT-FR-009_
- [ ] **T009** Visibilidade:
  - `publicVisible`: os escopos da loja e dos veículos escolhidos aceitam `hidden`; vitrine, descoberta, busca e sitemap continuam só `published`;
  - `vehiclePage` trata `hidden` como veículo do catálogo, com `noindex`;
  - `gateDecision` devolve 200.

  · _RPT-FR-005_
- [ ] **T010** [P] `notices`: tipos `vehicle_hidden` e `vehicle_shown` com o texto do aviso. `notifyStore(db, storeId, notice)` avisa o dono e os usuários da loja, e só eles (caso loja B).

  · _RPT-FR-006, RPT-SEC-004_
- [ ] **T011** `hide` e `hideVehicleAction`, numa transação:
  - `hideVehicle`;
  - denúncias abertas → `hidden`;
  - `notifyStore`;
  - `logActivity` com motivo, sem IP nem descrição;
  - `updateTag(VEHICLES_TAG)`.
  
  Casos: loja A × loja B, e 403.

  · _RPT-FR-004, RPT-FR-006, RPT-SEC-003, RPT-SEC-004, RPT-SEC-005, RPT-NFR-003_
- [ ] **T012** `hiddenList`, `show` e `showVehicleAction`:
  - `show` volta o veículo a `published` e limpa a marca;
  - avisa a loja e grava no `activity_log`;
  - `updateTag`;
  - 403.

  · _RPT-FR-008, RPT-SEC-003_
- [ ] **T013** Leitura do lojista: a lista [1c] e o resumo [6e] trazem o selo "Oculto" e o motivo da CajuGo. Teste de que nada de `vehicle_reports` sai para o painel (contagem, motivos, descrições).

  · _RPT-FR-006, RPT-SEC-001_

## Fase 3 — Telas
- [ ] **T014** `ReportSheet` em [1b]:
  - "Denunciar anúncio" abre um `<dialog>` (Invoker Commands), com os 4 motivos, descrição e honeypot;
  - "Escolha um motivo." quando falta o motivo;
  - confirma "Denúncia enviada. Vamos analisar.";
  - `claimOncePer` de 24 h;
  - a página continua em cache.

  · _RPT-FR-001, RPT-FR-010, RPT-NFR-002_
- [ ] **T015** Item "Denúncias" no menu do admin (`admin.moderate`), com o contador via `navCounts`, na gaveta "Mais" do celular e na barra lateral do desktop.

  · _RPT-FR-007_
- [ ] **T016** `/admin/denuncias`: a fila [14e] com os cards (foto, veículo, loja, preço, link, contagens, descrições) e o botão **Manter**. "Sem permissão" para quem não modera.

  · _RPT-FR-002, RPT-FR-003, RPT-SEC-003, RPT-NFR-001_
- [ ] **T017** `HideSheet` ([6f] "Ocultar veículo"): 5 motivos, nota no "Outro" e o texto do efeito. "Ocultar da vitrine" não confirma sem motivo.

  · _RPT-FR-004_
- [ ] **T018** Aba "Ocultados" (`?aba=ocultados`), com o motivo, quando foi ocultado e **Mostrar de novo**.

  · _RPT-FR-008_
- [ ] **T019** Painel do lojista:
  - selo "Oculto" e o motivo em [1c] e [6e];
  - em [6e], "Para revisar, fale com a CajuGo", sem Editar nem "Divulgar na CajuGo";
  - Vender e Excluir continuam;
  - o aviso no painel.

  · _RPT-FR-006, RPT-FR-009, RPT-SEC-001_
- [ ] **T020** Seed do e2e (veículos com denúncia e um oculto) e `tests/e2e/moderation.spec.ts`:
  - denunciar, segunda denúncia sem aumentar a contagem;
  - Manter;
  - Ocultar, que some da vitrine na hora e continua no catálogo;
  - aviso e selo no painel;
  - Mostrar de novo;
  - lojista sem permissão;
  - 390 e 1280 px com `audit()`.

  · _RPT-FR-001…010, RPT-SEC-001, RPT-SEC-003, RPT-NFR-001, RPT-NFR-003_
- [ ] **T021** LCP/CLS de [1b] com "Denunciar anúncio" no e2e de produção (`tests/e2e-prod/showcase.spec.ts`).

  · _RPT-NFR-002_

## Fase 4 — Fechamento
- [ ] **T022** `/verify`: rastreabilidade verde; status da spec `implemented` e `docs/PLAN.md`. A migration `0017` no prod só com a sua autorização.

  · _—_
