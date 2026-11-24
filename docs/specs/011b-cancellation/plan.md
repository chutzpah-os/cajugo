---
spec: 011b
status: approved
---

# Plano · 011b Cancelamento e fim da assinatura

## Resumo técnico
**Domínios:** a assinatura continua no `billing`, e as trocas de status da loja passam pelo `stores.moveSubscription` da 011. O apagamento da loja arquivada é do `stores`, que pede a cada domínio para apagar o que é dele (`vehicles`, `leads`, `sellers`, `referrals`, `billing`).

**Cancelar** (`cancelSubscription`):
- **loja ativa:** passa a `cancel_scheduled`. Guarda `cancel_requested_at`, o motivo e `active_until = next_due_at`;
- **loja em atraso ou suspensa:** passa direto a `canceled`, com as faturas mensais abertas canceladas;
- **desfazer** (`undoCancel`): volta a `active` enquanto `now < active_until`.

**Job diário (ciclo da 011, etapas novas):**
1. `active_until ≤ hoje` → `canceled`: o crédito disponível expira, `canceled_at` é gravado, e o público deixa de ver a loja.
2. `canceled_at + retenção ≤ hoje` → `archived`: apaga os dados (D2).
3. Loja `registered` com `slug_reserved_until` vencido → o endereço vira provisório.

O ciclo não abre fatura de loja `cancel_scheduled` (CAN-FR-004).

**Reassinar:** a loja `canceled` volta a `registered` e faz o fluxo da 004 ([5d] → [6c] → confirmação). A 004 já ativa a loja com um novo dia de cobrança.

**Editar plano:** grava `membership_cents` com `valid_from` no futuro (vigência, ADR 0010). O `getSettings(db, now)` já escolhe o valor vigente na abertura de cada fatura. Avisa todos os donos de loja que pagam.

## Impacto
| Camada | Mudança |
|---|---|
| Dados (migration `0023`, só acrescenta) | `stores.cancel_requested_at`, `cancel_reason`, `active_until`, `canceled_at`; `notice_kind` + `cancel_scheduled`, `cancel_undone`, `store_canceled`, `plan_changed` |
| `src/domains/billing/` | `cancelSubscription`, `undoCancel`, `resubscribe`; etapas do ciclo `endCanceledPeriods`, `archiveCanceled`, `releaseUnpaidSlugs`; `editPlan`; `subscriptionsView` com os filtros novos; `accountView` com o cancelamento |
| `src/domains/stores/` | `archiveStore(tx, storeId)` (dados da loja, endereço livre) e `provisionalSlug(tx, storeId)`; a troca de endereço depois do provisório não conta no limite de 30 dias |
| Outros domínios | `vehicles.removeStoreVehicles` (devolve as fotos para apagar), `leads.removeStoreLeads`, `sellers.endStorePartnerships`; a recompensa (010) já não rende para loja cancelada (só faturas pagas) |
| `src/domains/auth/` | `deleteAccountOrRole(deps, profileId, "store_owner")`: apaga a conta no provedor de login se não sobra papel |
| `src/app/` | [12h] na Conta (ConfirmSheet com o motivo); aviso no `banner` do painel ("termina em dd/mm" + Desfazer); `loja/[slug]/not-found.tsx` "Esta loja não está mais na CajuGo"; [4b] filtros e **Editar plano**; o cron passa `auth` e `cloudinary` ao ciclo |
| Jobs | 3 etapas novas no `cron/daily` (contrato atualizado) |

## Interfaces dos serviços
```ts
// domains/billing/service.ts
cancelSubscription(deps, session, raw: { reason? })  // CAN-FR-001, 002, 009, SEC-001, 002, 004
undoCancel(deps, session)                            // CAN-FR-003
resubscribe(deps, session)                           // CAN-FR-006 (canceled → registered; segue a 004)
editPlan(deps, session, raw: { membershipCents; validFrom })   // CAN-FR-011 (só admin)
runBillingCycle(db, now, scope, ext?: { auth; cloudinary })
  : + { ended; archived; slugsReleased }             // CAN-FR-004, 005, 007, 008, NFR-002
```

**Regras escondidas no serviço:**
- `active_until` é o `next_due_at` no momento do cancelamento; o ciclo não abre a fatura de uma loja `cancel_scheduled`.
- Cada troca de status parte do status esperado (`moveSubscription`), então repetir não faz nada.
- **Arquivar** (em transação, por loja):
  - `vehicles`, fotos e leads apagados;
  - campos pessoais da loja zerados;
  - `slug` vira `arquivada-<8 do id>`;
  - a conta do dono é apagada se não sobra outro papel nem outra loja;
  - as fotos e a conta no provedor são apagadas depois do commit da transação; se falhar, o próximo job tenta de novo.

## Mapa requisito → solução
| Requisito | Solução |
|---|---|
| CAN-FR-001 | Conta [3c]: **Cancelar assinatura** abre a ConfirmSheet [12h] com a data `next_due_at`, a retenção das regras e o crédito disponível |
| CAN-FR-002 | `cancelSubscription`: motivo opcional entre `CANCEL_REASONS` (lista fixa no código, só texto); `active → cancel_scheduled`; `active_until = next_due_at` |
| CAN-FR-003 | `undoCancel`: `cancel_scheduled → active` se `now < active_until`; limpa as colunas; aviso `cancel_undone` |
| CAN-FR-004 | `openDueInvoices` só para `active`, `past_due` e `suspended` (já é assim: `BILLED_STATUSES` não tem `cancel_scheduled`) + teste |
| CAN-FR-005 | `endCanceledPeriods`: `cancel_scheduled` com `active_until ≤ hoje` → `canceled`, `canceled_at`; créditos disponíveis marcados como expirados (`applied_invoice_id` nulo → crédito apagado com registro); `sellers.endStorePartnerships`; `revalidateTag` no cron |
| CAN-FR-006 | `resubscribe`: `canceled → registered`; a Conta da loja cancelada leva a `/lojistas/pagamento` ([5d]); a confirmação da 004 ativa com um novo `billing_day` |
| CAN-FR-007 | `archiveCanceled`: `canceled_at + retention_days ≤ hoje` → `stores.archiveStore` + `vehicles.removeStoreVehicles` + `leads.removeStoreLeads` + `auth.deleteAccountOrRole`; fotos apagadas no Cloudinary; `archived` |
| CAN-FR-008 | `releaseUnpaidSlugs`: `registered` com `slug_reserved_until < now` → `stores.provisionalSlug` (`provisorio-<8 do id>`, `slug_changed_at = null`, `slug_reserved_until = null`); Minha loja permite a troca sem o limite de 30 dias quando o endereço é provisório |
| CAN-FR-009 | `cancelSubscription` com `past_due`/`suspended`: faturas mensais `open → canceled`, `→ canceled` na hora, `canceled_at = now` |
| CAN-FR-010 | `subscriptionsView`: filtros `cancelamento` e `canceladas`; linha "Termina em dd/mm · {motivo}" e "Cancelada em dd/mm" |
| CAN-FR-011 | `editPlan` (`settings.edit`, só admin): `validFrom ≥ hoje + 30 dias`, `insert setting_values(membership_cents, valid_from)`; aviso `plan_changed` aos donos de lojas `active`/`past_due`/`suspended`/`cancel_scheduled`; [4b] lista `wa.me` |
| CAN-FR-012 | Avisos `cancel_scheduled`, `cancel_undone`, `store_canceled` ao lojista e aos admins (`notifyStatusChange` estendido) |
| CAN-NFR-001 | Componentes base; e2e em 390 e 1280 px com `audit()` |
| CAN-NFR-002 | Etapas a partir do status esperado; `revalidateTag(STORES, VEHICLES)` no cron quando `ended` ou `archived` > 0 |
| CAN-SEC-001 | `storeId` sempre da sessão; não há id na entrada |
| CAN-SEC-002 | `billing.manage` (só o dono) para cancelar, desfazer e reassinar; `settings.edit` (só admin) para editar o plano |
| CAN-SEC-003 | Apagamento real (`delete` e colunas `null`), fotos com `destroy`, conta com `adminDeleteUser`; teste que confere o banco depois |
| CAN-SEC-004 | `logActivity`: `subscription.cancel_scheduled` (motivo), `subscription.cancel_undone`, `store.canceled`, `store.archived`, `store.slug_released`, `plan.edited` |
| CAN-SEC-005 | `showcase.storePage` devolve `{ kind: "gone" }` para `canceled`; a página chama `notFound()` e o `not-found.tsx` do segmento mostra "Esta loja não está mais na CajuGo" (`noindex`) |

## Modelo de dados
```ts
// stores +
cancelRequestedAt: timestamp("cancel_requested_at", { withTimezone: true }),
cancelReason: text("cancel_reason"),
/** Fim do período pago depois do cancelamento (o `next_due_at` daquele dia). */
activeUntil: timestamp("active_until", { withTimezone: true }),
canceledAt: timestamp("canceled_at", { withTimezone: true }),
// notice_kind + 'cancel_scheduled', 'cancel_undone', 'store_canceled', 'plan_changed'
```
O ARCHITECTURE já previa `cancel_at` e `active_until`; o nome fica `cancel_requested_at` para não confundir com o fim.

## Estratégia de testes
| Requisito | Unitário | Integração (PGlite) | e2e |
|---|---|---|---|
| CAN-FR-001..003, 009 | — | agendar, desfazer até o fim, atraso → cancelada na hora com as faturas canceladas; loja B e papéis | cancelar e desfazer na Conta |
| CAN-FR-004/005 | — | sem fatura no agendado; fim do período → cancelada, crédito expira, parcerias encerradas, fora da vitrine | — |
| CAN-FR-006 | — | reassinar → registered → confirmação → active, novo dia, mesmos veículos | — |
| CAN-FR-007, SEC-003 | — | arquivar apaga loja, veículos, fotos (fake), leads, conta sem outro papel, mantém faturas; conta com papel de vendedor só perde o papel | — |
| CAN-FR-008 | — | endereço provisório em 7 dias; troca livre depois | — |
| CAN-FR-010/011 | — | filtros; editar plano só ≥ 30 dias; fatura depois da data com o valor novo; avisos | [4b] Editar plano |
| CAN-SEC-005 | — | `storePage` → `gone` | `/loja/{slug}` cancelada: 404 e o texto |
| CAN-NFR-002 | — | ciclo 2× sem repetir | — |

Seed do e2e: uma loja de teste própria para cancelar e desfazer ("Cancela E2E").

## Riscos e alternativas descartadas
- **Risco: apagar no provedor de login e no Cloudinary fora da transação.** Se o banco commitar e o provedor falhar, o job seguinte tenta de novo (a loja `archived` sem `profile` apagado fica numa lista de pendentes pelo `owner_id`).
- **Descartado: guardar a dívida da loja que cancela em atraso.** Decidido no `/clarify`: as faturas abertas são canceladas.
- **Descartado: um 410 para a loja cancelada.** O App Router só tem `notFound()` (404); 404 com `noindex` resolve o SEO.

## Decisões (aprovadas em 2026-11-24)
- **D1.** Colunas novas em `stores` (`cancel_requested_at`, `cancel_reason`, `active_until`, `canceled_at`) e os 4 avisos novos.
- **D2.** O arquivamento roda no job diário e recebe `auth` (admin do Supabase) e `cloudinary`; o cron passa a criar esses clientes.
- **D3.** Editar plano = valor de `membership_cents` com vigência futura (ADR 0010), sem tabela de planos.
- **D4.** A loja cancelada responde 404 pelo `not-found.tsx` do segmento `/loja/[slug]`, com o texto "Esta loja não está mais na CajuGo" (vale também para endereço inexistente, que hoje é genérico).
- **D5.** Os motivos de cancelamento são uma lista fixa no código (texto, não regra numérica).
- **D6** (na implementação, 2026-11-24). O índice único `invoices_first_per_store` (uma 1ª mensalidade por loja, para sempre) vira `invoices_first_open_per_store` (uma 1ª mensalidade **aberta** por vez), na migration `0023`: reassinar abre uma nova 1ª mensalidade. Não apaga dado.
- **D7** (na implementação, 2026-11-24). No arquivamento:
  - o perfil de quem perde a conta fica **anônimo** ("Conta apagada", e-mail inválido, sem celular, CPF nem Pix), em vez de apagado: `stores.owner_id`, `payments.submitted_by` e `sales.confirmed_by` apontam para ele e são guardados;
  - os usuários da loja seguem a mesma regra do dono;
  - o veículo **com venda registrada** fica sem fotos, porque a venda e a taxa dela continuam na contabilidade e no extrato do vendedor; os outros veículos são apagados;
  - os comprovantes dos pagamentos são apagados no Cloudinary (o valor do pagamento fica);
  - arquivos e contas de login são apagados **antes** da transação; se falharem, a loja continua cancelada e o próximo job tenta de novo (conta que já não existe conta como apagada).

## Ajustes de documento (na T001)
- **ARCHITECTURE §4:** as colunas novas de `stores`; **§6:** as 3 etapas do job.
- **API.md §5:** `cancelSubscriptionAction`, `undoCancelAction`, `resubscribeAction`, `editPlanAction`.
- **Contrato do cron (006d):** `ended`, `archived`, `slugsReleased`.
- **GLOSSARY:** Cancelamento agendado, Arquivada, Endereço provisório.

## Conformidade
- [x] Todos os requisitos estão no mapa (12 FR, 2 NFR, 5 SEC)
- [x] Actions seguem o `API.md` §2:
  - schema `.strict()`;
  - permissão em cada action;
  - `storeId` da sessão;
  - registro de atividade;
  - idempotência pelo status esperado.
- [x] LGPD: apagamento real depois da retenção; nada pessoal no registro
- [x] Migration só acrescenta; nenhuma dependência nova
- [x] D1–D5 aprovadas em 2026-11-24
