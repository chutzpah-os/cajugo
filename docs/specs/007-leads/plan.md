---
spec: 007
status: approved
---

# Plano · 007 Leads e desempenho do anúncio

## Resumo técnico
Domínio novo `leads` (previsto no `ARCHITECTURE.md` §3), com duas tabelas: `leads` e `vehicle_daily_stats`.
- **Página do veículo [1b]:** continua em cache. Três ilhas de cliente chamam Server Actions públicas:
  - o formulário "Envie uma mensagem à loja";
  - o botão WhatsApp (barra inferior e simulador), que registra o lead sem segurar a conversa;
  - um "ping" de visualização ao abrir a página.
- **Servidor:** confere se o veículo está visível ao público e descobre a loja a partir do veículo; o navegador nunca manda `storeId`.
- **Painel:** a tela Leads [3a] e o contador do menu leem direto do banco, sem cache (aparecem na hora, LED-NFR-003). O desempenho [6e] soma as visualizações do veículo e conta os leads dele.
- **Job diário:** ganha a etapa `purgeOldLeads`, que apaga os dados pessoais dos leads com mais de 2 anos.

## Impacto
| Camada | Mudança |
|---|---|
| Dados (migration `0016`, aditiva) | enums `lead_channel` (form, whatsapp), `lead_origin` (cajugo, store_catalog), `lead_status` (new, contacting, negotiating, sold, lost); tabela `leads`; tabela `vehicle_daily_stats (vehicle_id, day, views)` |
| `src/domains/leads/` (novo) | `service.ts`, `schemas.ts`, `actions.ts`, `status.ts` (próximo status, rótulos), `device.ts` (marcas no aparelho, D2), `components/` (`ContactForm`, `WhatsappButton`, `ViewPing`, `LeadsBoard`, `LeadCard`, `PerformanceBlock`) |
| `src/domains/showcase/` | `contactTarget(db, vehicleId)` no `service.ts`: loja, divulgação e WhatsApp do veículo **visível ao público** (`publicVisible`); a página [1b] e o simulador trocam o `<a>` do WhatsApp por `WhatsappButton` e ganham `ContactForm` e `ViewPing`; o catálogo da loja grava a marca de origem (D1) |
| `src/domains/auth/` | permissão `leads.manage` (dono e usuário da loja); menu do painel do lojista em `AREA_NAV.painel` (D3): Veículos · Leads · Minha loja · Conta |
| `src/app/` | `/painel/leads` (nova); `/painel/veiculos/[id]` com o bloco "Desempenho do anúncio"; `app/painel/layout.tsx` com `navCounts` (leads novos); `/api/v1/cron/daily` com `purgeOldLeads` |
| `src/platform/http/` | `isKnownBot(userAgent)`, uma lista curta de robôs, sem dependência nova (LED-FR-015) |
| Jobs | etapa nova no job diário: `purgeOldLeads(db, now)` (LED-SEC-006) |
| `src/app/termos` [12i] | conferir o trecho de privacidade do lead (o que guarda, quem vê, 2 anos) |

## Interfaces dos serviços (módulos profundos)
```ts
// domains/leads/service.ts
contactStore(db, raw: unknown, ctx: { ipHash; now }):                  // LED-FR-001/002/004, SEC-002/004
  Promise<{ ok: true } | { ok: false; message; errors: FieldError[] }>
recordWhatsappClick(db, raw: unknown, ctx: { ipHash; now }): Promise<void>   // nunca lança para a tela
recordView(db, raw: unknown, ctx: { ipHash; userAgent; now }): Promise<void>
leadsBoard(db, session, filter: LeadFilter, now): Promise<{
  cards: LeadCard[];                       // mais novo primeiro; dados pessoais só aqui
  counts: Record<"all" | "new" | "contacting" | "negotiating", number>;
  newCount: number;                        // "Novos, sem resposta"
  cajugoShare: number | null;              // % dos últimos 30 dias; null sem leads
}>
moveLead(db, session, raw: { leadId; to: "next" | "lost" }): Promise<LeadStatus>
newLeadsCount(db, session): Promise<number>                            // contador do menu
vehiclePerformance(db, session, vehicleId, now): Promise<{ views; leads; daysLive }>
purgeOldLeads(db, now): Promise<number>                                // job diário

// domains/showcase/service.ts
contactTarget(db, vehicleId): Promise<{ storeId; shared: boolean } | null>   // null = fora do ar
```
A regra fica escondida no serviço:
- a origem final: veículo não divulgado é sempre "Seu catálogo";
- o canal e o status inicial (WhatsApp entra em `contacting`);
- a ordem dos status;
- a janela de 30 dias;
- a posse pela sessão.

As actions só fazem cinco coisas: ler o IP e o agente, chamar o serviço, invalidar e devolver.

## Mapa requisito → solução
| Requisito | Solução |
|---|---|
| LED-FR-001 | `ContactForm` em [1b] (nome, e-mail, telefone, mensagem com o texto padrão, honeypot); `contactLeadAction` → `contactStore`: valida, acha a loja por `contactTarget`, grava `channel=form`, `status=new`; resposta "Mensagem enviada. A loja vai responder em breve." |
| LED-FR-002 | `leadFormSchema`: `z.email` e `brPhoneSchema` (fixo ou celular, já existe); erros por campo |
| LED-FR-003 | `WhatsappButton`: o `<a target="_blank">` abre a conversa e, em paralelo, chama `whatsappClickAction` sem esperar a resposta (erro engolido); `recordWhatsappClick` grava `channel=whatsapp` sem nome nem contato |
| LED-FR-004 | a ilha manda `origin`, calculada no aparelho (D1); o serviço força `store_catalog` quando o veículo não é divulgado na CajuGo |
| LED-FR-005 | `leadsBoard`: lista `store_id = sessão`, `created_at desc`; `newCount = count(status=new)`; `cajugoShare` = leads `cajugo` ÷ todos dos últimos 30 dias |
| LED-FR-006 | `counts` agrupados por status, sem data; filtro na URL (`?status=new`) |
| LED-FR-007 | `LeadCard`: sigla do nome, `relativeTime`, veículo · preço atual, selos; `wa.me` com o telefone do lead e `tel:` |
| LED-FR-008 | `status.ts`: `NEXT = { new: contacting, contacting: negotiating, negotiating: sold }`; "Perdido" no menu do card; `moveLead` só muda a partir de um status aberto (`update … where status = esperado`); `sold`/`lost` sem botão |
| LED-FR-009 | `highlight = status === "new" && now − createdAt > 24 h`, calculado no serviço |
| LED-FR-010 | o card liga para `/painel/veiculos/{id}` (vendido e despublicado abrem normalmente); veículo `deleted` → "Veículo excluído" sem link; o lead guarda `vehicle_id` e o veículo é soft delete |
| LED-FR-011 | `newLeadsCount` no `navCounts` de `app/painel/layout.tsx` (`NavItem.count` da 006d); menu do painel (D3) |
| LED-FR-012 | `PerformanceBlock` em `/painel/veiculos/[id]`: `views = sum(vehicle_daily_stats.views)`, `leads = count(leads)` do veículo, `daysLive` = dias desde `published_at` até hoje (ou até `sold_at`) |
| LED-FR-013 | o aparelho guarda em `localStorage` a hora do último lead de WhatsApp por veículo e não chama a action antes de 24 h (D2); a conversa abre sempre |
| LED-FR-014 | `recordWhatsappClick` grava `status=contacting`; o card de `channel=whatsapp` mostra "Contato pelo WhatsApp" sem WhatsApp e Ligar; `newCount` e o contador só contam `new` |
| LED-FR-015 | `ViewPing` chama `viewAction` uma vez por veículo por dia do aparelho (`localStorage`, D2); `recordView` ignora `isKnownBot(userAgent)` e faz `insert … on conflict (vehicle_id, day) do update set views = views + 1`; a contagem começa com a tabela vazia |
| LED-NFR-001 | componentes base (44 px); e2e em 390 e 1280 px com `audit()` |
| LED-NFR-002 | a página segue em `'use cache'`; as ilhas não mudam o HTML acima da dobra (formulário abaixo da ficha); `ViewPing` roda depois da hidratação; medição no build de produção |
| LED-NFR-003 | `/painel/leads` e o contador sem cache: o lead aparece na próxima abertura |
| LED-SEC-001 | `storeId` sempre da sessão; `moveLead`/`vehiclePerformance` filtram por `store_id` e respondem `AppError.notFound` para id de outra loja; teste "loja B" |
| LED-SEC-002 | honeypot (finge sucesso) no formulário; `consumeRateLimit` por `hashIp` com `publicForm` + `publicFormDaily` no formulário e no clique (chaves separadas); visualização com `liveCheck` (60/min); nenhum IP guardado no lead |
| LED-SEC-003 | dados pessoais só saem de `leadsBoard` (sessão da loja); a vitrine, o catálogo e `contactTarget` não leem `leads` |
| LED-SEC-004 | `leadFormSchema.strict()`: nome 2–80, e-mail ≤ 254, mensagem ≤ 1.000; aviso com link para `/termos#privacidade` |
| LED-SEC-005 | `moveLead` exige `authorizeTo(session, "leads.manage")` (dono e usuário da loja); admin e suporte não têm essa permissão |
| LED-SEC-006 | `purgeOldLeads`: `update leads set name = email = phone = message = null, purged_at = now where created_at <= now − 2 anos and purged_at is null`; o lead continua nas contagens |

## Modelo de dados
```ts
export const leadChannel = pgEnum("lead_channel", ["form", "whatsapp"]);
export const leadOrigin = pgEnum("lead_origin", ["cajugo", "store_catalog"]);
export const leadStatus = pgEnum("lead_status", ["new", "contacting", "negotiating", "sold", "lost"]);

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  vehicleId: uuid("vehicle_id").notNull().references(() => vehicles.id),
  channel: leadChannel("channel").notNull(),
  origin: leadOrigin("origin").notNull(),
  status: leadStatus("status").notNull(),
  name: text("name"),        // nulos no WhatsApp e depois de 2 anos (LED-SEC-006)
  email: text("email"),
  phone: text("phone"),      // 55 + DDD + número
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  purgedAt: timestamp("purged_at", { withTimezone: true }),
}, (t) => [
  index("leads_store_status_created").on(t.storeId, t.status, t.createdAt.desc()),
  index("leads_store_created").on(t.storeId, t.createdAt.desc()),
  index("leads_vehicle").on(t.vehicleId),
  index("leads_created_unpurged").on(t.createdAt).where(sql`${t.purgedAt} is null`),
]);

export const vehicleDailyStats = pgTable("vehicle_daily_stats", {
  vehicleId: uuid("vehicle_id").notNull().references(() => vehicles.id),
  day: date("day").notNull(),               // dia em America/Sao_Paulo
  views: integer("views").notNull().default(0),
}, (t) => [primaryKey({ columns: [t.vehicleId, t.day] })]);
```
```sql
-- 0016 (aditiva)
CREATE TYPE "lead_channel" AS ENUM ('form','whatsapp');
CREATE TYPE "lead_origin" AS ENUM ('cajugo','store_catalog');
CREATE TYPE "lead_status" AS ENUM ('new','contacting','negotiating','sold','lost');
CREATE TABLE "leads" ( ... );
CREATE TABLE "vehicle_daily_stats" ( ... , PRIMARY KEY ("vehicle_id","day"));
-- índices acima
```
Diferenças em relação ao `ARCHITECTURE.md` §4:
- `seller_id` e a origem `seller` entram na 008/009, quando existir vendedor.
- `vehicle_daily_stats` nasce só com `views`. Os leads do desempenho são contados direto em `leads`, que já tem o índice por veículo. `whatsapp_clicks` repetiria esses leads, e `seller_link_clicks` é da 008.
- `purged_at` é coluna nova (LED-SEC-006).

## Estratégia de testes
| Requisito | Unitário | Integração (PGlite) | e2e (Playwright, staging) |
|---|---|---|---|
| LED-FR-001 | schema do formulário | `contactStore` grava lead `new` na loja do veículo; veículo fora do ar → recusa | enviar o formulário em [1b] → confirmação; lead aparece em [3a] |
| LED-FR-002 | e-mail e telefone inválidos | — | erro no campo |
| LED-FR-003 | `WhatsappButton` abre o link mesmo com a action falhando | `recordWhatsappClick` grava sem nome | tocar em WhatsApp → lead "Contato pelo WhatsApp" |
| LED-FR-004 | origem do aparelho (D1) | não divulgado força `store_catalog` | catálogo → veículo → "Seu catálogo"; vitrine → "via CajuGo" |
| LED-FR-005 | — | `newCount`, `cajugoShare` com lead de 40 dias fora | indicadores em [3a] |
| LED-FR-006 | — | `counts` por status | filtro "Novo" |
| LED-FR-007 | sigla, tempo relativo | — | card completo |
| LED-FR-008 | `NEXT` | `moveLead` next/lost; status fechado não muda | avançar e "Perdido" |
| LED-FR-009 | `highlight` 25 h × 1 h | — | — |
| LED-FR-010 | — | lead de veículo excluído vem marcado | link para a edição |
| LED-FR-011 | — | `newLeadsCount` | contador no menu |
| LED-FR-012 | `daysLive` | `vehiclePerformance` | bloco em [6e] |
| LED-FR-013 | `device.ts`: 1 h bloqueia, 25 h libera | — | dois toques → um lead |
| LED-FR-014 | — | WhatsApp entra em `contacting`, fora de `newCount` | card sem WhatsApp/Ligar |
| LED-FR-015 | `isKnownBot`; `device.ts` por dia | upsert soma por dia | — |
| LED-NFR-001 | — | — | 390/1280 px, `audit()` |
| LED-NFR-002 | — | — | build de produção: LCP/CLS de [1b] |
| LED-NFR-003 | — | — | lead aparece sem esperar |
| LED-SEC-001 | — | loja B: `leadsBoard` vazio, `moveLead` e `vehiclePerformance` → not found | — |
| LED-SEC-002 | honeypot | 6º envio no minuto; clique com chave própria | — |
| LED-SEC-003 | — | — | vitrine e catálogo sem o nome do lead |
| LED-SEC-004 | mensagem de 1.001 caracteres | — | link de privacidade no formulário |
| LED-SEC-005 | — | suporte em `moveLead` → forbidden | — |
| LED-SEC-006 | — | `purgeOldLeads` 2 anos + 1 dia limpa, 1 dia antes não; continua contando | — |

## Riscos e alternativas descartadas
- **Escrita por visualização:** cada aparelho grava uma vez por veículo por dia. Com o tráfego do MVP isso cabe na cota gratuita do Supabase. Se crescer, a saída é agregar em memória e gravar em lote; agora seria complexidade sem necessidade.
- **Contagem no aparelho (D2) é burlável:** quem limpa o navegador conta de novo. Aceito: o número é para o lojista ter noção, não é cobrança. O limite por IP segura o abuso.
- **Descartado: rota `/loja/{slug}/v/{id}`** (PRD §8) só para saber a origem. Ela duplicaria a página do veículo para o Google (`SEO.md`, uma URL canônica). Fica a marca de origem no aparelho (D1).
- **Descartado: `?origem=loja` nos links do catálogo.** Cria URLs duplicadas para o robô de busca rastrear e vaza a origem nos links compartilhados.
- **Descartado: lead do WhatsApp por Route Handler com `sendBeacon`.** Como o WhatsApp abre em outra aba, a página continua viva e a Server Action termina normalmente. Uma rota `/api/v1` pediria um `contract.md` e fugiria do padrão "telas usam actions" (`ARCHITECTURE.md`).
- **Descartado: identificador de aparelho em cookie.** Seria um dado novo de rastreio (LGPD). O `localStorage` com a data do último registro não identifica ninguém e não sai do aparelho.

## Decisões (aprovadas em 2026-11-16, nas opções recomendadas)
- **D1. Origem "Seu catálogo".** Hoje só existe a página `/v/{slug}`, aberta tanto pela vitrine quanto pelo catálogo da loja. **Recomendo:**
  - Abrir o catálogo `/loja/{slug}` grava no aparelho (`sessionStorage`, só naquela aba) que o visitante está no catálogo daquela loja.
  - Um contato num veículo dessa loja, na mesma aba, é "Seu catálogo". O resto é "via CajuGo".
  - Veículo não divulgado na CajuGo é sempre "Seu catálogo".

  Efeito colateral: o link de um veículo que a loja manda direto no WhatsApp, sem passar pelo catálogo, conta como "via CajuGo".
  Alternativa: `?origem=loja` nos links do catálogo, descartado acima por SEO.
- **D2. "Mesmo aparelho" = `localStorage` do navegador.** Vale para os leads de WhatsApp a cada 24 h e para a visualização por dia. Sem cookie e sem identificador guardado no servidor; o limite por IP segura o abuso. Alternativa: hash do IP no servidor, mas várias pessoas na mesma rede de celular dividem o IP, e isso juntaria pessoas diferentes num lead só.
- **D3. Menu do painel do lojista agora**, com Veículos · Leads · Minha loja · Conta (PRD §6, navegação). Hoje o painel não tem menu, e o contador de leads (LED-FR-011) precisa de um. Usa o mesmo `AREA_NAV` e o `navCounts` da 006d.

## Ajustes de documento (na T001, com as decisões)
- **ARCHITECTURE §4:** `leads` e `vehicle_daily_stats` como neste plano. **§6:** `purgeOldLeads` no job diário.
- **API.md §5:** `contactLeadAction`, `whatsappClickAction`, `viewAction`, `moveLeadAction`, `/painel/leads`.
- **SECURITY §8:** o lead perde os dados pessoais depois de 2 anos; marca no aparelho (`localStorage`/`sessionStorage`) sem dado pessoal.
- **GLOSSARY:** Visualização; Desempenho do anúncio; Status do lead (Novo, Em contato, Negociando, Vendido, Perdido).
- **PRD §8:** a rota `/loja/{slug}/v/{id}` não existe; a página do veículo é uma só (D1).
- **Termos [12i]:** conferir o trecho de privacidade do lead.

## Conformidade
- [x] Todo requisito da spec aparece no mapa requisito → solução (15 FR, 3 NFR, 6 SEC)
- [x] Actions seguem o `API.md` §2: schemas `.strict()` com limites; `storeId` da sessão ou do veículo, nunca do navegador; `moveLead` com `update … where status = esperado` (idempotente); saída montada à mão
- [x] Toda action com id checa a posse: `moveLead` e `vehiclePerformance` filtram por `store_id` da sessão → 404; o contato público checa `publicVisible`
- [x] Schemas de entrada não aceitam campos privilegiados (`status`, `storeId`, `channel`, datas vêm do servidor; `origin` é rebaixada para `store_catalog` quando o veículo não é divulgado)
- [x] Dados pessoais novos: nome, e-mail, telefone e mensagem do lead já estão na tabela do `SECURITY.md` §8; retenção de 2 anos implementada (LED-SEC-006)
- [x] Formulário público com honeypot + rate limit; clique e visualização com rate limit
- [x] Consultas novas têm índice: `(store_id, status, created_at)`, `(store_id, created_at)`, `(vehicle_id)`, parcial de `created_at` para o job; PK de `vehicle_daily_stats`
- [x] Migration aditiva (enums e tabelas novas)
- [x] Nada do Supabase além de Postgres e Auth; nenhuma dependência nova (lista de robôs própria)
- [x] **D1–D3 aprovadas** em 2026-11-16; o PRD §8 (rota do veículo no catálogo) é ajustado na T001
