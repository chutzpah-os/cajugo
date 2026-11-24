---
spec: 010
status: approved
---

# Plano · 010 Caju Indica · indicação, recompensa e saldo

## Resumo técnico
Tudo no domínio `referrals`, que já tem os códigos (`referral_codes`), as indicações (`referrals`) e a autoindicação (003, 004).

**Recompensas**
- Ficam numa tabela nova, `referral_rewards`, com uma linha por fatura paga da loja indicada e índice único por fatura. Isso torna a recompensa idempotente (IND-NFR-003).
- A `billing` chama `referrals.rewardPaidInvoices(tx, invoiceIds, now)` em todo lugar onde uma fatura vira paga:
  - 1ª mensalidade confirmada ou registrada sem comprovante;
  - mensais quitadas na confirmação;
  - fatura que nasce paga com crédito;
  - fatura zerada por taxa desfeita.
- A função grava as recompensas e **devolve** os créditos que a `billing` deve lançar para os lojistas, no `billing_credits` com `kind = referral`. Assim a dependência fica num sentido só, `billing → referrals`, que já existe.
- Rende a fatura que está entre as **N primeiras** da loja indicada (a 1ª e as mensais pela ordem de vencimento), com N vindo das regras.
- O valor é o percentual vigente sobre a mensalidade daquela fatura.

**Quem recebe:**
- quem indicou e é dono de loja recebe crédito na fatura da loja;
- os outros (vendedor, indicador) recebem saldo;
- a soma das recompensas de saldo é o saldo (os resgates vêm na 010b);
- link de campanha (sem `profile_id`) não rende.

**Status mostrado na tela**
- O banco guarda só três coisas: `rejected`, `months_paid` e `active` (a partir da 1ª recompensa).
- O resto é calculado na leitura:
  - **Cadastrada:** ainda não rendeu;
  - **Ativa** ou **Pausada:** depende do status da loja indicada (em atraso ou suspensa → Pausada);
  - **Encerrada:** já rendeu N vezes.
- Nada precisa ser sincronizado quando a loja atrasa.

## Impacto
| Camada | Mudança |
|---|---|
| Dados (migration `0022`, só acrescenta) | Tabela `referral_rewards`; enum `reward_target` (`credit`, `balance`); `notice_kind` + `referral_active`, `referral_reward` |
| `src/domains/referrals/` | `rewardPaidInvoices`, `referralPanel` ([8a]/[9d]), `referralsList` ([8b], filtros), `balanceView` ([9d]), `landing` ([8c]), `registerReferrer` ([9b]), `programBanner` ([9a]); `checkCode` respeita "programa ativo" e "quem pode indicar"; `getOrCreateCode` também respeita |
| `src/domains/billing/` | Chama `rewardPaidInvoices` onde a fatura vira paga e lança o crédito; `creditView` ([8e]: disponível, demonstrativo, movimentações) |
| `src/domains/auth/` | Área `indica` aberta para `referrer` e `seller`; o lojista usa `/painel/indica` (permissão `store.referral`, que já existe) |
| `src/domains/notices/` | Os 2 avisos novos |
| `src/app/` | `/i/[codigo]` vira página (landing [8c], `noindex`), no lugar do `route.ts`; `/painel/indica`, `/painel/indica/indicacoes`, `/painel/indica/credito`; `/indica/cadastro` [9b]; `/indica` [9d] de verdade; banner e rodapé [9a] na vitrine |
| Jobs | Nenhum |

## Interfaces dos serviços (módulos profundos)
```ts
// domains/referrals/service.ts
rewardPaidInvoices(tx, invoiceIds: string[], now)
  : Promise<{ storeId; amountCents; rewardId }[]>    // IND-FR-006..009, NFR-003, SEC-005, 006
referralPanel(db, session, now)
  : Promise<{ enabled; code; url; pctBps; months; role: "store" | "person" } | null>
                                                     // IND-FR-001, 002, 015
referralsList(db, session, raw: { filtro? })
  : Promise<{ counts; items: { store; status; earnedCents; monthsLeft }[] }>
                                                     // IND-FR-005, 017, SEC-001, 002
balanceView(db, session)
  : Promise<{ balanceCents; minCents; progress; movements }>   // IND-FR-010
landing(db, code)
  : Promise<{ referrerName; membershipCents; signupUrl } | { referrerName: null; … }>
                                                     // IND-FR-003
registerReferrer(deps, session | null, form, ctx)    // IND-FR-004 (honeypot + rate limit)
programBanner(db)
  : Promise<{ pctBps; months; membershipCents } | null>   // IND-FR-014 (cache com SETTINGS_TAG)

// domains/billing/service.ts
creditView(deps, session)
  : Promise<{ availableCents; nextInvoice: { membershipCents; creditCents; totalCents }; movements }>
                                                     // IND-FR-009
```

## Mapa requisito → solução
| Requisito | Solução |
|---|---|
| IND-FR-001 | `/painel/indica` [8a]: `referralPanel` (código do dono, `getOrCreateCode`), chamada com `referral_pct_bps`/`referral_months` das regras, Copiar, `wa.me`, Como funciona, atalhos |
| IND-FR-002 | `referralPanel` cria o código no 1º acesso (um por pessoa: `referral_codes.profile_id` único, já existe), separado de `sellers.code` |
| IND-FR-003 | `/i/[codigo]/page.tsx`: `landing` (primeiro nome, mensalidade das regras), `robots: noindex`, link para `/lojistas/cadastro?codigo=`; sem código válido ou com o programa desligado, landing sem indicação |
| IND-FR-004 | `/indica/cadastro` [9b]: `registerReferrer` (cria a conta pelo `auth`, com papel `referrer`; conta existente entra e ganha o papel, como no 008), honeypot + rate limit (`withinPublicFormLimits`), termos |
| IND-FR-005 | `referralsList`: filtros `todas\|rendendo\|cadastradas\|pausadas` na URL; status calculado; `earnedCents` (soma das recompensas), `monthsLeft` (N − `months_paid`) |
| IND-FR-006 | `rewardPaidInvoices`: indicação válida com quem indicou; 1ª fatura paga → `status = active`, recompensa, `months_paid = 1`, aviso `referral_active` |
| IND-FR-007 | A fatura rende se `posição na ordem das faturas da loja < N` e ainda não rendeu (índice único `referral_rewards(invoice_id)`); depois da N-ésima, Encerrada |
| IND-FR-008 | Pausada é calculada: loja indicada `past_due`/`suspended`. A mensalidade atrasada rende quando é paga (mesma regra de posição) |
| IND-FR-009 | Lojista: `billing` lança `billing_credits(kind = referral, source_id = reward)`, abatido na abertura da fatura (011); `/painel/indica/credito` [8e] com `creditView` |
| IND-FR-010 | `/indica` [9d]: `balanceView` (soma das recompensas de saldo; resgates na 010b), barra até `payout_min_cents`, movimentações |
| IND-FR-014 | `programBanner` em `'use cache'` com `SETTINGS_TAG`; banner e rodapé na vitrine `/` e `/vitrine`; destino `/indica` (com sessão de indicador ou vendedor), `/painel/indica` (lojista) ou `/indica/cadastro` |
| IND-FR-015 | `checkCode` e `getOrCreateCode` conferem `referral_enabled` e `referral_who` do papel de quem indicou; `rewardPaidInvoices` não confere (as indicações existentes rendem até o fim) |
| IND-FR-016 | Avisos `referral_active` e `referral_reward` (loja, valor, crédito ou saldo) na mesma transação |
| IND-FR-017 | `rejected` nunca rende; a lista mostra "Não válida" sem `reject_reason` |
| IND-NFR-001 | Componentes base; e2e em 390 e 1280 px com `audit()` |
| IND-NFR-002 | O banner entra no componente da vitrine que já é cacheado; `updateSettings` já chama `updateTag(SETTINGS_TAG)` |
| IND-NFR-003 | Índice único por fatura e chamada dentro da transação da confirmação |
| IND-SEC-001 | Tudo pelo `profileId` da sessão; o crédito pela loja da sessão |
| IND-SEC-002 | Saída montada à mão: só o nome da loja e o status |
| IND-SEC-004 | Nenhuma action escreve recompensa, crédito ou saldo; só a confirmação do admin gera |
| IND-SEC-005 | O valor sai de `invoices.membership_cents` × `referral_pct_bps` vigente em `now` |
| IND-SEC-006 | `logActivity`: `referral.activated`, `referral.rewarded`, sem dado pessoal |

## Modelo de dados
```ts
export const rewardTarget = pgEnum("reward_target", ["credit", "balance"]);
export const referralRewards = pgTable("referral_rewards", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  referralId: uuid("referral_id").notNull().references(() => referrals.id),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id).unique(), // 1 por fatura
  beneficiaryId: uuid("beneficiary_id").notNull().references(() => profiles.id),
  target: rewardTarget("target").notNull(),
  amountCents: integer("amount_cents").notNull(),
  ...timestamps,
}, (t) => [index("referral_rewards_beneficiary").on(t.beneficiaryId, t.createdAt)]).enableRLS();
// notice_kind + 'referral_active', 'referral_reward'
```
O ARCHITECTURE previa `rewards` e `payouts`. Esta spec cria só `referral_rewards` (o nome deixa claro que é do Caju Indica); `payouts` fica para a 010b.

## Estratégia de testes
| Requisito | Unitário | Integração (PGlite) | e2e (staging) |
|---|---|---|---|
| IND-FR-001/002/015 | — | código criado uma vez; programa desligado ou papel fora → sem código, código recusado | [8a] |
| IND-FR-003 | — | landing com e sem código, programa desligado | [8c] com `noindex` e o link |
| IND-FR-004 | schema | cadastro novo e conta existente; honeypot; rate limit | [9b] → [9d] |
| IND-FR-005/017 | — | filtros, status calculado, não válida sem motivo, sem dados pessoais | [8b] |
| IND-FR-006..009, NFR-003, SEC-005 | — | 1ª paga → ativa e R$ 30; até N; atrasada paga rende; pausa calculada; confirmar 2× não repete; regra mudada vale para a fatura nova; crédito do lojista abatido na fatura | — |
| IND-FR-010/016 | frases | saldo e movimentações; avisos | [9d] |
| IND-FR-014 / NFR-002 | — | `programBanner` com o programa desligado | banner na vitrine |
| IND-SEC-001/002/004/006 | — | A não vê B; registro | — |

Seed do e2e:
- uma loja indicada pelo lojista de teste, com a 1ª paga (crédito);
- uma indicação do vendedor de teste, com recompensa (saldo).

## Riscos e alternativas descartadas
- **Descartado: guardar Pausada no banco.** Exigiria sincronizar com o ciclo de cobrança; calculada pelo status da loja, fica sempre certa.
- **Descartado: `referrals` gravar `billing_credits` direto.** Criaria um ciclo de import (`billing ↔ referrals`). A `billing` lança o crédito com o que a função devolve.
- **Risco: lojista que também é indicador.** Ele recebe crédito se tiver loja ativa (é a recompensa do lojista); sem loja, saldo (D2).
- **Risco: `/i/{codigo}` deixa de ser `route.ts`.** O link continua o mesmo, e a página leva ao cadastro com o código.

## Decisões (aprovadas em 2026-11-23)
- **D1.** Tabela `referral_rewards` com índice único por fatura, e o status "Pausada/Cadastrada/Encerrada" calculado na leitura.
- **D2.** Quem indicou é dono de loja → crédito na fatura da loja; senão → saldo.
- **D3.** A `billing` chama `referrals.rewardPaidInvoices` e lança o crédito ela mesma (dependência num sentido só).
- **D4.** A área `/indica` passa a abrir também para o papel `seller` (o vendedor indica pelo mesmo painel), sem dar o papel `referrer` a ele.
- **D5.** A fatura que nasce paga com crédito (total R$ 0) também conta como mensalidade paga e rende.

## Ajustes de documento (na T001)
- **ARCHITECTURE §4:** `referral_rewards` no lugar de `rewards`; `payouts` na 010b.
- **API.md §5:** rotas `/painel/indica/*`, `/indica/cadastro`, `/i/{codigo}` (página) e `registerReferrerAction`.
- **GLOSSARY:** status calculados da indicação; Recompensa (crédito ou saldo).

## Conformidade
- [x] Todo requisito da spec está no mapa requisito → solução (14 FR, 3 NFR, 4 SEC; os riscados foram para a 010b)
- [x] Actions seguem o `API.md` §2:
  - schema `.strict()`;
  - honeypot e rate limit no cadastro público;
  - `activity_log`;
  - idempotência pelo índice único.
- [x] Posse checada: `profileId` e `storeId` da sessão
- [x] Saída montada à mão, sem dados pessoais da loja indicada
- [x] Página pública [8c] com `noindex` (SEO.md: página pessoal fora do índice); banner na vitrine em cache
- [x] Migration só acrescenta; nenhuma dependência nova
- [x] D1–D5 aprovadas em 2026-11-23

## Ajustes do /implement
- **T006:** o código é conferido pelas regras em `checkCode` (cadastro) e no painel (`referralPanel` não cria código fora das regras); `getOrCreateCode` continua criando o código do lojista no cadastro da loja (003), mas ele só vale com o programa ativo.
- **T011:** a vitrine recebe o banner por slot (`promo`, `promoFooter`) montado na rota, como o `banner` do painel: `showcase` não depende de `referrals`. `/i/{codigo}` virou página em cache por código (`'use cache'` com `SETTINGS_TAG`).
- **`referralUrl(code)`** em `platform/http/urls.ts` é a única função que monta o link de indicação (Minha loja e o painel).
- **`rememberPanel`** prefere o papel principal da área: com `/indica` aberta ao vendedor (D4), quem é vendedor e indicador continua lembrando o painel do indicador.
- **Verificação:** os 14 FR e 4 SEC com teste (integração, componente e e2e), todos passando; a IND-NFR-002 (banner em cache, renovado em até 60 s) sem teste automático (aviso). O e2e do cadastro pelo link (003) passou a clicar em **Quero meu catálogo** na landing.
