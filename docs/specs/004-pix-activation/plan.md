---
spec: 004
status: approved
---

# Plano · 004 Pix manual e ativação da loja

## Resumo técnico
Novo domínio **`billing`**: fatura e pagamento, desenhado para a cobrança inteira. Nesta spec só se cria a fatura `first`, mas o modelo, a fila [10b] e as transições já são as que a spec 011 usa para as faturas mensais; a 011 só acrescenta a criação mensal e os jobs.

Fluxo:
1. **[5d]** O lojista informa o CPF/CNPJ (`startCheckout`). O documento fica na loja, a autoindicação é conferida e a fatura da 1ª mensalidade é aberta com o valor da regra `membership_cents` vigente.
2. **[6c]** Mostra a chave, o QR estático (BR Code gerado por nós, sem dependência nova) e o upload **privado** do comprovante (Cloudinary `authenticated`).
3. **Envio.** `submitReceipt` confere o arquivo no Cloudinary e apaga o arquivo recusado. Depois cria o pagamento `submitted` e passa a loja para `payment_review`.
4. **[10b]** O admin confirma ou recusa com uma atualização condicional (`where status = 'submitted'`), que garante uma conferência só. A confirmação faz, numa transação:
   - marca a fatura `paid`;
   - ativa a loja, com `billing_day` e `next_due_at`;
   - grava o aviso no painel e o `activity_log`;
   - devolve o link `wa.me`.
5. **Comprovante.** Só se vê por uma rota nossa, que confere a sessão a cada abertura e entrega o arquivo. Nenhuma URL do Cloudinary chega ao navegador.

Avisos no painel viram um domínio próprio, **`notices`**. Ele é genérico: leads, parceria e indicação usam o mesmo mecanismo depois (ADR 0007).

## Impacto
| Camada | Mudança |
|---|---|
| Dados (migration `0008`) | enums `invoice_kind`, `invoice_status`, `payment_status`, `payment_method`, `tax_id_type`, `notice_kind`; `referral_status` + `rejected`; tabelas `invoices`, `payments`, `notices`; colunas em `stores` (`tax_id`, `tax_id_type`, `billing_day`, `next_due_at`, `activated_at`) e em `referrals` (`reject_reason`); valor inicial da regra `membership_cents` em `setting_values` |
| `src/platform/` | `br/tax-id.ts` (CPF/CNPJ: validar, normalizar, mascarar; a validação sai de `settings/definitions.ts`); `pix/br-code.ts` (payload EMV + CRC16); `cloudinary`: upload `authenticated`, `verifyUpload` por tipo, `destroy`, `fetchPrivate` (arquivo privado lido só pelo servidor) |
| `src/domains/billing/` | `service.ts`, `actions.ts`, `schemas.ts`, `due-date.ts`, `components/` ([5d], [6c], [10a], [12e], [10b]) |
| `src/domains/notices/` | `service.ts` (`notify`, `noticesFor`, `dismiss`), `components/notice-list.tsx` |
| `src/domains/stores/` | `isStoreLive(status)`; `markPaymentReview`, `activateFirstTime`, `backToRegistered` (transições do status, chamadas pelo `billing`); `onboardingStatus` |
| `src/domains/referrals/` | `checkSelfReferralByTaxId(tx, storeId)`, nos dois sentidos (loja indicada × quem indicou) |
| `src/domains/settings/` | regra `membership_cents` ("Mensalidade do Plano Catálogo", grupo Pagamento); a regra `pix` ganha `city` (ver D1) |
| `src/domains/auth/` | permissão `payments.view` (admin, suporte) |
| `src/app/` | `/lojistas/pagamento` ([5d] + [12e]), `/lojistas/pagamento/pix` ([6c]), `/painel/pagamento` ([10a]), `/admin/pagamentos` ([10b]), `/painel/veiculos` (banner e primeiros passos [5e]), Route Handler `GET /api/v1/payments/[id]/receipt` |
| Jobs | nenhum (vencimentos e atraso: 011) |

## Interfaces dos serviços (módulos profundos)
`billing/service.ts`: poucas funções públicas, regra escondida. `storeId` sempre vem da sessão; o admin recebe ids e a posse é conferida aqui.
```ts
checkoutView(db, session): Promise<CheckoutView>            // [5d]: plano, valor, loja, documento mascarado, pixReady, último pagamento recusado ([12e])
startCheckout(deps, session, input: { taxId }): Promise<void> // valida, grava, autoindicação, abre/reaproveita a fatura first
pixView(db, session): Promise<PixView>                       // [6c]: valor da fatura aberta, chave, favorecido, BR Code, prazo
receiptUpload(deps, session): Promise<SignedUpload>          // pasta receipts/{storeId}, public_id receipt-{uuid}, type authenticated
submitReceipt(deps, session, input: { publicId, paidCents }): Promise<void>
reviewQueue(db, session): Promise<QueueView>                 // [10b] admin/suporte: aguardando, totais, pixReady
confirmPayment(deps, session, input: { paymentId, amountCents? }): Promise<{ whatsappUrl }>
rejectPayment(deps, session, input: { paymentId, reason, amountCents? }): Promise<void>
registerManualPayment(deps, session, input: { storeId, method, amountCents, note }): Promise<{ whatsappUrl }>
findStoresToCharge(db, session, query): Promise<StoreHit[]>   // busca por nome ou endereço para o registro manual
receiptFile(deps, session, paymentId): Promise<{ body, contentType }> // admin, suporte ou dono; outra loja: 404
```
`due-date.ts` (pura): `firstDueDate(confirmedAt) → { billingDay, nextDueAt }` e `nextDueAfter(date, billingDay)`. O dia é contado em America/Sao_Paulo; se o mês não tem o dia, vence no último dia do mês. A 011 reaproveita as duas funções.

## Mapa requisito → solução
| Requisito | Solução |
|---|---|
| PIX-FR-001 | `checkoutView` lê `membership_cents` vigente (`getSettings`), nome da loja; texto fixo do plano em [5d] |
| PIX-FR-002 | `taxIdSchema` (`platform/br/tax-id.ts`, módulo 11; 11 dígitos = CPF, 14 = CNPJ); `startCheckout` grava `stores.tax_id`/`tax_id_type` e leva a [6c] |
| PIX-FR-003 | em `startCheckout`, `checkSelfReferralByTaxId`: compara o documento da loja indicada com o de quem indicou (`profiles.cpf` ou `tax_id` da loja do indicador); igual → `referrals.status = rejected`, `reject_reason = self_referral`. O mesmo serviço roda quando o **indicador** informa documento depois (o próprio [5d] dele aqui; o CPF do resgate na 010 chama a mesma função). Nada vai para a tela do indicado |
| PIX-FR-004 | `pixView`: chave e favorecido da regra `pix`, valor da fatura aberta, `brCode({ key, name, city, amountCents, txid })` → `qrcode` (já instalado) e "copia e cola"; prazo de `review_business_days`. Sem chave: `pixReady = false` → [5d] mostra o aviso com `whatsappLink(support_whatsapp)` e o botão desabilitado; [10b] mostra "Chave Pix não configurada" |
| PIX-FR-005 | componente com pré-visualização (imagem por `URL.createObjectURL`; PDF mostra nome e tamanho), limite de 10 MB no navegador e no servidor; campo "Valor pago" em reais → centavos; botão só habilita com arquivo e valor |
| PIX-FR-006 | `submitReceipt`, numa transação: fatura `open`, sem pagamento `submitted` (índice único parcial `payments(invoice_id) where status='submitted'`), insere o pagamento, `stores.markPaymentReview`. Redireciona para `/painel/pagamento` [10a]; o login já leva para lá (`landingFor`, spec 001); [10a] não tem envio |
| PIX-FR-007 | `reviewQueue`: `payments where status='submitted' order by submitted_at` (índice `payments(status, submitted_at)`), com loja, referência por `invoice.kind`, valor pago, horário; totais: aguardando e confirmados no mês (America/Sao_Paulo); arquivo aberto pela rota privada |
| PIX-FR-008 | `paid_cents ≠ invoice.total_cents` → alerta; `confirmPayment`/`rejectPayment` aceitam `amountCents` corrigido; o pagamento guarda `paid_cents` (informado) e `amount_cents` (o que vale); `activity_log` guarda os dois |
| PIX-FR-009 | `confirmPayment`: `update payments set status='confirmed' … where id=? and status='submitted' returning`, fatura `paid`, `stores.activateFirstTime(tx, storeId, at)` (`status=active`, `billing_day`, `next_due_at`, `activated_at`, `slug_reserved_until = null`), aviso `payment_confirmed`, `activity_log`, `whatsappLink(store.whatsapp, mensagem)`; `updateTag(STORES_TAG)` |
| PIX-FR-010 | `rejectPayment`: motivo 3–300 caracteres; atualização condicional; `stores.backToRegistered`; aviso `payment_rejected` com motivo e faltante (`total − amount`, se positivo); a fatura continua `open`; [12e] em `/lojistas/pagamento` quando o último pagamento da fatura aberta está `rejected` |
| PIX-FR-011 | `registerManualPayment`: loja `registered` ou `payment_review` sem pagamento em análise (se houver: "Confira o comprovante pendente"); fatura first aberta (cria se faltar); pagamento `confirmed`, `manual = true`, `method` (`cash`, `transfer`, `pix`, `other`), `note`; mesmo caminho de ativação do FR-009 |
| PIX-FR-012 | `stores.onboardingStatus`: assinatura ativa ✓; primeiro veículo (contagem de `vehicles` quando existir, spec 005; até lá, `false`); loja completa = logo, capa, sobre e horário; banner em `/painel/veiculos` enquanto houver passo pendente; o botão leva a `/painel/veiculos/novo` (rota da 005, D3) |
| PIX-FR-013 | `notices.notify(tx, { profileId, kind, data })` na confirmação e na recusa; `noticesFor(session)` no topo do painel (mais recentes, não dispensados); "Dispensar" grava `dismissed_at` |
| PIX-FR-014 | `publicStore` usa `isStoreLive(status)` = `active`, `past_due`, `cancel_scheduled` (PRD §5.5; corrige o filtro só `active` da 003); a confirmação invalida o cache da loja |
| PIX-NFR-001 | componentes de `src/ui` (alvos ≥ 44 px, `TextField` com rótulo); `audit()` no e2e das 6 telas |
| PIX-NFR-002 | todas sob `/painel`, `/admin` ou `/lojistas/pagamento` (já em `robotsRules` e fora do sitemap) + `robots: { index: false }` no metadata; teste de `robotsRules` cobre `/lojistas/pagamento/pix` |
| PIX-SEC-001 | `storeId` da sessão em tudo do lojista; `submitReceipt` aceita só `{pasta receipts/{storeId}}/receipt-{uuid}` exato (regex, como na 003); `receiptFile` de outra loja → 404 |
| PIX-SEC-002 | upload assinado com `type=authenticated`, formatos `jpg,png,webp,heic,pdf`; `verifyUpload` confere formato e ≤ 10 MB e **apaga** o arquivo recusado (`destroy`); a rota privada entrega o arquivo com `Cache-Control: private, no-store` e `Content-Disposition: inline`, sem expor URL do Cloudinary; nenhum link sobrevive à sessão (D2) |
| PIX-SEC-003 | `payments.review` (admin) para confirmar, recusar e registrar; `payments.view` (admin, suporte) para fila e arquivo; o suporte vê a fila sem botões; actions conferem no servidor |
| PIX-SEC-004 | o valor esperado é `invoice.total_cents`, fixado na abertura da fatura pela regra vigente; schemas `.strict()` sem `storeId`, `invoiceId` nem valor esperado; `activity_log`: `payment.submitted`, `payment.confirmed`, `payment.rejected`, `payment.manual` com loja, valores, referência e motivo |
| PIX-SEC-005 | `maskTaxId` na saída para o dono; documento puro só no admin; `checkCode`/`publicStore` nunca leem `tax_id`; o documento não vai para o log |
| PIX-SEC-006 | `billing.manage` (só `store_owner`) em todas as actions do lojista; o usuário da loja já é desviado das telas (`store-access`, spec 001) |
| PIX-SEC-007 | atualização condicional por status dentro da transação; 0 linhas → 409 "Este comprovante já foi conferido."; índice único parcial impede dois `submitted` na mesma fatura |

## Modelo de dados (migration `0008`, aditiva)
```ts
export const invoiceKind = pgEnum("invoice_kind", ["first", "monthly"]);
export const invoiceStatus = pgEnum("invoice_status", ["open", "paid", "overdue", "canceled"]);
export const paymentStatus = pgEnum("payment_status", ["submitted", "confirmed", "rejected"]);
export const paymentMethod = pgEnum("payment_method", ["pix", "cash", "transfer", "other"]);
export const taxIdType = pgEnum("tax_id_type", ["cpf", "cnpj"]);
export const noticeKind = pgEnum("notice_kind", ["payment_confirmed", "payment_rejected"]); // cresce por spec

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  kind: invoiceKind("kind").notNull(),
  period: text("period"),                    // AAAA-MM nas mensais (011); null na first
  membershipCents: integer("membership_cents").notNull(),
  feesCents: integer("fees_cents").notNull().default(0),
  creditCents: integer("credit_cents").notNull().default(0),
  totalCents: integer("total_cents").notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  status: invoiceStatus("status").notNull().default("open"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("invoices_first_per_store").on(t.storeId).where(sql`kind = 'first'`),
  uniqueIndex("invoices_store_period").on(t.storeId, t.period),
  index("invoices_store_status").on(t.storeId, t.status),
]);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  paidCents: integer("paid_cents"),          // informado pelo lojista (null no registro manual)
  amountCents: integer("amount_cents").notNull(), // o que vale (corrigido pelo admin, se for o caso)
  receiptPublicId: text("receipt_public_id"),     // null no registro manual
  receiptFormat: text("receipt_format"),
  status: paymentStatus("status").notNull(),
  rejectReason: text("reject_reason"),
  manual: boolean("manual").notNull().default(false),
  method: paymentMethod("method").notNull().default("pix"),
  note: text("note"),
  submittedBy: uuid("submitted_by").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
  reviewedBy: uuid("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
}, (t) => [
  index("payments_status_submitted").on(t.status, t.submittedAt),
  index("payments_store").on(t.storeId, t.submittedAt),
  uniqueIndex("payments_one_in_review").on(t.invoiceId).where(sql`status = 'submitted'`),
]);

export const notices = pgTable("notices", {
  id: uuid("id").primaryKey(),
  profileId: uuid("profile_id").notNull(),   // quem vê (lojista; vendedor e indicador nas próximas specs)
  kind: noticeKind("kind").notNull(),
  data: jsonb("data").notNull(),             // só o necessário para a frase (motivo, valores); sem dado pessoal
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
}, (t) => [index("notices_profile_open").on(t.profileId, t.createdAt)]);

// stores: + taxId text, taxIdType tax_id_type, billingDay smallint, nextDueAt timestamptz, activatedAt timestamptz
//         + index stores(tax_id)  (autoindicação no sentido inverso)
// referrals: + rejectReason text; referral_status ADD VALUE 'rejected'
// setting_values: INSERT membership_cents = 10000 (valid_from = now())
// profiles.cpf (já previsto no ARCHITECTURE) entra na 008/010; aqui só é lido se existir
```
`ARCHITECTURE.md` §4 é atualizado: `stores.cnpj` vira `tax_id` + `tax_id_type`, já que o lojista pode pagar com CPF. Entram também `invoices.kind`, `payments.paid_cents`/`method`/`note` e a tabela `notices`.

## Testes
- **Unitários:**
  - `tax-id` (CPF/CNPJ válidos, inválidos, repetidos, máscara);
  - `br-code`: payload de exemplo do manual do BACEN e CRC16;
  - `due-date`: 26/11 → 26/12; 31/01 → 28/02 → 31/03; 29/02 em ano bissexto; virada de dia em São Paulo;
  - `isStoreLive`.
- **Integração (PGlite, `createTestDb`)**, cada requisito com o ID no nome:
  - FR-001 a FR-014;
  - SEC-001 (loja B × loja A em `submitReceipt`, `receiptFile` e `pixView`);
  - SEC-003 (suporte, lojista e usuário da loja em confirmar, recusar e registrar);
  - SEC-004 (campo extra recusado; log com valores);
  - SEC-005 (máscara; `checkCode` e `publicStore` sem documento);
  - SEC-007 (duas confirmações em paralelo → uma ativação, um 409).

  O Cloudinary é testado pelo `fake-cloudinary`, com `authenticated`, `destroy` e `fetchPrivate`.
- **Route Handler:** sem sessão → 401; outra loja → 404; dono e admin → arquivo com `no-store`.
- **Ponta a ponta (staging, 390 px):**
  - lojista: [5d] → [6c] (copiar, QR, envio real de PNG e de PDF) → [10a];
  - admin: [10b] recusa → [12e] reenvio → confirma → [5e] e `/loja/{slug}` abre;
  - suporte sem botões;
  - usuário da loja bloqueado;
  - registro manual;
  - `audit()` nas telas;
  - o seed do e2e devolve a loja de teste a `active` e limpa faturas e pagamentos das lojas do e2e de cadastro.

## Riscos e alternativas descartadas
- **URL assinada do Cloudinary no navegador para ver o comprovante:** descartada. A URL assinada de entrega não expira, a de download com `expires_at` depende de detalhe do plano, e o plano gratuito bloqueia entrega de PDF por padrão. Pela rota nossa, a sessão é conferida a cada abertura e o PDF é lido pelo servidor com a Admin API. Custo: tráfego da função, pequeno, porque comprovantes têm poucos KB/MB e são abertos poucas vezes.
- **Biblioteca de BR Code:** descartada. O formato EMV do BACEN é curto e estável. Implementamos com teste contra o exemplo oficial, sem dependência nova.
- **Documento no perfil em vez da loja:** descartado. O CPF/CNPJ é de quem paga a loja (nota fiscal). `profiles.cpf` fica para vendedor e indicador, como já previsto.
- **Status da indicação "não válida" só no log:** descartado. Vira status (`rejected`), para a 010 nunca pagar recompensa dessa indicação.
- **Risco: PDF no Cloudinary gratuito.** Upload de PDF como `image/authenticated` é aceito, mas a entrega pública fica bloqueada. Para nós isso é bom, porque só a Admin API lê. A primeira task faz uma prova no staging (upload e leitura de PNG e PDF `authenticated`) antes das telas.
- **Risco: corrida no envio** (duas abas). O índice único parcial garante um pagamento em análise por fatura; o segundo envio recebe "Já recebemos um comprovante. Aguarde a conferência." e o arquivo dele é apagado.

## Decisões (aprovadas)
- **D1. Cidade do favorecido na regra Pix.** O BR Code exige nome (até 25 letras) e cidade (até 15) de quem recebe. Recomendo acrescentar "Cidade do favorecido" à regra `pix` da spec 002, obrigatória. Como a chave do prod ainda está vazia, nada quebra. No staging, o admin salva a regra de novo, e até isso o [6c] não mostra o QR. Alternativa: cidade fixa "ARACAJU" no código, que contraria o PRD §5.14.
- **D2. Comprovante pela rota nossa** (`GET /api/v1/payments/{id}/receipt`, com `contract.md`) em vez de link do Cloudinary. Recomendo: é a forma que não precisa ser refeita (funciona igual para PDF, para os documentos do vendedor na 008 e na saída para a VPS).
- **D3. "Cadastrar primeiro veículo" aponta para `/painel/veiculos/novo`, a rota definitiva da 005.** Não crio tela provisória. Nenhuma loja real entra antes do lançamento (013), e a 005 é a próxima spec, que cria essa rota. Recomendo mostrar o botão sempre, já com o destino final. A alternativa seria escondê-lo até a 005, mas aí o 004 teria uma regra temporária para desfazer depois.
- **D4. Endurecer o upload público agora:** o `verifyUpload` que apaga o arquivo recusado vale também para logo e capa (resolve parte da nota da 005 no PLAN). Recomendo sim. Fica no mesmo módulo e não muda comportamento visível.

## Conformidade
- [x] Todo requisito da spec aparece no mapa requisito → solução (14 FR, 2 NFR, 7 SEC)
- [x] Actions e rotas seguem o `API.md` §2: schemas `.strict()` com limites; sessão; `storeId` da sessão; saída montada à mão (`CheckoutView`, `PixView`, `QueueView`); idempotência por status (confirmar/recusar condicionais, um pagamento em análise por fatura, `startCheckout` reaproveita a fatura aberta)
- [x] Toda action/rota com id checa a posse (`SECURITY.md` §4): `paymentId` só para admin/suporte ou o dono (outra loja → 404); `storeId` só no registro manual, que é só do admin
- [x] Schemas de entrada não aceitam campos privilegiados (`storeId`, `invoiceId`, valor esperado, status)
- [x] Dados pessoais novos estão na tabela do `SECURITY.md` §8: CPF/CNPJ e comprovantes já estão; acrescentar "valor pago e motivo de recusa: só ao dono e ao admin/suporte"
- [x] Formulário público tem honeypot + rate limit: não há formulário público novo (todas as telas exigem sessão)
- [x] Consultas novas têm índice previsto: fila (`payments(status, submitted_at)`), pagamentos da loja, faturas por loja/status, avisos por perfil, `stores(tax_id)`
- [x] Migrations aditivas: só `CREATE`, `ADD COLUMN` e `ADD VALUE`
- [x] Nada do Supabase além de Postgres e Auth
- [x] D1–D4 aprovadas nas opções recomendadas (2026-11-08, ao iniciar o `/implement`)
