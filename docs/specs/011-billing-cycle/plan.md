---
spec: 011
status: approved
---

# Plano · 011 Fatura mensal, atraso e suspensão

## Resumo técnico
Tudo fica no domínio `billing`, que já cobra a 1ª mensalidade (004).

**Ciclo de cada loja, no job diário (`/api/v1/cron/daily`), sem nada fixo além das regras:**
1. **Abrir a fatura:** com `next_due_at − 3 dias ≤ hoje` (São Paulo) e sem fatura daquele período, abre a fatura `monthly` com:
   - a mensalidade das regras;
   - as taxas das vendas ainda não faturadas;
   - os créditos disponíveis.

   Em seguida, avança `next_due_at` para o mês seguinte (D4) e avisa o lojista ("vence em dd/mm").
2. **Atraso:** fatura aberta com vencimento já passado faz a loja `active → past_due` (`past_due_since` = o dia seguinte ao vencimento).
3. **Suspensão:** `past_due_since + tolerância ≤ hoje` faz a loja `past_due → suspended`, avisa e invalida o cache público.

**Pagamento:**
- usa a mesma fila de comprovantes da 004, e a loja não muda de status enquanto o admin confere;
- confirmar quita as faturas abertas da mais antiga para a mais nova (D3), e a sobra vira crédito;
- sem fatura vencida em aberto, a loja volta a `active`.

**Taxas e créditos:**
- a taxa de cada venda entra numa fatura só, pelo `sales.invoice_id` (D1);
- venda desfeita com a fatura aberta: a taxa sai e a fatura é recalculada;
- venda desfeita com a fatura já paga: a taxa vira crédito (D2).

## Impacto
| Camada | Mudança |
|---|---|
| Dados (migration `0020`, aditiva) | Enum `credit_kind` (overpayment, fee_refund, referral). Tabela `billing_credits`. `notice_kind` + `invoice_due`, `store_suspended`, `store_reactivated`. Índice de faturas abertas por vencimento. |
| `src/domains/billing/` | Ciclo (`runBillingCycle`), fatura do lojista (`invoiceView`, `accountView`), pagamento de várias faturas (`pixView`, `receiptUpload` e `submitReceipt` sem exigir loja `registered`), confirmação que quita da mais antiga e reativa, assinaturas do admin (`subscriptionsView`, `suspendStore`, `reactivateStore`), `refundSaleFee`. |
| `src/domains/sellers/` | `undoSale` chama `billing.refundSaleFee` na mesma transação. |
| `src/domains/auth/` | Permissão `subscriptions.view` (admin, suporte); `stores.suspend` já existe (só admin). Loja `past_due`/`suspended`: painel liberado e a [12f] no topo (confere `store-access`). |
| `src/domains/notices/` | Os 3 tipos novos de aviso (lojista e admin). |
| `src/app/` | `/painel/fatura` [10c]; `/painel/conta` [3c] completa; alerta [12f] no layout do painel; `/admin/assinaturas` [4b]; o cron chama o ciclo e devolve os números. |
| Jobs | Etapa nova no `cron/daily` (contrato atualizado, D6) |

## Interfaces dos serviços (módulos profundos)
```ts
// domains/billing/service.ts (novas ou mudadas)
runBillingCycle(db, now): Promise<{ opened; pastDue; suspended }>            // SUB-FR-001, 006..008, NFR-002
invoiceView(deps, session): Promise<InvoiceView>                              // SUB-FR-002, SEC-001
//  { invoices: { id, period, dueAt, membershipCents, fees: { saleId, vehicle, date, cents }[],
//                creditCents, totalCents, status }[], openTotalCents }
accountView(deps, session): Promise<AccountView>                              // SUB-FR-010
pixView / receiptUpload / submitReceipt (passam a valer para as faturas mensais) // SUB-FR-003
confirmPayment (quita da mais antiga, sobra → crédito, reativa)               // SUB-FR-004, 016, 017
rejectPayment (mensal: a loja não muda de status)                             // SUB-FR-005
subscriptionsView(deps, session, filter): Promise<SubscriptionsView>          // SUB-FR-011, 012, 006 (vencendo)
suspendStore(deps, session, raw: { storeId }) / reactivateStore(deps, session, raw: { storeId; reason })  // SUB-FR-013
refundSaleFee(tx, saleId, now): Promise<void>                                 // SUB-FR-014 (chamada por sellers)
```
Regras escondidas:
- **Valor da fatura:** mensalidade (regra vigente na abertura) + taxas (`sales` com `fee_cents`, `invoice_id` nulo, `canceled_at` nulo, confirmadas até a abertura) − créditos (`billing_credits` não aplicados, até o subtotal; o que passar fica para a próxima). Total nunca negativo; fatura de total 0 nasce paga.
- **Status da loja:** derivado das faturas abertas e de `past_due_since`. Só o ciclo, a confirmação e as ações do admin mudam o status, sempre a partir do status esperado.
- **Quitação (D3):** o valor que vale do comprovante paga faturas inteiras da mais antiga para a mais nova. A sobra vira crédito `overpayment`. Valor menor que a fatura mais antiga → `confirmPayment` recusa (422, "Valor menor que a fatura; recuse com o valor faltante").

## Mapa requisito → solução
| Requisito | Solução |
|---|---|
| SUB-FR-001 | `runBillingCycle`: para lojas `active`, `past_due` ou `suspended` com `next_due_at − 3 d ≤ hoje` e sem fatura do período (`invoices_store_period` único): numa transação, insere a fatura `monthly` (`period` = AAAA-MM do vencimento, `due_at` = `next_due_at`), liga as vendas (`sales.invoice_id`), aplica créditos, avança `next_due_at` (`nextDueAfter`) e registra `invoice.opened`. |
| SUB-FR-002 | `/painel/fatura` [10c]: `invoiceView` lista as faturas abertas (mais antiga primeiro) com as taxas (veículo, data, valor) lidas das vendas ligadas; **Pagar com Pix** → `/painel/pagamento` com o total em aberto. |
| SUB-FR-003 | `pixView`, `receiptUpload` e `submitReceipt` usam a fatura aberta mais antiga (ou a 1ª, se for o caso) e o total em aberto; só a 1ª mensalidade muda a loja para `payment_review`. Referência "Mensalidade mm/aaaa" na fila. |
| SUB-FR-004 | `confirmPayment` → `settleInvoices`: quita as faturas da mais antiga, cria crédito com a sobra e, sem fatura vencida em aberto, `past_due`/`suspended` → `active` (`past_due_since` nulo); avisa e invalida o cache se a loja estava suspensa. |
| SUB-FR-005 | `rejectPayment` da fatura mensal não muda o status da loja (só a 1ª volta a `registered`); aviso com o valor faltante (já existe). |
| SUB-FR-006 | O ciclo avisa o lojista na abertura (`invoice_due`, "vence em dd/mm · R$ X"); [4b] tem a seção "Vencem em 3 dias", com `wa.me` e a mensagem pronta. |
| SUB-FR-007 | O ciclo marca `past_due` e o `past_due_since`; o layout do painel mostra o alerta da fatura ("em atraso há N dias") com **Pagar agora**. |
| SUB-FR-008 | O ciclo suspende com `past_due_since + tolerância (regra) ≤ hoje`; `suspended` já fica fora de `LIVE_STATUSES` (vitrine, catálogo e [12g] desde a 006); `revalidateTag(STORES_TAG, VEHICLES_TAG)`. |
| SUB-FR-009 | Layout do painel com loja `suspended`: alerta [12f] (dias de atraso, total em aberto, **Pagar agora**); `store-access` libera o painel inteiro para `suspended` (hoje ele restringe, ajustar). |
| SUB-FR-010 | `/painel/conta`: `accountView` (plano, status, valor, próxima cobrança, Como pagar com a chave Pix e o WhatsApp do suporte das regras, fatura do mês, faturas anteriores) + o bloco Rede Caju da 009. |
| SUB-FR-011 | `/admin/assinaturas` (`subscriptions.view`): `subscriptionsView` com MRR (lojas `active`/`past_due`/`suspended` × mensalidade vigente), contagens e filtros na URL (`?filtro=`). |
| SUB-FR-012 | Cards com a linha por status; **Conferir** leva a `/admin/pagamentos`; `wa.me` com a mensagem pronta de cobrança. |
| SUB-FR-013 | `suspendStore` (`stores.suspend`, só `past_due`, ConfirmSheet) e `reactivateStore` (`stores.suspend`, só `suspended`, motivo de 3 a 200) → `past_due` com `past_due_since = agora` (a tolerância conta de novo). `activity_log` com o motivo. |
| SUB-FR-014 | Na abertura, a venda ganha o `invoice_id` (entra uma vez só). `sellers.undoSale` → `billing.refundSaleFee`: com a fatura aberta, tira a venda e recalcula; com a fatura paga, cria crédito `fee_refund`. |
| SUB-FR-015 | Avisos `store_suspended` e `store_reactivated` ao lojista; aos admins (perfis `admin`), aviso de loja suspensa. |
| SUB-FR-016 | [6c] mostra o total em aberto; a confirmação quita da mais antiga (D3); a loja só reativa sem fatura vencida aberta. |
| SUB-FR-017 | Sobra → crédito `overpayment`; valor menor que a fatura mais antiga → `confirmPayment` 422, e o admin usa **Recusar** com o valor faltante. |
| SUB-NFR-001 | Componentes base; e2e em 390 e 1280 px com `audit()` |
| SUB-NFR-002 | Cada etapa do ciclo muda a partir do status esperado e a fatura tem o índice único por período: rodar de novo não repete; teste de integração rodando duas vezes. |
| SUB-NFR-003 | `revalidateTag(..., { expire: 0 })` no cron ao suspender; `updateTag` na confirmação e na reativação do admin. |
| SUB-SEC-001 | Faturas, taxas e pagamentos sempre com `store_id` da sessão (`billing.manage`); de outra loja → 404. |
| SUB-SEC-002 | Valores calculados no servidor; `submitReceipt` só recebe `paidCents` e o arquivo (schema `.strict()`). |
| SUB-SEC-003 | `subscriptions.view` (admin, suporte) para [4b]; `stores.suspend` (admin) para suspender e reativar; o usuário da loja não tem `billing.manage`. |
| SUB-SEC-004 | `logActivity`: `invoice.opened` (sistema), `store.past_due`, `store.suspended` (sistema ou admin), `store.reactivated` (pagamento ou admin, com o motivo), `payment.confirmed` (faturas quitadas e o crédito). |
| SUB-SEC-005 | [12g] já não mostra motivo (006); teste que a página pública da loja suspensa não tem valor nem dias. |

## Modelo de dados
```ts
export const creditKind = pgEnum("credit_kind", ["overpayment", "fee_refund", "referral"]);
export const billingCredits = pgTable("billing_credits", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  kind: creditKind("kind").notNull(),
  amountCents: integer("amount_cents").notNull(),
  sourceId: uuid("source_id"),                   // pagamento ou venda de origem
  appliedInvoiceId: uuid("applied_invoice_id").references(() => invoices.id),
  ...timestamps,
}, (t) => [index("billing_credits_store_open").on(t.storeId).where(sql`${t.appliedInvoiceId} is null`)]).enableRLS();
// notice_kind + 'invoice_due', 'store_suspended', 'store_reactivated'
// invoices: index("invoices_open_due").on(t.status, t.dueAt)
```
`stores.next_due_at`, `billing_day`, `past_due_since`, `invoices` (`monthly`, `period`, taxas e crédito) e `sales.invoice_id` já existem. A migration é aditiva.

## Estratégia de testes
| Requisito | Unitário | Integração (PGlite) | e2e (staging) |
|---|---|---|---|
| SUB-FR-001 | cálculo da fatura | abre 3 dias antes com taxas e créditos; não abre duas vezes; avança o vencimento | — |
| SUB-FR-002/010 | — | `invoiceView`, `accountView` | fatura e Conta |
| SUB-FR-003/005 | — | comprovante da mensal não muda o status; recusa mantém | — |
| SUB-FR-004/016/017 | — | quita da mais antiga; sobra vira crédito; menor → 422; reativa | admin confirma e a loja volta |
| SUB-FR-006..009 | datas (São Paulo, fim de mês) | aviso, atraso no dia seguinte, suspensão depois da tolerância | painel com [12f]; catálogo [12g] |
| SUB-FR-011/012 | MRR | contagens, filtros, vencendo em 3 dias | [4b] |
| SUB-FR-013 | — | suspender e reativar com motivo (volta em atraso, tolerância de novo) | Suspender/Reativar |
| SUB-FR-014 | — | taxa uma vez; desfeita aberta sai; desfeita paga vira crédito | — |
| SUB-FR-015 | textos dos avisos | avisos ao lojista e aos admins | — |
| SUB-NFR-002 | — | ciclo 2× no mesmo dia sem repetir | — |
| SUB-SEC-001..005 | schema | loja B → 404; usuário da loja e suporte → 403 nas decisões; registro; [12g] sem dados | — |

O e2e controla a data pelo seed: o seed põe o vencimento da loja de teste no passado e a suíte chama o ciclo direto (rota do cron com o segredo do staging).

## Riscos e alternativas descartadas
- **`store-access` hoje restringe o painel da loja suspensa:** a regra da 004/001 muda para "painel inteiro + [12f]" (spec 011 e PRD §5.2); os testes de `store-access` são atualizados.
- **Fuso e fim de mês:** tudo em datas de São Paulo com as funções de `due-date.ts` (já testadas na 004).
- **Descartado: uma fatura acumulada** (decidido no `/clarify`).
- **Descartado: linhas de fatura numa tabela.** As taxas são as vendas ligadas pelo `sales.invoice_id`, e o crédito, `billing_credits`; não há dado duplicado.
- **Descartado: aceitar pagamento parcial de uma fatura.** A spec quer a fatura paga só com o total (SUB-FR-017).

## Decisões (aprovadas em 2026-11-23)
- **D1. Taxas lidas da tabela de vendas pelo `billing`**, e `sellers.undoSale` chama `billing.refundSaleFee`. **Recomendo:** a dependência fica num sentido só (`sellers` → `billing`), e a fatura não copia as vendas.
- **D2. Tabela `billing_credits`** para sobra de pagamento, taxa devolvida e, na 010, a recompensa do Caju Indica. **Recomendo:** um lugar só para todo crédito, aplicado na abertura da fatura.
- **D3. Quitação da mais antiga** com o valor que vale do comprovante: paga faturas inteiras, a sobra vira crédito, e valor menor que a fatura mais antiga não confirma (o admin recusa). **Recomendo:** concilia a SUB-FR-016 (R$ 100 paga só novembro) com a SUB-FR-017 (fatura só com o total).
- **D4. `next_due_at` avança na abertura da fatura**, não no pagamento. **Recomendo:** o vencimento segue o calendário mesmo com a loja em atraso, e o pagamento não move datas.
- **D5. Loja suspensa vê o painel inteiro** (edição permitida, PRD §5.2), com a [12f] no topo. Muda a regra de acesso de hoje.
- **D6. Contrato do cron:** a resposta ganha `opened`, `pastDue` e `suspended`; atualizar o `contract.md` da 006d.

## Ajustes de documento (na T001)
- **ARCHITECTURE §4:** `billing_credits`; **§6:** etapa do ciclo de cobrança no job diário.
- **API.md §5:** `/painel/fatura`, `/admin/assinaturas` e as actions (`suspendStoreAction`, `reactivateStoreAction`).
- **Contrato do cron** (`docs/specs/006d-search-alerts/contract.md`): campos novos e a etapa.
- **GLOSSARY:** Fatura mensal, Em atraso, Suspensa, Crédito.

## Conformidade
- [x] Todo requisito da spec aparece no mapa requisito → solução (17 FR, 3 NFR, 5 SEC)
- [x] Actions seguem o `API.md` §2:
  - schemas `.strict()`;
  - permissão em cada action;
  - `activity_log` nas mudanças de status e nos pagamentos;
  - idempotência pelo índice único por período e pelas transições a partir do status esperado.
- [x] Posse checada (`store_id` da sessão; outra loja → 404)
- [x] Valores calculados no servidor; nenhum schema aceita total, taxa, crédito ou status
- [x] Dados pessoais: nada novo (o aviso ao admin leva só o nome da loja)
- [x] Consultas novas com índice (faturas abertas por vencimento, créditos não aplicados)
- [x] Migration aditiva; nenhuma dependência nova
- [x] D1–D6 aprovadas em 2026-11-23; D5 muda a regra de acesso do painel e D6 muda o contrato do cron

## Ajustes do /implement
- **`stores.past_due_since`** não existia no banco (só no ARCHITECTURE): entrou na migration `0020` (T002).
- **D5:** o `store-access` já liberava o painel inteiro para `past_due` e `suspended` (001); a T013 só acrescentou os testes de acesso e de edição com a loja suspensa.
- **Reativar sem fatura vencida** em aberto devolve a loja a `active` (não a `past_due`), para não ficar presa em atraso sem nada a pagar.
- **e2e sem a rota do cron:** o `.env.local` não tem `CRON_SECRET`, então o seed roda o `runBillingCycle` real só na loja de teste da fatura (`scope.storeIds`, para não mexer nas outras lojas do staging); a rota do cron fica coberta pelo teste dela (Vitest).
- **[6c] da mensal em `/painel/fatura/pix`:** `/lojistas/pagamento` é só da loja recém-cadastrada (`store-access`); as duas telas usam o mesmo `PixPayment`.
- **Alerta do painel por slot (`banner`)** no `AreaLayout`, como o `navCounts`: `auth` não passa a depender de `billing`.
