---
spec: 018
status: draft
---

# Plano · 018 Indicação legítima · o lojista indicado vê e contesta

## Resumo técnico
A indicação ganha o status `contested` e duas colunas de contestação. O lojista indicado vê a indicação no card Caju Indica da Conta e contesta com uma action; o admin decide em Caju Indica (Invalidar → `rejected` com motivo; Manter → volta ao status anterior e libera as recompensas retidas). `rewardPaidInvoices` não paga indicação contestada; a recompensa é por fatura (`referral_rewards.invoice_id` único), então Manter só reprocessa as faturas pagas no período, sem pagar duas vezes.

## Impacto
| Camada | Mudança |
|---|---|
| Dados | Migration `0029`: `ALTER TYPE referral_status ADD VALUE 'contested'`; `referrals.contested_at timestamptz`, `referrals.status_before_contest referral_status`; índice `referrals_status (status)` para a fila |
| `src/domains/referrals` | `storeReferral(db, session)` (o que o lojista vê), `contestReferral` (`store.referral`, `storeId` da sessão), `contestedQueue` e `decideContest` (`admin.read` para ver, nova permissão `referrals.decide` só admin); `rewardPaidInvoices` pula `contested`; Manter chama `rewardPaidInvoices` com as faturas pagas sem recompensa |
| `src/domains/auth` | permissão `referrals.decide: ["admin"]`; contador em `/admin/indica` |
| Web | card na Conta do lojista (nome de quem indicou, data, status, **Não reconheço esta indicação**); seção **Contestadas** em `/admin/indica` com Invalidar (motivo) e Manter; selo Contestada / Não válida na lista do indicador |
| Jobs | nenhum |

## Mapa requisito → solução
| Requisito | Solução |
|---|---|
| LEG-FR-001 | `storeReferral` devolve `{referrerFirstName, createdAt, status}` da indicação da loja da sessão; card na Conta |
| LEG-FR-002 | `contestReferral`: `status → contested`, guarda `status_before_contest` e `contested_at`, registra atividade; a tela abre o `wa.me` do atendimento (área logada da loja, como na assinatura) com loja e código |
| LEG-FR-003 | `contestedQueue` (admin e suporte) e `decideContest({referralId, decision, reason})`: Invalidar → `rejected` + `reject_reason`; Manter → `status_before_contest` e reprocessa recompensas; contador no menu |
| LEG-FR-004 | lista do indicador mostra Contestada / Não válida pelo status, sem `reject_reason` |
| LEG-SEC-001 | saída montada à mão só com o primeiro nome de quem indicou |
| LEG-SEC-002 | `storeId` da sessão (loja B não acha a indicação da A → 404); `decideContest` exige `referrals.decide`; as três ações vão para `activity_log` sem dado pessoal |

## Modelo de dados
```sql
ALTER TYPE referral_status ADD VALUE 'contested';
ALTER TABLE referrals ADD COLUMN contested_at timestamptz,
  ADD COLUMN status_before_contest referral_status;
CREATE INDEX referrals_status ON referrals (status);
```

## Estratégia de testes
- **Integração (PGlite):** contestar (dono ok; usuário da loja 403; loja B 404); recompensa não paga enquanto contestada; Manter paga as retidas uma vez só; Invalidar para de render; suporte vê a fila e recebe 403 ao decidir; registro de atividade sem dado pessoal.
- **Componente:** card do lojista sem e-mail nem celular de quem indicou; lista do indicador sem motivo.
- **e2e:** lojista contesta; admin invalida; indicador vê Não válida.

## Riscos e alternativas descartadas
- **Contestação só pelo WhatsApp, sem status:** descartado; a recompensa precisa parar na hora e o admin precisa da fila.
- **`ADD VALUE` em enum:** não roda dentro de transação em Postgres antigo; o Postgres 15+ do Supabase aceita, e a migration fica num arquivo só com ela.

## Conformidade
- [x] Todo requisito no mapa
- [x] Actions seguem o API.md §2
- [x] Posse checada (loja da sessão; indicação por id só para admin)
- [x] Sem campo privilegiado na entrada (`status` decidido pelo servidor)
- [x] Sem dado pessoal novo
- [x] Sem formulário público novo
- [x] Índice para a fila
- [x] Migration aditiva
- [x] Só Postgres e Auth
