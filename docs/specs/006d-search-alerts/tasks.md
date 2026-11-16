---
spec: 006d
---

# Tasks · 006d Avisar quando chegar

Fatias verticais (`SDD.md` §7, skill `tdd`): cada task de comportamento é um ciclo teste falhando → código → verde. Testes com o ID do requisito no nome. O alerta não é de loja: o caso "loja B" vira "lojista não vê o alerta" (ALR-SEC-001) e "link de cancelar de outro alerta" (ALR-SEC-005). Decisões D1–D3 do plano aprovadas nas opções recomendadas (2026-11-16); D3 muda o ALR-FR-004 da spec na T001.

## Fase 1 — Fundação
- [x] **T001** Documentos: ARCHITECTURE §4 (`search_alerts`) e §6 (compatível na leitura; job diário), API.md §5, SECURITY §8 (nome e celular do alerta), GLOSSARY (estados do alerta), ALR-FR-004 com o link na confirmação (D3, se aprovada) · _—_
- [x] **T002** Migration `0015`: enum `search_alert_status`, tabela `search_alerts`, índice único parcial da busca pendente por celular, índice `(status, created_at)`; regra `search_alert_validity_days` (90, de 7 a 365) em `definitions.ts` · _ALR-FR-005, ALR-FR-006_
- [x] **T003** [P] `brMobileSchema` (DDD + 9 + 8 dígitos; fixo recusado com "Informe um celular com WhatsApp"; aceita máscara e +55) · _ALR-FR-001_
- [ ] **T004** [P] `cancelToken` e verificação (`id.hmac` com `HASH_SECRET`, comparação em tempo constante; token trocado, outro id e formato inválido recusados) · _ALR-SEC-005_

## Fase 2 — Fatias verticais (servidor)
- [ ] **T005** `createAlert`: busca normalizada (`filtersToQuery`) e página da descoberta validada; consentimento; `"duplicate"` pelo índice único; até 5 pendentes por celular · _ALR-FR-001, ALR-FR-006, ALR-SEC-002, ALR-SEC-004_
- [ ] **T006** `createSearchAlertAction`: schema `.strict()`, honeypot (finge sucesso), limite por IP (`publicForm`, `publicFormDaily`), mensagens; só vitrine e descoberta (`source` de loja recusado) · _ALR-FR-001, ALR-SEC-002_
- [ ] **T007** `showcase.firstMatch(scope, filters, after)`: mesma regra e filtros da lista, só publicados depois do alerta, mais antigo primeiro; não divulgado e loja suspensa de fora · _ALR-FR-002, ALR-SEC-003_
- [ ] **T008** `alertInbox` (com veículo / aguardando; vencidos de fora com a validade lida na hora; mensagem `wa.me` com nome, link do veículo e link de cancelar) em cache de 60 s com as tags de veículos, regras e alertas · _ALR-FR-002, ALR-FR-005, ALR-NFR-003_
- [ ] **T009** `markNotified` e `markAlertNotifiedAction` (admin/suporte, `activity_log`, apaga nome e celular); `cancelAlert` e `cancelSearchAlertAction` (`canceled`, `closed`, `invalid`; limite `liveCheck`) · _ALR-FR-003, ALR-FR-004, ALR-SEC-001, ALR-SEC-004, ALR-SEC-005_
- [ ] **T010** Job diário `/api/v1/cron/daily` conforme `contract.md`: `CRON_SECRET`, `purgeExpired`, `purgeRateLimits`, idempotente; `vercel.json` com `crons`; `.env.example` · _ALR-FR-005, ALR-SEC-004_

## Fase 3 — Telas
- [ ] **T011** `AlertForm` no `NoResults` da vitrine e da descoberta (não no catálogo da loja): nome, celular, consentimento com link [12i], honeypot; "Vamos avisar quando chegar" com o link de cancelar (D3) e "Já estamos de olho nessa busca"; termos [12i] com o trecho de privacidade · _ALR-FR-001, ALR-FR-006, ALR-SEC-002, ALR-NFR-002_
- [ ] **T012** `/admin/alertas` (com veículo: card, WhatsApp, "Marcar como avisado"; aguardando: busca e vencimento) e item "Alertas" com contador (`NavItem.count`) · _ALR-FR-002, ALR-FR-003, ALR-SEC-001, ALR-NFR-001_
- [ ] **T013** `/alertas/cancelar/[token]`: confirmação, "Alerta cancelado", "Este alerta já foi encerrado", "Link inválido"; `noindex` e `/alertas` no `robots.txt` · _ALR-FR-004, ALR-SEC-005_

## Fase 4 — Fechamento
- [ ] **T014** Playwright (390 e 1280 px, staging): pedido na vitrine e na descoberta, duplicado, sem formulário no catálogo; veículo compatível publicado aparece em "Alertas" com contador; marcar como avisado; cancelar e link adulterado; lojista sem acesso; `audit()`; build de produção: LCP/CLS da vitrine · _ALR-FR-001 a ALR-FR-006, ALR-NFR-001 a ALR-NFR-003, ALR-SEC-001, ALR-SEC-002, ALR-SEC-005_
- [ ] **T015** Migration `0015` no staging e (com sua autorização) no prod, `CRON_SECRET` na Vercel (você), conferir o cron; `/verify`: rastreabilidade verde, spec `implemented`, PLAN, `docs/changes` e `docs/decisions` · _—_
