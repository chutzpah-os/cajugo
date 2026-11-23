---
spec: 011
---

# Tasks · 011 Fatura mensal, atraso e suspensão

Fatias verticais (`SDD.md` §7, skill `tdd`): cada task de comportamento é um ciclo teste falhando → código → verde. Testes com o ID do requisito no nome.

Toda ação com id tem o caso "loja B" (`TESTING.md`): fatura, comprovante, taxa e pagamento de outra loja → 404, sem mudar nada na loja A.

Decisões D1–D6 do plano aprovadas em 2026-11-23.

## Fase 1 — Fundação
- [x] **T001** Documentos:
  - ARCHITECTURE §4 (`billing_credits`) e §6 (etapa do ciclo de cobrança no job diário);
  - API.md §5 (`/painel/fatura`, `/admin/assinaturas`, `suspendStoreAction`, `reactivateStoreAction`);
  - contrato do cron da 006d (`opened`, `pastDue`, `suspended`, D6);
  - GLOSSARY (Fatura mensal, Em atraso, Suspensa, Crédito).

  · _—_
- [x] **T002** Migration `0020`, aditiva:
  - `stores.past_due_since` (estava só no ARCHITECTURE);
  - enum `credit_kind`;
  - tabela `billing_credits` (índice dos créditos não aplicados);
  - `notice_kind` + `invoice_due`, `store_suspended`, `store_reactivated`;
  - índice `invoices_open_due`.

  Teste de schema.

  · _—_
- [x] **T003** [P] Funções puras com testes unitários:
  - total da fatura (mensalidade + taxas − créditos até o subtotal, nunca negativo, sobra do crédito para a próxima);
  - quitação da mais antiga (faturas inteiras, sobra, valor menor que a mais antiga recusado);
  - MRR.

  · _SUB-FR-001, SUB-FR-011, SUB-FR-016, SUB-FR-017_
- [x] **T004** [P] Datas do ciclo em São Paulo (com `due-date.ts`): janela de abertura (3 dias antes), atraso no dia seguinte ao vencimento, suspensão depois da tolerância, dias de atraso; fim de mês. Testes unitários.

  · _SUB-FR-001, SUB-FR-007, SUB-FR-008_

## Fase 2 — Fatias verticais (servidor)
- [x] **T005** `runBillingCycle`, abertura:
  - fatura `monthly` 3 dias antes com a mensalidade das regras;
  - taxas das vendas não faturadas e não desfeitas, ligadas por `sales.invoice_id`;
  - créditos aplicados; total 0 nasce paga;
  - `next_due_at` avança (D4);
  - aviso `invoice_due` ("vence em dd/mm · R$ X");
  - `invoice.opened` no registro;
  - rodar 2× não repete.

  · _SUB-FR-001, SUB-FR-006, SUB-FR-014, SUB-NFR-002, SUB-SEC-004_
- [x] **T006** `runBillingCycle`, atraso e suspensão:
  - `active → past_due` no dia seguinte ao vencimento (`past_due_since`);
  - `past_due → suspended` depois da tolerância;
  - avisos `store_suspended` ao lojista e aos admins;
  - registro pelo sistema;
  - o cron chama o ciclo, devolve `opened`/`pastDue`/`suspended` e invalida o cache público ao suspender;
  - rodar 2× não repete.

  · _SUB-FR-007, SUB-FR-008, SUB-FR-015, SUB-NFR-002, SUB-NFR-003, SUB-SEC-004_
- [x] **T007** `billing.refundSaleFee` chamado por `sellers.undoSale` na mesma transação:
  - venda não faturada: nada;
  - fatura aberta: a taxa sai e o total é recalculado;
  - fatura paga: crédito `fee_refund` na próxima.

  · _SUB-FR-014_
- [x] **T008** `invoiceView` e `accountView`:
  - faturas abertas da mais antiga, com as taxas (veículo, data, valor) e o total em aberto;
  - plano, status, próxima cobrança, Como pagar (chave Pix e WhatsApp das regras), faturas anteriores;
  - usuário da loja → 403; loja B → 404.

  · _SUB-FR-002, SUB-FR-010, SUB-SEC-001, SUB-SEC-003_
- [x] **T009** Comprovante da fatura mensal (`pixView`, `receiptUpload`, `submitReceipt`, `rejectPayment`):
  - cobra o total em aberto;
  - referência "Mensalidade mm/aaaa" na fila;
  - a loja não muda de status ao enviar nem ao ser recusada (só a 1ª mensalidade muda);
  - schema `.strict()` recusa total, taxa e crédito;
  - loja B → 404.

  · _SUB-FR-003, SUB-FR-005, SUB-SEC-001, SUB-SEC-002_
- [x] **T010** `confirmPayment` da fatura mensal:
  - quita da mais antiga para a mais nova (D3); a sobra vira crédito `overpayment`;
  - valor menor que a fatura mais antiga → 422;
  - sem fatura vencida aberta, `past_due`/`suspended` → `active`;
  - aviso `store_reactivated`, `updateTag` e `payment.confirmed` no registro.

  · _SUB-FR-004, SUB-FR-015, SUB-FR-016, SUB-FR-017, SUB-NFR-003, SUB-SEC-004_
- [x] **T011** `subscriptionsView` (`subscriptions.view`, admin e suporte):
  - MRR e as contagens Em dia, Atrasadas e Suspensas;
  - filtros;
  - linha por status (próxima cobrança, dias de atraso e valor, comprovante enviado, fora do ar);
  - "Vencem em 3 dias";
  - lojista, vendedor → 403.

  · _SUB-FR-006, SUB-FR-011, SUB-FR-012, SUB-SEC-003_
- [x] **T012** `suspendStore` e `reactivateStore` (`stores.suspend`, só admin):
  - suspender só `past_due`;
  - reativar só `suspended`, com motivo de 3 a 200, volta a `past_due` com `past_due_since = agora` e a fatura aberta;
  - avisos, `updateTag`, registro com o admin e o motivo;
  - suporte, usuário da loja e vendedor → 403; loja inexistente → 404.

  · _SUB-FR-013, SUB-FR-015, SUB-NFR-003, SUB-SEC-003, SUB-SEC-004_
- [x] **T013** `store-access` (D5): loja `past_due` e `suspended` têm o painel inteiro (edição permitida); testes de acesso da 001/004 atualizados.

  · _SUB-FR-008, SUB-FR-009_

## Fase 3 — Telas
- [ ] **T014** Alerta da fatura no layout do painel:
  - "Sua fatura vence em dd/mm · R$ X";
  - "Fatura em atraso há N dias";
  - [12f] "Loja suspensa · N dias de atraso · R$ X";
  - **Pagar agora** → [6c].

  · _SUB-FR-006, SUB-FR-007, SUB-FR-009, SUB-NFR-001_
- [ ] **T015** `/painel/fatura` [10c] e [6c] da mensal: mensalidade, taxas, crédito, total, vencimento, status; **Pagar com Pix** com o total em aberto.

  · _SUB-FR-002, SUB-FR-003, SUB-FR-016, SUB-NFR-001_
- [ ] **T016** `/painel/conta` [3c] completa (plano, status, valor, próxima cobrança, Como pagar, fatura do mês, anteriores) com o bloco Rede Caju da 009.

  · _SUB-FR-010, SUB-NFR-001_
- [ ] **T017** `/admin/assinaturas` [4b]:
  - MRR, contagens, card do plano, filtros na URL;
  - cards com a linha do status, `wa.me` com a mensagem pronta, **Conferir** → [10b];
  - **Suspender** (ConfirmSheet) e **Reativar** (motivo);
  - item no menu do admin.

  [10b] mostra "Mensalidade mm/aaaa" e a mensagem do 422.

  · _SUB-FR-003, SUB-FR-011, SUB-FR-012, SUB-FR-013, SUB-FR-017, SUB-NFR-001_
- [ ] **T018** Seed do e2e (loja de teste com vencimento no passado e uma venda com taxa) e `tests/e2e/billing-cycle.spec.ts`:
  - ciclo pela rota do cron;
  - [10c] e Conta;
  - painel com o alerta e [12f], editando um veículo;
  - [12g] sem motivo, valor ou dias;
  - comprovante e confirmação do admin: a loja volta;
  - [4b] com Suspender e Reativar; suporte sem os botões;
  - 390 e 1280 px com `audit()`.

  · _SUB-FR-002…013, SUB-SEC-003, SUB-SEC-005, SUB-NFR-001_

## Fase 4 — Fechamento
- [ ] **T019** `/verify`: rastreabilidade verde; status da spec `implemented` e `docs/PLAN.md`. A migration `0020` no prod só com a sua autorização.

  · _—_
