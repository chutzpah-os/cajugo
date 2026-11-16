---
spec: 007b
status: approved
---

# Plano · 007b Denúncias de anúncio

## Resumo técnico
Domínio novo `moderation` (previsto no `ARCHITECTURE.md` §3) com a tabela `vehicle_reports`.
- **Denúncia [14d]:** é uma ilha de cliente na página do veículo, que continua em cache. A Server Action pública recebe uma chave v7 por envio, que vira o id (idempotência, como no lead da 007). Ela tem honeypot e limite por IP, e não guarda quem denunciou.
- **Ocultar e Mostrar de novo:** são transições do veículo e ficam no domínio `vehicles`.
  - O veículo guarda uma **marca de moderação** (motivo, nota, quando, quem). Com ela, despublicar e publicar de novo, ou desfazer a venda, devolvem o veículo a `hidden`, nunca a `published`.
  - A visibilidade pública passa a ser: vitrine e descoberta só `published`; catálogo, página do veículo e favoritos aceitam `published` ou `hidden`.
- **Fila [14e]:** é lida direto do banco, sem cache. Só admin e suporte acessam (`admin.moderate`). As decisões gravam no `activity_log`, avisam a loja (`notices`) e invalidam o cache público (`VEHICLES_TAG`).

## Impacto
| Camada | Mudança |
|---|---|
| Dados (migration `0017`, aditiva) | Enums `report_reason` (sold, unreal_price, wrong_photos, scam, other) e `report_status` (open, kept, hidden). Tabela `vehicle_reports`. Colunas de moderação em `vehicles`: `hidden_reason`, `hidden_note`, `hidden_at`, `hidden_by` (D2). `notice_kind` + `vehicle_hidden`, `vehicle_shown`. |
| `src/domains/moderation/` (novo) | `service.ts`, `schemas.ts`, `actions.ts`, `reasons.ts` (rótulos, sem servidor), `components/` (`ReportSheet`, `ReportQueue`, `HiddenList`, `HideSheet`) |
| `src/domains/vehicles/` | `hideVehicle` e `showVehicle` (só admin e suporte). `publish`, `unpublish`, `markSold`, `undoSale` e `setShare` respeitam a marca de moderação. O resumo [6e] e a lista [1c] trazem o motivo. A edição já é bloqueada para `hidden`. |
| `src/domains/showcase/` | `visibility.ts`: o escopo da loja e o de veículos escolhidos aceitam `hidden`; vitrine, descoberta, busca e sitemap continuam só `published`. `vehiclePage` e `gateDecision` tratam `hidden` como veículo do catálogo, com `noindex` (D3). [1b] ganha "Denunciar anúncio". |
| `src/domains/notices/` | Tipos `vehicle_hidden` e `vehicle_shown`; `notifyStore(db, storeId, notice)` avisa dono e usuários da loja. |
| `src/platform/browser/marks.ts` (novo) | `claimOncePer(storage, key, id, now, windowMs)`, tirado de `leads/device.ts` (D4). `leads` e `moderation` usam. |
| `src/domains/auth/navigation.ts` + `app/admin/layout.tsx` | Item "Denúncias" (`permission: "admin.moderate"`) com contador via `navCounts`. |
| `src/app/` | `/admin/denuncias` (fila e aba `?aba=ocultados`). A página do veículo passa a abrir também para `hidden`. |
| Jobs | Nenhum |

## Interfaces dos serviços (módulos profundos)
```ts
// domains/moderation/service.ts
reportVehicle(db, raw: unknown, ctx: { ipHash; now }):              // RPT-FR-001, SEC-002, SEC-006
  Promise<{ ok: true } | { ok: false; message; errors: FieldError[] }>
reportQueue(db, session): Promise<ReportCard[]>                      // RPT-FR-002, SEC-003
//   ReportCard = { vehicle: { id, title, priceCents, storeName, path, photo }, open: number,
//                  byReason: { reason, count }[], details: string[], firstAt, lastAt }
hiddenList(db, session): Promise<HiddenCard[]>                        // RPT-FR-008
keep(db, session, raw: { vehicleId }): Promise<void>                  // RPT-FR-003, SEC-005
hide(db, session, raw: { vehicleId; reason; note? }): Promise<void>   // RPT-FR-004, 006, SEC-004, 005
show(db, session, raw: { vehicleId }): Promise<void>                  // RPT-FR-008
openReportsCount(db, session): Promise<number>                        // RPT-FR-007 (0 sem permissão)

// domains/vehicles/service.ts (chamadas por moderation, na mesma transação)
hideVehicle(db, actor, vehicleId, { reason, note }, now)   // published → hidden + marca
showVehicle(db, actor, vehicleId, now)                     // hidden → published, limpa a marca
```
Regras que ficam escondidas:
- **Na fila:** só entram veículos `published` com denúncia `open` (RPT-FR-002).
- **Manter:** fecha como `kept`.
- **Ocultar:**
  - fecha como `hidden`;
  - chama `hideVehicle`;
  - avisa a loja (`notifyStore`);
  - grava em `logActivity`;
  - invalida o cache.

## Mapa requisito → solução
| Requisito | Solução |
|---|---|
| RPT-FR-001 | `ReportSheet` em [1b]: "Denunciar anúncio" abre um `<dialog>` (Invoker Commands, como o simulador da 006c) com os 4 motivos (rádio), descrição opcional e honeypot. `reportVehicleAction` → `reportVehicle`: valida, confere o veículo com `contactTarget` (público) e grava `open` com `id = requestId` (`on conflict do nothing`). Confirma "Denúncia enviada. Vamos analisar." |
| RPT-FR-002 | `reportQueue`: `vehicle_reports` `open` + `vehicles.status = 'published'`, agrupada por veículo, com contagem por motivo e descrições, ordenada pela denúncia aberta mais antiga. Vendido, despublicado ou excluído sai sozinho; volta se for publicado de novo (as denúncias continuam `open`). |
| RPT-FR-003 | `keep`: `update … set status = 'kept', decided_by, decided_at where vehicle_id = ? and status = 'open'`. Denúncia nova nasce `open` e o veículo volta à fila. |
| RPT-FR-004 | `HideSheet` ([6f] "Ocultar veículo"): motivo obrigatório (5 opções; "Outro" pede nota de 1 a 200 caracteres) e o texto do efeito. `hide`, numa transação: `hideVehicle` + denúncias `open` → `hidden` + `notifyStore` + `logActivity`. Depois, `updateTag(VEHICLES_TAG)`. |
| RPT-FR-005 | `publicVisible`: vitrine e descoberta com `status = 'published'`; loja e veículos escolhidos com `status in ('published','hidden')`. `vehiclePage` trata `hidden` como não divulgado (cabeçalho do catálogo), com `robots: noindex` (D3). O sitemap segue só `published`. `gateDecision` dá 200 ao `hidden`. Links de vendedor (008) usam a regra da vitrine. |
| RPT-FR-006 | `notifyStore(storeId, { kind: "vehicle_hidden", vehicle, reason })` → aviso "Fiat Argo foi ocultado da vitrine: {motivo}." para dono e usuários da loja. A lista [1c] e o resumo [6e] mostram o selo "Oculto" e o motivo (`hiddenReasonLabel`). |
| RPT-FR-007 | Item `{ href: "/admin/denuncias", label: "Denúncias", permission: "admin.moderate" }`; `navCounts` com `openReportsCount` (veículos na fila). |
| RPT-FR-008 | `/admin/denuncias?aba=ocultados`: `hiddenList` (veículos `hidden` com motivo e `hidden_at`). **Mostrar de novo** → `show`: `showVehicle` (`hidden` → `published`, limpa a marca) + `notifyStore(vehicle_shown)` + `logActivity` + `updateTag`. |
| RPT-FR-009 | `vehicles`: `markSold` aceita `hidden`; `unpublish` aceita `hidden` (vai a `draft`, a marca fica); `publish` e `undoSale` vão a `hidden` quando há marca; `setShare` e a edição recusam `hidden` (409). [6e] mostra o motivo e "Para revisar, fale com a CajuGo", sem seções editáveis nem "Divulgar". |
| RPT-FR-010 | No aparelho: `claimOncePer(localStorage, "cajugo:report:v1", vehicleId, now, 24 h)`. Já denunciado nas últimas 24 h, a tela confirma sem chamar a action. Sem armazenamento, envia; o limite por IP segura o abuso. |
| RPT-NFR-001 | `<dialog>` e componentes base (44 px); e2e em 390 e 1280 px com `audit()` |
| RPT-NFR-002 | O botão está no HTML em cache e o diálogo abre antes do JS (Invoker Commands); medir LCP/CLS de [1b] no build de produção |
| RPT-NFR-003 | `updateTag(VEHICLES_TAG)` na action de Ocultar: a vitrine sai do cache na hora |
| RPT-SEC-001 | Nada de `vehicle_reports` sai para o painel da loja. O aviso e [6e] usam só a marca de moderação (motivo da CajuGo). Teste: o HTML de [1c], [6e] e do aviso não contém descrição nem contagem. |
| RPT-SEC-002 | `isHoneypotFilledIn` (finge sucesso). `consumeRateLimit` por `hashIp` com `publicForm` + `publicFormDaily` (chave `report:ip:`). `reportSchema.strict()`: descrição ≤ 1.000; `reason` sem `other`. |
| RPT-SEC-003 | `reportQueue`, `hiddenList`, `keep`, `hide`, `show` e `openReportsCount` exigem `authorizeTo(session, "admin.moderate")`. A página usa `requireArea("admin")` com permissão. Teste com lojista, usuário da loja e vendedor. |
| RPT-SEC-004 | `hide`/`show`/`keep` agem só no `vehicleId` da entrada; `notifyStore` usa o `store_id` do próprio veículo. Teste com duas lojas. |
| RPT-SEC-005 | `logActivity({ userId: actor, action: "vehicle.hidden" \| "vehicle.shown" \| "vehicle_reports.kept", entity: "vehicle", entityId, data: { reason, note } })`, sem texto das denúncias nem IP. |
| RPT-SEC-006 | `vehicle_reports` não tem coluna de autor nem de IP; o hash do IP fica só em `rate_limits`. |

## Modelo de dados
```ts
export const reportReason = pgEnum("report_reason", [
  "sold", "unreal_price", "wrong_photos", "scam", "other", // "other" só no Ocultar
]);
export const reportStatus = pgEnum("report_status", ["open", "kept", "hidden"]);

export const vehicleReports = pgTable("vehicle_reports", {
  id: uuid("id").primaryKey(),                 // chave do envio (uuid v7 da tela)
  vehicleId: uuid("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  reason: reportReason("reason").notNull(),
  details: text("details"),                    // até 1.000; sem autor nem IP (RPT-SEC-006)
  status: reportStatus("status").notNull().default("open"),
  decidedBy: uuid("decided_by").references(() => profiles.id),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("vehicle_reports_open").on(t.vehicleId, t.createdAt).where(sql`${t.status} = 'open'`),
]).enableRLS();

// vehicles (colunas novas, anuláveis)
hiddenReason: reportReason("hidden_reason"),
hiddenNote: text("hidden_note"),               // só com "other", até 200
hiddenAt: timestamp("hidden_at", { withTimezone: true }),
hiddenBy: uuid("hidden_by").references(() => profiles.id),
```
```sql
-- 0017 (aditiva)
CREATE TYPE "report_reason" AS ENUM ('sold','unreal_price','wrong_photos','scam','other');
CREATE TYPE "report_status" AS ENUM ('open','kept','hidden');
CREATE TABLE "vehicle_reports" ( ... );
ALTER TABLE "vehicles" ADD COLUMN "hidden_reason" "report_reason", ADD COLUMN "hidden_note" text,
  ADD COLUMN "hidden_at" timestamptz, ADD COLUMN "hidden_by" uuid REFERENCES "profiles"("id");
ALTER TYPE "notice_kind" ADD VALUE 'vehicle_hidden';
ALTER TYPE "notice_kind" ADD VALUE 'vehicle_shown';
CREATE INDEX "vehicle_reports_open" ON "vehicle_reports" ("vehicle_id","created_at") WHERE "status" = 'open';
```
O `ARCHITECTURE.md` §4 previa uma tabela genérica `reports (target_type, target_id, reporter_id, ip_hash, …)`. Fica `vehicle_reports`, com FK para o veículo e sem autor nem IP (D1, RPT-SEC-006). A denúncia de vendedor (009) terá a sua.

## Estratégia de testes
| Requisito | Unitário | Integração (PGlite) | e2e (Playwright, staging) |
|---|---|---|---|
| RPT-FR-001 | schema (motivo obrigatório, `other` recusado) | `reportVehicle` grava `open`; veículo fora do ar recusado; mesma chave não duplica | denunciar em [1b] → confirmação |
| RPT-FR-002 | — | agrupamento, contagem por motivo, ordem; vendido sai e volta ao desfazer a venda | fila mostra o anúncio denunciado |
| RPT-FR-003 | — | `keep` arquiva; denúncia nova reabre | Manter tira da fila |
| RPT-FR-004 | schema do Ocultar ("Outro" exige nota) | `hide` muda o veículo, fecha as denúncias, avisa e registra | Ocultar com motivo |
| RPT-FR-005 | — | `publicVisible`: oculto fora da vitrine, descoberta, busca e sitemap; dentro do catálogo e da página | vitrine sem o anúncio; catálogo com ele |
| RPT-FR-006 | `render` dos avisos | `notifyStore` para dono e usuário da loja | aviso e selo no painel do lojista |
| RPT-FR-007 | — | `openReportsCount`; 0 sem permissão | contador no menu |
| RPT-FR-008 | — | `show` volta a `published`, limpa a marca, avisa | aba Ocultados e Mostrar de novo |
| RPT-FR-009 | — | vender e excluir aceitam `hidden`; editar e divulgar → 409; despublicar e publicar → `hidden`; desfazer venda → `hidden` | [6e] do oculto |
| RPT-FR-010 | `claimOncePer` 1 h × 25 h | — | segunda denúncia não aumenta a contagem |
| RPT-NFR-001 | — | — | 390/1280 px, `audit()` |
| RPT-NFR-002 | — | — | build de produção: LCP/CLS de [1b] |
| RPT-NFR-003 | — | — | ocultado some da vitrine sem esperar |
| RPT-SEC-001 | — | resumo e lista do lojista sem dado de denúncia | HTML do painel sem descrição |
| RPT-SEC-002 | honeypot | 6º envio do IP no minuto | — |
| RPT-SEC-003 | — | lojista, usuário da loja e vendedor → 403 em todas | lojista em `/admin/denuncias` → sem permissão |
| RPT-SEC-004 | — | ocultar A não muda B nem avisa B | — |
| RPT-SEC-005 | — | `activity_log` com quem, decisão e motivo, sem IP nem descrição | — |
| RPT-SEC-006 | — | colunas de `vehicle_reports` sem autor nem IP | — |

## Riscos e alternativas descartadas
- **`ALTER TYPE … ADD VALUE` numa migration:** o valor novo não pode ser usado na mesma transação em que foi criado. A migration só acrescenta o valor e não o usa, então não há problema. Teste de migration no PGlite.
- **Mudar a regra de visibilidade** mexe em vitrine, catálogo, favoritos, contato e página do veículo de uma vez. A regra continua num lugar só (`visibility.ts`), e os testes de visibilidade das specs 006 a 007 cobrem a mudança.
- **Descartado: guardar o status anterior em vez da marca.** A marca de moderação diz o motivo para o lojista e sobrevive a despublicar e vender. Status anterior não cobre o "publicar de novo".
- **Descartado: tabela genérica `reports` com `target_type`.** Sem FK, não há integridade nem limpeza em cascata.
- **Descartado: contar denúncia repetida pelo IP no servidor.** Várias pessoas atrás do mesmo IP de operadora seriam contadas como uma. Fica a marca no aparelho, como no lead de WhatsApp.

## Ajustes do `/verify` (2026-11-16)
- **Marca no aparelho só depois do envio aceito:** a denúncia recusada (limite, falha de rede) não marca o aparelho; `claimedWithin` confere sem gravar.
- **Cards da equipe lidos direto**, sem a regra pública: anúncio de loja suspensa entra na fila e no contador do mesmo jeito, e o oculto de loja suspensa aparece em "Ocultados".
- **Oculto despublicado:** "Ocultados" lista todo veículo com a marca (oculto, despublicado ou vendido); **Mostrar de novo** tira a marca e só republica o que está oculto. [6e] mostra o motivo sempre que há marca.
- Filtro e indicador "Publicados" de [1c] contam o oculto (ele continua no ar para a loja). Denúncia de veículo oculto é aceita e entra na fila se ele voltar à vitrine.
- `canSell` no resumo [6e]; `shortTitle` único (aviso e cards); `updateTag` só quando a decisão muda algo; exceções de tela `showcase` → `moderation` e `vehicles` → `moderation/reasons` no `ARCHITECTURE.md` §3.

## Decisões (aprovadas em 2026-11-16)
- **D1. Tabela `vehicle_reports`**, específica, em vez da `reports` genérica do `ARCHITECTURE.md` §4. Ela não tem autor nem IP. **Recomendo:** tem integridade com o veículo e cumpre a RPT-SEC-006. O §4 é atualizado na T001.
- **D2. Marca de moderação no veículo** (`hidden_reason`, `hidden_note`, `hidden_at`, `hidden_by`). **Recomendo:** é o que faz despublicar e publicar, ou desfazer a venda, voltarem a oculto (RPT-FR-009), e dá o motivo ao lojista.
- **D3. Página do veículo oculto com `noindex`**, fora do sitemap. Abre normalmente pelo catálogo. **Recomendo:** o Google para de mostrar um anúncio sob suspeita; a loja continua vendendo pelo catálogo. **Muda o PRD:** a regra de [1b] "vendido/oculto acessado por link direto: [12d]" passa a valer só para vendido.
- **D4. Marca "uma vez a cada N horas" em `src/platform/browser/marks.ts`**, usada por `leads` (WhatsApp) e `moderation` (denúncia). **Recomendo:** a mesma lógica em dois domínios viraria código duplicado.

## Ajustes de documento (na T001, com as decisões)
- **ARCHITECTURE §3:** `platform/browser/`. **§4:** `vehicle_reports` e a marca de moderação em `vehicles`.
- **API.md §5:** `reportVehicleAction`, `keepReportsAction`, `hideVehicleAction`, `showVehicleAction`, `/admin/denuncias`.
- **SECURITY §8:** "Denúncia de anúncio não guarda quem denunciou (nem conta, nem IP); anônima para a loja."
- **GLOSSARY:** Ocultar (motivos; continua no catálogo; marca que sobrevive a republicar); Mostrar de novo; status da denúncia (aberta, mantida, oculta).
- **PRD [1b]:** link direto de veículo oculto abre a página do catálogo (D3). Feito na aprovação do plano.

## Conformidade
- [x] Todo requisito da spec aparece no mapa requisito → solução (10 FR, 3 NFR, 6 SEC)
- [x] Actions seguem o `API.md` §2:
  - schemas `.strict()` com limites;
  - decisões com `authorizeTo("admin.moderate")` e `activity_log`;
  - idempotência pela chave do envio na denúncia e por `where status = esperado` nas decisões;
  - saída montada à mão.
- [x] Toda action com id checa a posse: a denúncia é pública, sobre veículo visível (`contactTarget`); as decisões são da equipe da CajuGo; o lojista só lê o próprio veículo, com `store_id` da sessão.
- [x] Schemas de entrada não aceitam campos privilegiados: status, `decided_by`, `store_id` e datas vêm do servidor; o motivo `other` não é aceito na denúncia.
- [x] Dados pessoais novos: nenhum; a denúncia não guarda autor nem IP (`SECURITY.md` §8 atualizado na T001).
- [x] Formulário público com honeypot + rate limit
- [x] Consultas novas têm índice: parcial `vehicle_reports (vehicle_id, created_at) where open`; o resto usa os índices de `vehicles`
- [x] Migration aditiva (tabela, enums, colunas anuláveis, valores de enum)
- [x] Nada do Supabase além de Postgres e Auth; nenhuma dependência nova
- [x] D1–D4 aprovadas em 2026-11-16; PRD [1b] ajustado (D3)
