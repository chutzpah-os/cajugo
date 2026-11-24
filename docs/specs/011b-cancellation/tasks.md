---
spec: 011b
---

# Tasks · 011b Cancelamento e fim da assinatura

Fatias verticais (`SDD.md` §7, skill `tdd`): cada task de comportamento é um ciclo teste falhando → código → verde. Testes com o ID do requisito no nome.

Isolamento (`TESTING.md`): as ações usam a loja da sessão. O caso "loja B" confere que B não cancela, não desfaz e não reassina a loja A.

Decisões D1–D5 do plano aprovadas em 2026-11-24.

## Fase 1 — Fundação
- [x] **T001** Documentos:
  - ARCHITECTURE §4 (colunas de `stores`) e §6 (etapas do job);
  - API.md §5 (actions);
  - contrato do cron (`ended`, `archived`, `slugsReleased`);
  - GLOSSARY (Cancelamento agendado, Arquivada, Endereço provisório).

  · _—_
- [x] **T002** Migration `0023`, só acrescenta: `stores.cancel_requested_at`, `cancel_reason`, `active_until`, `canceled_at`; `notice_kind` + `cancel_scheduled`, `cancel_undone`, `store_canceled`, `plan_changed`. Teste de schema e a migration no staging.

  · _—_
- [x] **T003** [P] Os 4 avisos novos (tipos e frases) e `CANCEL_REASONS`, com testes unitários.

  · _CAN-FR-012, CAN-FR-002_

## Fase 2 — Fatias verticais (servidor)
- [x] **T004** `cancelSubscription` e `undoCancel`:
  - ativa → cancelamento agendado com `active_until` e o motivo;
  - desfazer até o fim;
  - depois do fim → 409;
  - em atraso ou suspensa → cancelada na hora, com as faturas abertas canceladas;
  - avisos e registro;
  - usuário da loja, suporte e vendedor → 403;
  - a loja B não mexe na A.

  · _CAN-FR-002, CAN-FR-003, CAN-FR-009, CAN-FR-012, CAN-SEC-001, CAN-SEC-002, CAN-SEC-004_
- [x] **T005** Ciclo, fim do período:
  - nenhuma fatura aberta para loja com cancelamento agendado;
  - `active_until` vencido → cancelada;
  - o crédito disponível expira;
  - as parcerias são encerradas;
  - fora da vitrine;
  - aviso e registro;
  - rodar 2× não repete;
  - o cron devolve `ended` e invalida o cache.

  · _CAN-FR-004, CAN-FR-005, CAN-FR-012, CAN-NFR-002, CAN-SEC-004_
- [x] **T006** `resubscribe`: cancelada → cadastrada → 1ª mensalidade confirmada → ativa, com novo dia de cobrança, o mesmo endereço e os veículos; arquivada não reassina.

  · _CAN-FR-006, CAN-SEC-002_
- [x] **T007** Arquivamento (`archiveCanceled` + `stores.archiveStore` + remoções por domínio + `auth.deleteAccountOrRole`):
  - 90 dias depois do cancelamento;
  - apaga dados da loja, veículos, fotos (fake) e leads;
  - apaga a conta sem outro papel; a conta com outro papel só perde o de lojista;
  - mantém faturas e pagamentos;
  - libera o endereço;
  - registro sem dado pessoal;
  - rodar 2× não repete.

  · _CAN-FR-007, CAN-SEC-003, CAN-SEC-004, CAN-NFR-002_
- [x] **T008** `releaseUnpaidSlugs`:
  - cadastrada sem pagamento em 7 dias → endereço provisório e livre para outra loja;
  - a troca em Minha loja depois do provisório não conta no limite de 30 dias.

  · _CAN-FR-008, CAN-SEC-004_
- [ ] **T009** `editPlan` (só admin):
  - data ≥ 30 dias;
  - vigência futura da mensalidade;
  - a fatura aberta depois da data usa o valor novo;
  - aviso `plan_changed` aos donos;
  - registro;
  - suporte e lojista → 403.

  · _CAN-FR-011, CAN-SEC-002, CAN-SEC-004_
- [ ] **T010** `subscriptionsView` com os filtros Cancelamento agendado e Canceladas (data do fim, motivo); `accountView` com o cancelamento; `showcase.storePage` → `gone` para loja cancelada.

  · _CAN-FR-010, CAN-FR-001, CAN-SEC-005_

## Fase 3 — Telas
- [ ] **T011** Conta [3c]:
  - **Cancelar assinatura** → [12h] (ConfirmSheet com as consequências e o motivo);
  - aviso do painel "Sua assinatura termina em dd/mm" com **Desfazer**;
  - loja cancelada com **Reassinar**.

  · _CAN-FR-001, CAN-FR-002, CAN-FR-003, CAN-FR-006, CAN-NFR-001_
- [ ] **T012** `/loja/[slug]/not-found.tsx` ("Esta loja não está mais na CajuGo", `noindex`); [4b] com os filtros novos e **Editar plano** (valor, data e lista de `wa.me`).

  · _CAN-SEC-005, CAN-FR-010, CAN-FR-011, CAN-NFR-001_
- [ ] **T013** Seed do e2e (loja "Cancela E2E") e `tests/e2e/cancellation.spec.ts`:
  - cancelar com motivo;
  - aviso e Desfazer;
  - [4b] com o filtro;
  - loja cancelada pelo ciclo (seed) com 404 público;
  - Editar plano;
  - 390 e 1280 px com `audit()`.

  · _CAN-FR-001…012, CAN-SEC-005, CAN-NFR-001_

## Fase 4 — Fechamento
- [ ] **T014** Verificação: rastreabilidade verde, suíte e2e, revisão; status `implemented` e `docs/PLAN.md`. A migration `0023` no prod só com a sua autorização.

  · _—_
