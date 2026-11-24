---
spec: 010
---

# Tasks · 010 Caju Indica · indicação, recompensa e saldo

Fatias verticais (`SDD.md` §7, skill `tdd`): cada task de comportamento é um ciclo teste falhando → código → verde. Testes com o ID do requisito no nome.

Isolamento (`TESTING.md`): quem indica A não vê nada de B. O crédito vale só para a loja da sessão.

Decisões D1–D5 do plano aprovadas em 2026-11-23.

## Fase 1 — Fundação
- [x] **T001** Documentos:
  - ARCHITECTURE §4 (`referral_rewards`);
  - API.md §5 (rotas `/painel/indica/*`, `/indica/cadastro`, `/i/{codigo}`, `registerReferrerAction`);
  - GLOSSARY (status calculados da indicação, Recompensa).

  · _—_
- [x] **T002** Migration `0022`, só acrescenta: enum `reward_target`, tabela `referral_rewards` (única por fatura), `notice_kind` + `referral_active`, `referral_reward`. Teste de schema.

  · _IND-NFR-003_
- [x] **T003** [P] Os 2 avisos novos (tipos e frases) e a área `indica` aberta também para `seller` (D4), com testes.

  · _IND-FR-016, IND-FR-002_

## Fase 2 — Fatias verticais (servidor)
- [x] **T004** `rewardPaidInvoices`:
  - a 1ª paga ativa a indicação e rende o percentual sobre a mensalidade;
  - rendem só as N primeiras faturas da loja, inclusive a atrasada paga depois;
  - indicação não válida e link de campanha não rendem;
  - repetir não rende de novo;
  - a regra vigente vale para cada fatura;
  - aviso e registro.

  · _IND-FR-006, IND-FR-007, IND-FR-008, IND-FR-016, IND-FR-017, IND-NFR-003, IND-SEC-005, IND-SEC-006_
- [x] **T005** Ligar na `billing` em todo lugar em que a fatura vira paga:
  - 1ª confirmada ou registrada;
  - mensais quitadas;
  - fatura que nasce paga;
  - fatura zerada por taxa desfeita.

  Crédito `referral` para o lojista (D2), abatido na fatura seguinte; saldo para os outros.

  · _IND-FR-006, IND-FR-009, IND-FR-010, IND-SEC-004_
- [x] **T006** Código e regras:
  - `getOrCreateCode` e `checkCode` respeitam o programa ativo e "quem pode indicar" pelo papel de quem indicou;
  - as indicações existentes continuam rendendo.

  · _IND-FR-002, IND-FR-015_
- [x] **T007** `referralPanel` ([8a]/[9d]: código, link, regras) e `referralsList`:
  - filtros;
  - status calculado (Cadastrada, Ativa, Pausada, Encerrada, Não válida);
  - rendeu e meses que faltam;
  - sem dados pessoais da loja indicada;
  - A não vê B.

  · _IND-FR-001, IND-FR-002, IND-FR-005, IND-FR-008, IND-FR-017, IND-SEC-001, IND-SEC-002_
- [x] **T008** `balanceView` (saldo, mínimo, movimentações) e `billing.creditView` (crédito disponível, demonstrativo, movimentações), cada um só da própria pessoa ou loja.

  · _IND-FR-009, IND-FR-010, IND-SEC-001_
- [x] **T009** `landing` ([8c]: primeiro nome, mensalidade, link do cadastro; código inválido ou programa desligado sem indicação) e `programBanner` (nulo com o programa desligado).

  · _IND-FR-003, IND-FR-014_
- [x] **T010** `registerReferrer` [9b]:
  - conta nova com o papel de indicador;
  - conta existente entra e ganha o papel;
  - honeypot e rate limit;
  - termos.

  · _IND-FR-004_

## Fase 3 — Telas
- [x] **T011** `/i/[codigo]` vira página [8c] (`noindex`) no lugar do `route.ts`; banner e rodapé [9a] na vitrine.

  · _IND-FR-003, IND-FR-014, IND-NFR-002_
- [x] **T012** Lojista: `/painel/indica` [8a], `/painel/indica/indicacoes` [8b], `/painel/indica/credito` [8e]; atalho na Conta.

  · _IND-FR-001, IND-FR-005, IND-FR-009, IND-NFR-001_
- [x] **T013** Indicador e vendedor: `/indica/cadastro` [9b] e `/indica` [9d] (saldo, barra, link, indicações, movimentações).

  · _IND-FR-002, IND-FR-004, IND-FR-005, IND-FR-010, IND-NFR-001_
- [x] **T014** Seed do e2e (loja indicada pelo lojista de teste com a 1ª paga; indicação do vendedor com recompensa) e `tests/e2e/referrals.spec.ts`:
  - [8c];
  - [9b];
  - [8a], [8b], [8e];
  - [9d];
  - banner;
  - 390 e 1280 px com `audit()`.

  · _IND-FR-001…017, IND-NFR-001_

## Fase 4 — Fechamento
- [ ] **T015** Verificação: rastreabilidade verde; status da spec `implemented` e `docs/PLAN.md`. A migration `0022` no prod só com a sua autorização.

  · _—_
