---
spec: 007
---

# Tasks · 007 Leads e desempenho do anúncio

Fatias verticais (`SDD.md` §7, skill `tdd`): cada task de comportamento é um ciclo teste falhando → código → verde. Testes com o ID do requisito no nome. Toda ação com id tem o caso "loja B" (`TESTING.md`): `moveLead` e `vehiclePerformance` com lead ou veículo de outra loja → not found. Decisões D1–D3 do plano aprovadas nas opções recomendadas (2026-11-16).

## Fase 1 — Fundação
- [x] **T001** Documentos:
  - ARCHITECTURE §4 (`leads`, `vehicle_daily_stats`) e §6 (`purgeOldLeads`);
  - API.md §5 (actions e `/painel/leads`);
  - SECURITY §8 (2 anos; marcas no aparelho sem dado pessoal);
  - GLOSSARY (Visualização, Desempenho do anúncio, status do lead);
  - PRD §8 sem `/loja/{slug}/v/{id}` (D1);
  - termos [12i] (trecho do lead).

  · _—_
- [x] **T002** Migration `0016`, aditiva:
  - enums `lead_channel`, `lead_origin` e `lead_status`;
  - tabelas `leads` e `vehicle_daily_stats`;
  - índices do plano.

  · _LED-FR-005, LED-FR-015_
- [x] **T003** [P] `leads/status.ts` e `leads/device.ts`:
  - `status.ts`: próximo status (`NEXT`), rótulos, `highlight` (Novo há mais de 24 h);
  - `device.ts`: marcas no aparelho (WhatsApp a cada 24 h, visualização por dia, origem do catálogo por aba).

  · _LED-FR-008, LED-FR-009, LED-FR-013, LED-FR-015, LED-FR-004_
- [x] **T004** [P] `isKnownBot(userAgent)` em `platform/http`, com a lista curta de robôs (Googlebot, Bingbot, crawlers de redes sociais, `HeadlessChrome`, etc.). Sem dependência nova.

  · _LED-FR-015_

## Fase 2 — Fatias verticais (servidor)
- [x] **T005** `showcase.contactTarget(vehicleId)`: devolve loja e divulgação do veículo visível ao público (`publicVisible`), ou `null` fora do ar. Mais `leadFormSchema` (`.strict()`, `z.email`, `brPhoneSchema`, limites).

  · _LED-FR-002, LED-SEC-004_
- [x] **T006** `contactStore` e `contactLeadAction`:
  - lead `form`/`new` na loja do veículo;
  - origem rebaixada para `store_catalog` quando o veículo não é divulgado;
  - honeypot que finge sucesso;
  - limite por IP (`publicForm`, `publicFormDaily`);
  - veículo fora do ar recusado.

  · _LED-FR-001, LED-FR-004, LED-SEC-002, LED-SEC-004_
- [x] **T007** `recordWhatsappClick` e `whatsappClickAction`:
  - lead `whatsapp`/`contacting`, sem nome nem contato;
  - limite por IP com chave própria;
  - erro nunca chega à tela.

  · _LED-FR-003, LED-FR-014, LED-SEC-002_
- [x] **T008** `recordView` e `viewAction`:
  - upsert por `(vehicle_id, dia em São Paulo)`;
  - robô ignorado;
  - limite `liveCheck`;
  - veículo fora do ar ignorado.

  · _LED-FR-015, LED-SEC-002_
- [x] **T009** `leadsBoard` e `newLeadsCount`:
  - lista da loja da sessão, mais novo primeiro;
  - contagens por status;
  - `newCount` só de `new`;
  - `cajugoShare` dos últimos 30 dias;
  - `highlight`;
  - veículo excluído marcado;
  - loja B vê lista vazia e contagens zeradas.

  · _LED-FR-005, LED-FR-006, LED-FR-009, LED-FR-010, LED-FR-014, LED-SEC-001, LED-SEC-003_
- [x] **T010** `moveLead` e `moveLeadAction`:
  - `next` e `lost` só a partir de status aberto (`update … where status = esperado`);
  - permissão nova `leads.manage`;
  - suporte recusado;
  - lead da loja B → not found.

  · _LED-FR-008, LED-SEC-001, LED-SEC-005_
- [x] **T011** `vehiclePerformance`:
  - soma das visualizações;
  - leads do veículo;
  - dias no ar (até hoje ou até a venda);
  - veículo da loja B → not found.

  · _LED-FR-012, LED-SEC-001_
- [x] **T012** `purgeOldLeads` no job diário:
  - lead com 2 anos + 1 dia perde nome, e-mail, telefone e mensagem (`purged_at`), e 1 dia antes não;
  - continua contando;
  - idempotente;
  - log `cron.daily` com a contagem.

  · _LED-SEC-006_

## Fase 3 — Telas
- [x] **T013** Página do veículo [1b], formulário e visualização:
  - `ContactForm` abaixo da ficha, com mensagem padrão, honeypot, aviso de privacidade e a confirmação "Mensagem enviada…";
  - `ViewPing` depois da hidratação;
  - o catálogo `/loja/{slug}` grava a marca de origem da aba (D1).

  · _LED-FR-001, LED-FR-002, LED-FR-004, LED-FR-015, LED-SEC-004, LED-NFR-002_
- [x] **T014** `WhatsappButton` na barra inferior de [1b] e no simulador [14b]:
  - abre a conversa sempre;
  - registra o lead uma vez a cada 24 h por aparelho;
  - teste com a action falhando.

  · _LED-FR-003, LED-FR-013_
- [x] **T015** Menu do painel do lojista (D3): `AREA_NAV.painel` com Veículos · Leads · Minha loja · Conta, permissões por item e `navCounts` com os leads novos em `app/painel/layout.tsx`.

  · _LED-FR-011, LED-NFR-003_
- [ ] **T016** `/painel/leads` [3a]:
  - indicadores e filtros com contagem (`?status=`);
  - `LeadCard` com sigla, tempo relativo, veículo · preço, selos, mensagem, WhatsApp, Ligar, "→ próximo status" e "Perdido" no menu;
  - card "Contato pelo WhatsApp";
  - destaque de Novo há mais de 24 h;
  - veículo excluído sem link.

  · _LED-FR-005 a LED-FR-010, LED-FR-014, LED-NFR-001, LED-NFR-003_
- [ ] **T017** Bloco "Desempenho do anúncio" em `/painel/veiculos/[id]` [6e]: Visualizações, Leads e Dias no ar.

  · _LED-FR-012_

## Fase 4 — Fechamento
- [ ] **T018** Seed e2e com uma loja que tem leads em todos os status, um lead de WhatsApp, um Novo há 25 h e um lead de veículo excluído.

  Playwright em 390 e 1280 px:
  - formulário e WhatsApp em [1b] viram lead;
  - catálogo → "Seu catálogo" e vitrine → "via CajuGo";
  - dois toques geram um lead;
  - [3a] com indicadores, filtro, avanço e "Perdido";
  - contador do menu e desempenho em [6e];
  - vitrine e catálogo sem o nome do lead;
  - `audit()`.

  Build de produção: LCP/CLS de [1b].

  · _LED-FR-001 a LED-FR-015, LED-NFR-001 a LED-NFR-003, LED-SEC-003, LED-SEC-004_
- [ ] **T019** Fechamento:
  - migration `0016` no staging e, com sua autorização, no prod antes do push;
  - `/verify` com rastreabilidade verde;
  - spec `implemented`;
  - PLAN, `docs/changes` e `docs/decisions`.

  · _—_
