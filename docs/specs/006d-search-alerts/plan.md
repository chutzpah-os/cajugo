---
spec: 006d
status: approved
---

# Plano · 006d Avisar quando chegar

## Resumo técnico
Tabela nova `search_alerts` no domínio `buyers`:
- **Pedido:** o formulário na busca sem resultado [12a] é uma ilha de cliente dentro do `NoResults` (vitrine e descoberta; o catálogo da loja não tem alerta). A action pública guarda nome, celular, a busca normalizada (query dos filtros + página de descoberta) e o consentimento. Ela passa pelo honeypot, pelo limite por IP do `SECURITY.md` §6, pelo limite de 5 pendentes por celular e pela unicidade "mesma busca, mesmo celular, pendente".
- **Compatível:** é calculado na leitura, com a mesma regra da lista. Para cada alerta pendente e dentro da validade, uma consulta `publicVisible(escopo) + filtros + published_at > created_at`, a mais antiga primeiro, limite 1. A leitura fica em cache de 60 s com as tags de veículos, de regras e de alertas, e serve a tela "Alertas" do admin e o contador do menu.
- **Dados pessoais:** nome e celular são apagados ao avisar ou cancelar, na mesma escrita. No vencimento, somem da tela na hora e são apagados pelo primeiro job diário (D2).
- **Link de cancelar:** `HMAC(HASH_SECRET, id)`, sem guardar token.

## Impacto
| Camada | Mudança |
|---|---|
| Dados (migration `0015`, aditiva) | tabela `search_alerts` + enum `search_alert_status`; índice único parcial da busca pendente por celular; índice `(status, created_at)`; regra nova `search_alert_validity_days` (90) em `setting_values` pelo `definitions.ts`, sem migration de dados |
| `src/platform/br/phone.ts` | `brMobileSchema`: DDD + 9 + 8 dígitos (celular), guardado como `55…` |
| `src/platform/http/` | sem mudança: `consumeRateLimit` (`publicForm`, `publicFormDaily`), `isHoneypotFilled`, `hashIp` |
| `src/domains/settings/definitions.ts` | `search_alert_validity_days` (grupo "showcase", 7 a 365 dias) |
| `src/domains/showcase/` | `firstMatch(db, scope, filters, after)` no `service.ts` (mesma regra e filtros da lista); `NoResults` recebe `source` e mostra o formulário só na vitrine e na descoberta |
| `src/domains/buyers/` | `service.ts` (novo): `createAlert`, `alertInbox`, `markNotified`, `cancelAlert`, `purgeExpired`, `cancelToken`; `actions.ts`: `createSearchAlertAction`, `markAlertNotifiedAction` (admin), `cancelSearchAlertAction`; `components/`: `AlertForm`, `AlertInbox` |
| `src/domains/auth/navigation.ts` + `ui/panel-nav.tsx` | item "Alertas" no admin com `permission: "alerts.notify"`; `NavItem.count` opcional, mostrado como selo; o contador vem de `src/app/admin/layout.tsx` (`navCounts`), para `auth` não depender de `buyers` (ajuste do `/verify`) |
| `src/app/` | `/admin/alertas` (admin e suporte); `/alertas/cancelar/[token]` (público, `noindex`, fora do sitemap); `/api/v1/cron/daily` (D2) |
| `src/platform/seo/indexing.ts` | `/alertas` no `PRIVATE` do `robots.txt` |
| Jobs | **primeiro job diário** (D2): `purgeExpired` + `purgeRateLimits`; `vercel.json` com `crons`; `CRON_SECRET` |
| `src/app/termos` [12i] | privacidade: o que o alerta guarda, para quê e quando apaga |

## Interfaces dos serviços (módulos profundos)
```ts
// domains/buyers/service.ts
createAlert(db, input: {
  name; phone /* 55… */; consent: true;
  search: { query: string; discoveryPath: string | null };   // validada antes
}, ctx: { ipHash; now }):
  Promise<{ ok: true; status: "created" | "duplicate" } | { ok: false; error: "rate-limited" | "too-many" }>
alertInbox(db, now): Promise<{
  matched: { alertId; name; search: SearchLabel; vehicle: PublicCard; whatsappUrl; createdAt }[];
  waiting: { alertId; search: SearchLabel; createdAt; expiresAt }[];   // sem nome/celular na lista
}>
markNotified(db, alertId, actorId): Promise<boolean>       // apaga nome e celular; activity_log
cancelAlert(db, token): Promise<"canceled" | "closed" | "invalid">
purgeExpired(db, now): Promise<number>                     // apaga nome e celular dos vencidos
cancelToken(alertId): string                               // `${id}.${hmac}`; verifica sem guardar

// domains/showcase/service.ts
firstMatch(db, scope: Scope, filters: Filters, after: Date): Promise<PublicCard | null>
```
A regra de "atende" fica toda em `firstMatch`: o escopo vem da página da descoberta (`discoveryKeyOf`) ou é `"showcase"`, e os filtros vêm de `filtersFromQuery`. A vitrine e o alerta nunca divergem (ALR-FR-002, ALR-SEC-003).

## Mapa requisito → solução
| Requisito | Solução |
|---|---|
| ALR-FR-001 | `AlertForm` (nome, celular, consentimento, honeypot) no `NoResults` com `source` de vitrine ou descoberta; `createSearchAlertAction` valida (`brMobileSchema`, nome 2–80, `listSourceSchema`, query ≤ 1000) e grava `filtersToQuery(filtersFromQuery(q))` normalizada; resposta "Vamos avisar quando chegar" |
| ALR-FR-002 | `alertInbox` → `firstMatch(escopo, filtros, created_at)`; mensagem `wa.me` com o nome e o link do veículo, mais o link de cancelar |
| ALR-FR-003 | `/admin/alertas` com "Com veículo" (botão WhatsApp + "Marcar como avisado") e "Aguardando"; `NavItem.count` = `matched.length`, do mesmo cache |
| ALR-FR-004 | `/alertas/cancelar/[token]`: confirmação + `cancelSearchAlertAction`; cancelado sai do `alertInbox`; o link vai na mensagem de aviso e também na confirmação do pedido (D3) |
| ALR-FR-005 | pendente com `created_at + validade das regras` no passado não entra no `alertInbox` (validade lida na hora: mudar a regra muda os vencimentos) |
| ALR-FR-006 | índice único parcial `(phone, query, discovery_path) where status = 'pending'`; conflito → `"duplicate"` → "Já estamos de olho nessa busca" |
| ALR-NFR-001 | formulário e tela com os componentes base (44 px); e2e em 390 e 1280 px |
| ALR-NFR-002 | o formulário só existe no estado sem resultado e é ilha de cliente; a página continua em cache; medição do build de produção da 006 vale |
| ALR-NFR-003 | `alertInbox` em `'use cache'` com `cacheLife` de 60 s e tags `VEHICLES_TAG`, `SETTINGS_TAG`, `ALERTS_TAG` |
| ALR-SEC-001 | só `/admin/alertas` lê; `requireArea("admin")` (admin e suporte); nada no painel do lojista; teste com sessão de lojista |
| ALR-SEC-002 | honeypot (finge sucesso); `consumeRateLimit` por `hashIp` com `publicForm` e `publicFormDaily`; `count(pending) por phone ≥ 5` → "too-many"; schema `.strict()`; consentimento obrigatório (`z.literal(true)`) e link [12i] |
| ALR-SEC-003 | `firstMatch` usa `publicVisible` do escopo: não divulgado e loja fora do ar nunca casam |
| ALR-SEC-004 | colunas `name`/`phone` anuláveis; `markNotified` e `cancelAlert` zeram na mesma escrita; `purgeExpired` no job diário (D2); `alertInbox` nunca devolve vencido |
| ALR-SEC-005 | token `id.hmac` (HMAC-SHA256 com `HASH_SECRET`, comparação em tempo constante); formato errado ou HMAC diferente → "Link inválido"; action com limite `liveCheck` por IP |

## Modelo de dados
```ts
export const searchAlertStatus = pgEnum("search_alert_status", ["pending", "notified", "canceled", "expired"]);

export const searchAlerts = pgTable("search_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: searchAlertStatus("status").notNull().default("pending"),
  name: text("name"),                 // apagado ao fechar (ALR-SEC-004)
  phone: text("phone"),               // 55 + DDD + 9 dígitos; apagado ao fechar
  query: text("query").notNull(),     // filtros normalizados (`filtersToQuery`)
  discoveryPath: text("discovery_path"), // `/carros/...` ou null (vitrine)
  consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  notifiedBy: uuid("notified_by").references(() => profiles.id),
}, (t) => [
  uniqueIndex("search_alerts_pending_search")
    .on(t.phone, t.query, sql`coalesce(${t.discoveryPath}, '')`)
    .where(sql`${t.status} = 'pending'`),
  index("search_alerts_status_created").on(t.status, t.createdAt),
]);
```
```sql
-- 0015 (aditiva)
CREATE TYPE "search_alert_status" AS ENUM ('pending','notified','canceled','expired');
CREATE TABLE "search_alerts" ( ... );
CREATE UNIQUE INDEX "search_alerts_pending_search" ON "search_alerts" ("phone","query",coalesce("discovery_path",'')) WHERE "status" = 'pending';
CREATE INDEX "search_alerts_status_created" ON "search_alerts" ("status","created_at");
```
O `ARCHITECTURE.md` §4 previa `search_alerts (id, contact, filters jsonb, active, notified_at, created_at)`. Fica este modelo: status em vez de `active`, e `query` em texto normalizado em vez de `jsonb`, que é o mesmo formato da URL e de `filtersFromQuery`.

## Estratégia de testes
| Requisito | Unitário | Integração (PGlite) | e2e (Playwright, staging) |
|---|---|---|---|
| ALR-FR-001 | `brMobileSchema` (celular, fixo, +55, máscara); schema da action | `createAlert` grava a busca normalizada e a página da descoberta | formulário na vitrine e na descoberta; não aparece no catálogo da loja |
| ALR-FR-002 | mensagem `wa.me` | `firstMatch`: filtros, escopo de descoberta, só depois do alerta | publicar veículo compatível (seed) → aparece em "Alertas" |
| ALR-FR-003 | `NavItem.count` | `markNotified` tira do inbox | contador e "Marcar como avisado" |
| ALR-FR-004 | `cancelToken` | `cancelAlert` → `canceled`; fechado → `closed` | link de cancelar |
| ALR-FR-005 | — | vencido some; mudar a regra muda o vencimento | — |
| ALR-FR-006 | — | mesma busca → `duplicate`; outra busca → nova | mensagem "Já estamos de olho" |
| ALR-NFR-001 | — | — | 390/1280 px, `audit()` |
| ALR-NFR-002 | — | — | build de produção: LCP/CLS da vitrine sem mudança |
| ALR-NFR-003 | — | — | veículo publicado aparece sem esperar o job |
| ALR-SEC-001 | — | — | lojista em `/admin/alertas` → sem permissão; painel sem alerta |
| ALR-SEC-002 | honeypot, consentimento | 31ª tentativa do IP no dia; 6º pendente do celular | — |
| ALR-SEC-003 | — | `firstMatch` ignora não divulgado e loja suspensa | — |
| ALR-SEC-004 | — | avisado, cancelado e vencido (após `purgeExpired`) sem nome/celular | — |
| ALR-SEC-005 | token trocado, outro id, formato inválido | — | link adulterado → "Link inválido" |

## Ajustes do `/verify` (2026-11-16)
- Schemas em `buyers/schemas.ts`; cancelar com schema estrito; cancelar e vencer gravam `activity_log` (sem dado pessoal).
- Pedido com trava por celular numa transação (`pg_advisory_xact_lock`): o limite de 5 não estoura em pedidos simultâneos.
- Busca guardada sem maiúscula, acento e espaço a mais (ALR-FR-006): a busca da vitrine já ignora isso.
- Avisar e cancelar vencem antes os atrasados; o job diário invalida o cache da lista do admin.

## Riscos e alternativas descartadas
- **Custo da leitura:** uma consulta por alerta pendente. Fica em cache de 60 s, e a tela é só do admin. Com milhares de alertas, passa a valer uma tabela de compatíveis alimentada na publicação (descartado agora: acopla `vehicles` a `buyers` e a validade das regras).
- **"Entrou depois do alerta" usa `published_at`:** um veículo que passa a ser divulgado na CajuGo depois, sem nova publicação, não conta. Aceito para o MVP; a spec fala em "entrou na vitrine".
- **Descartado: token de cancelar aleatório guardado.** O admin precisaria dele em claro para montar a mensagem; o HMAC do id dá o mesmo efeito sem guardar segredo.
- **Descartado: filtros em `jsonb`.** Duplicaria o formato que a URL e `filtersFromQuery` já têm.

## Decisões (aprovadas em 2026-11-16, nas opções recomendadas)
- **D1. "Compatível" calculado na leitura**, em cache de 60 s, em vez do job diário previsto no `ARCHITECTURE.md` §6. Recomendo: cumpre os 60 s (ALR-NFR-003); o job de 1×/dia do plano Hobby deixaria o aviso para o dia seguinte. O §6 passa a dizer isso.
- **D2. Primeiro job diário agora** (`/api/v1/cron/daily`, protegido por `CRON_SECRET`, `vercel.json` com `crons`), com `purgeExpired` e `purgeRateLimits`. Recomendo: o `ARCHITECTURE.md` §6 já prevê o job e o `CRON_SECRET`, e sem ele o celular de um alerta vencido ficaria guardado até alguém abrir a tela. **Você precisa criar o `CRON_SECRET` nas variáveis da Vercel** (eu não mexo em segredo). Alternativa: apagar só na leitura do admin, o que deixa dado pessoal guardado por tempo indefinido.
- **D3. Link de cancelar também na confirmação do pedido**, além da mensagem de aviso. Como avisar fecha o alerta (ALR-SEC-004), o link da mensagem só diria "Este alerta já foi encerrado". Na confirmação, ele é o jeito real de desistir antes do aviso. **Muda a spec** (ALR-FR-004 ganha "e na confirmação do pedido"); preciso do seu OK.

## Ajustes de documento (a fazer na T001, com as decisões)
- **ARCHITECTURE §4:** modelo de `search_alerts`. **§6:** compatível na leitura (D1); job diário com a limpeza dos alertas (D2).
- **API.md §5:** `createSearchAlertAction`, `cancelSearchAlertAction`, `markAlertNotifiedAction`, `/admin/alertas`, `/alertas/cancelar/[token]`, `/api/v1/cron/daily`.
- **SECURITY §8 (tabela de dados):** "Nome e celular de quem pede alerta: só ao admin e ao suporte; apagados ao avisar, cancelar ou vencer".
- **GLOSSARY:** estados do alerta de busca (pendente, avisado, cancelado, vencido).
- **Termos [12i]:** trecho de privacidade do alerta.
- **contract.md:** a rota do cron (feito junto com este plano).

## Conformidade
- [x] Todo requisito da spec aparece no mapa requisito → solução (6 FR, 3 NFR, 5 SEC)
- [x] Actions seguem o `API.md` §2: schemas `.strict()` com limites; `markAlertNotifiedAction` com `requireArea("admin")` e `activity_log`; status só por ações específicas; saída montada à mão
- [x] Toda action/rota com id checa a posse: o alerta não é de loja; só admin/suporte o lê; o cancelar vale só com o HMAC do próprio id
- [x] Schemas de entrada não aceitam campos privilegiados (`status`, `notifiedBy` e datas vêm do servidor)
- [x] Dados pessoais novos: nome e celular, só para o admin, apagados ao fechar; SECURITY e termos atualizados na T001
- [x] Formulário público com honeypot + rate limit (por IP e por celular)
- [x] Consultas novas têm índice: `(status, created_at)`, único parcial da busca; `firstMatch` usa os índices da vitrine
- [x] Migration aditiva (tabela, enum e índices novos)
- [x] Nada do Supabase além de Postgres e Auth; nenhuma dependência nova
- [x] **Desvio do ARCHITECTURE §6** (compatível na leitura em vez do job): D1 aprovada; §6 atualizado na T001
- [x] **Segredo novo `CRON_SECRET`** (já previsto no ARCHITECTURE §6): D2 aprovada; o dono cria na Vercel na T015
