# Arquitetura

> Stack e modelo de dados do CajuGo. Produto em `PRD.md`, rotas em `API.md`, segurança em `SECURITY.md`.

## 1. Stack

| Peça | Escolha | Plano |
|---|---|---|
| Web + servidor | **Next.js** (App Router), full-stack, serverless na **Vercel** | Hobby no desenvolvimento; ao cobrar clientes migração para VPS (o Hobby não permite uso comercial) |
| Banco | **Postgres no Supabase**, acessado com **Drizzle** só no servidor | Free |
| Login | **Supabase Auth** (e-mail e senha) | Free |
| Imagens | **Cloudinary** (upload assinado, redimensionamento, CDN) | Free |
| Jobs agendados | **Vercel Cron** chamando uma rota interna | 1×/dia no Hobby, o que basta para o MVP |
| App mobile (Expo) | Fase futura | — |

**Ferramentas:** pnpm, TypeScript, ESLint + Prettier, Vitest (serviços contra PGlite, Postgres em memória, sem Docker) + Playwright (e2e, viewport de celular), zod (entrada das actions), Tailwind (tokens do `design/DESIGN.md`).

**Pagamento:** Pix manual com comprovante no MVP (PRD §5.6); gateway (Stripe ou outro) na fase 2.

**Avisos:** no MVP, aviso no painel + botão `wa.me` enviado por uma pessoa; sem SMS, WhatsApp automático ou e-mail obrigatório (PRD §11).

**Ainda não definido:** e-mail transacional, fonte da FIPE. Não escolha sem perguntar.

### O que usamos do Supabase (e o que não)
- **Usamos:** Postgres (via Drizzle) e Auth.
- **Não usamos:** Storage (as imagens ficam no Cloudinary), Data API/PostgREST pelo navegador, Realtime e Edge Functions. Regra de negócio fica no Next, não em RLS nem em funções do banco.
- Isso deixa a saída da Vercel (para uma VPS) simples: o Next roda em qualquer Node, e o banco continua no mesmo lugar.

### Limites do plano gratuito
- **Supabase Free:** 500 MB de banco e 50 mil usuários ativos/mês. **O projeto pausa após 7 dias sem atividade**: tranquilo com tráfego real, mas em staging parado precisa ser reativado no painel. **O e-mail nativo do Auth só serve para teste** (poucos e-mails por hora): por isso o MVP não depende de e-mail do Auth (recuperação de senha é manual, PRD [6b]).
- **Cloudinary Free:** cota mensal de créditos. Use poucas variantes fixas (`thumb`, `card`, `full`) com `f_auto,q_auto`.

## 2. Visão geral

```
 Navegador ──▶ Next.js na Vercel ───────────────▶ Postgres (Supabase, pooler)  [Drizzle]
              ├ páginas (SSR/ISR)          ├────▶ Supabase Auth (cookies httpOnly)
              ├ Server Actions             ├────▶ Cloudinary (assina upload; o browser envia direto)
              ├ Route Handlers /api/v1     ├────▶ Gateway de pagamento + webhook (fase 2)
              └ Vercel Cron                └────▶ E-mail transacional
```

Decisões:
- **O navegador nunca fala com o banco nem com o Supabase.** Login, logout e recuperação de senha são Server Actions; a sessão vive em cookies httpOnly definidos pelo servidor.
- **Camada de serviço por domínio** (`vehicles`, `stores`, `leads`, `subscriptions`, `admin`…). Páginas, actions e rotas chamam o serviço, nunca o Drizzle direto.
- **Telas usam Server Components e Server Actions.** Os Route Handlers em `/api/v1/*` ficam para o cron e, na fase 2, webhooks do gateway e o app Expo.

### Conexão com o banco
- Em runtime (serverless): **pooler em modo transação** do Supabase (porta 6543), com prepared statements desligados no driver.
- Migrations: conexão direta (ou pooler em modo sessão).
- **Migrations só pelo Drizzle Kit, versionadas no repositório.** Nunca crie ou altere tabela pelo painel do Supabase.

## 3a. Endereços das lojas (PRD §1.7)
- Por caminho, sempre (ADR 0009): `cajugo.vercel.app/loja/{slug}` agora, `cajugo.com.br/loja/{slug}` com domínio próprio. Rota `src/app/(public)/loja/[slug]/`.
- Sem subdomínio: nada de domínio curinga nem reescrita por host; a troca de domínio é só `APP_URL` + 301 do domínio antigo.
- Todo link absoluto para loja passa por **uma função só** (ex.: `storeUrl(slug)` em `src/platform/`), que lê `APP_URL`. Nada de montar URL de loja à mão.

## 3. Estrutura de pastas
Organizada **por domínio**: o que muda junto fica junto. As rotas do Next ficam finas e chamam o domínio.

```
src/
├─ app/                    rotas do App Router (finas: leem a sessão, chamam o domínio, renderizam)
│  ├─ (public)/            vitrine /, catálogo /loja/{slug}, veículo /v/..., /lojistas, /entrar
│  ├─ painel/              área do lojista
│  ├─ admin/               área da equipe CajuGo
│  └─ api/v1/              Route Handlers: cron (fase 2: webhooks do gateway)
├─ domains/                um por área do GLOSSARY.md
│  ├─ vehicles/
│  │  ├─ service.ts        regra de negócio e acesso ao banco
│  │  ├─ actions.ts        Server Actions ('use server')
│  │  ├─ schemas.ts        zod: entrada das actions
│  │  ├─ components/       UI própria do domínio
│  │  └─ *.test.ts         testes Vitest (IDs de requisito no nome)
│  └─ auth/ stores/ billing/ (faturas, Pix) leads/ moderation/ sellers/ (Rede Caju) referrals/ (Caju Indica) buyers/ (favoritos no aparelho, alertas) settings/
├─ ui/                     componentes base do DESIGN.md (botão, input, chip, selo, toggle, bottom sheet...)
└─ platform/               infraestrutura comum
   ├─ db/                  cliente e schema do Drizzle
   ├─ supabase/            cliente de Auth no servidor
   ├─ cloudinary/          assinatura de upload, URLs de variantes
   ├─ seo/                 título, descrição, canônica, JSON-LD, Open Graph, sitemap (docs/SEO.md)
   ├─ browser/             marcas no aparelho (`claimOncePer`), sem servidor (007b)
   └─ http/                errors (AppError, problem+json, ActionResult), session (authorize), rate-limit,
                           client-ip (hash), honeypot, activity-log, logger
drizzle/                   migrations SQL geradas pelo Drizzle Kit
tests/e2e/                 Playwright
```

Regras:
- `app/` não acessa o banco: chama `domains/*`.
- Um domínio usa outro só pelo `service.ts` dele, nunca pelos arquivos internos.
  - **Exceção de tela:** a página do veículo (`showcase`) usa componentes de outros domínios que agem sobre ela: o coração dos favoritos (`buyers`, 006c), o formulário de contato e o botão WhatsApp (`leads`, 007) e "Denunciar anúncio" (`moderation`, 007b); a rota da página do veículo também monta o contador de cliques do link do vendedor (`sellers`, 008). O card de Meus veículos (`vehicles`) mostra o motivo do Ocultar com os rótulos de `moderation/reasons.ts` (arquivo sem servidor), porque `moderation` já depende do serviço de `vehicles`. Só componente de tela; dado e regra continuam no `service.ts` de cada um.
- `ui/` não conhece domínio nem banco.
- `platform/` não conhece domínio.

## 4. Modelo de dados (Postgres)

Tabelas e colunas em inglês, `snake_case` no banco (camelCase no TypeScript). IDs `uuid` v7 gerados pela aplicação (`src/platform/db/uuid.ts`; o Postgres 17 não gera v7). Dinheiro em centavos (`integer`). Datas `timestamptz`. Enums do Postgres para status. Cada tabela entra na migration da spec que a usa; as já criadas estão marcadas com ✅.

```
# Contas e papéis
profiles ✅              # 1:1 com auth.users (mesmo id; sem FK, porque o schema auth é do Supabase)
  id, name, email, phone, roles (user_role[]: store_owner|store_staff|seller|referrer|admin|support),
  store_id (loja do dono/equipe), cpf (só dígitos, único quando preenchido; vendedor na 008, resgate na 010),
  pix_key, pix_key_type (cpf|cnpj|email|phone|random),
  notify_email, must_change_password, created_at, last_login_at
  # hoje a coluna é `role` (um papel); vira `roles` na spec 001 (migration aditiva + cópia)

# Loja e assinatura (a assinatura vive na própria loja)
stores ✅ (+ colunas novas)
  id, name, slug (unique, `[a-z0-9-]`), tax_id + tax_id_type (cpf|cnpj: documento de quem paga, spec 004), city, state, city_slug (gerado: cidade sem acento + `-uf`, endereço de descoberta, 006b), whatsapp, about, instagram,
  address_street, address_number, address_complement, address_district, address_zip (spec 003),
  logo_public_id, cover_public_id, hours (jsonb), share_by_default, owner_id,
  status (registered|payment_review|active|past_due|suspended|cancel_scheduled|canceled|archived),
  billing_day, next_due_at, activated_at (1ª ativação), past_due_since, cancel_at, active_until, slug_reserved_until,
  slug_changed_at (troca no máximo 1× a cada 30 dias),
  accepts_sellers (bool, começa desligado; 009), commission_type (pct|fixed), commission_value (bps ou centavos; colunas na 008, tela [7e] na 009),
  created_at, updated_at                       # indicação usada: em referrals.referred_store_id
store_slug_redirects     old_slug (pk), store_id, expires_at

invoices                 id, store_id, kind (first|monthly), period (AAAA-MM; null na first), membership_cents,
                         fees_cents, credit_cents, total_cents (valor esperado, fixado na abertura pela regra vigente),
                         due_at, status (open|paid|overdue|canceled), paid_at          # spec 004 (first); mensais na 011
payments                 id, invoice_id, store_id, paid_cents (informado pelo lojista), amount_cents (o que vale,
                         corrigível pelo admin), receipt_public_id + receipt_format (Cloudinary `authenticated`),
                         status (submitted|confirmed|rejected), reject_reason, manual (bool), method (pix|cash|transfer|other),
                         note, submitted_by, submitted_at, reviewed_by, reviewed_at
                         # no máximo 1 `submitted` por fatura (índice único parcial)
notices                  id, profile_id (quem vê), kind, data (jsonb, sem dado pessoal), created_at, dismissed_at
                         # avisos no painel (ADR 0007); cada spec acrescenta os seus `kind`
billing_credits          id, store_id, kind (overpayment|fee_refund|referral), amount_cents, source_id (pagamento ou venda),
                         applied_invoice_id (nulo = disponível), created_at
                         # 011: sobra de pagamento, taxa de venda desfeita com a fatura paga e, na 010, Caju Indica;
                         # abatido na abertura da fatura; a fatura nunca fica negativa

# Veículos
vehicles
  id, store_id, type (car), status (draft|pending_approval|published|hidden|sold|deleted),
  plate (privada), plate_end, chassis (privado),
  fipe_brand_id, fipe_model_id, fipe_year_id, make, model, version (nomes guardados), fipe_code, fipe_month,
  year_manufacture, year_model, mileage_km, transmission, fuel, body, color, doors, engine,
  price_cents, fipe_price_cents, show_installment,
  conditions (jsonb: accepts_trade, single_owner, ipva_paid, licensed, dealer_serviced, factory_warranty, armored),
  features (text[]), description, contact_whatsapp, share_on_cajugo, share_before_sale,
  hidden_reason, hidden_note, hidden_at, hidden_by (marca de moderação do Ocultar, 007b: sobrevive a despublicar,
  publicar e desfazer a venda; só `Mostrar de novo` limpa),
  commission_override_type, commission_override_value (ajuste da comissão no lugar da padrão, 009),
  sale_id (venda ativa da Rede Caju; com ela, o desfazer simples é recusado, 009),
  make_slug, model_slug (filtros e descoberta), search_text (marca, modelo e versão, sem acento, feito pela aplicação),
  search (tsvector gerado de search_text, config `simple`; sem a extensão unaccent), rank_score (relevância: dia da publicação + completude),
  published_at, sold_at, deleted_at (excluído: guardado 90 dias), created_at, updated_at   # spec 005
vehicle_photos           id, vehicle_id, public_id, position, width, height     # position 0 = capa
vehicle_history          id, vehicle_id, field, old_value, new_value, user_id, created_at   # spec 005: field = price

# Tabela FIPE copiada sob demanda (ADR 0012); só o domínio fipe escreve
fipe_brands              id (pk, código FIPE), name, synced_at
fipe_models              id (pk), brand_id, name, synced_at
fipe_years               id (pk = modelo:ano), model_id, label, synced_at
fipe_prices              year_id (pk), fipe_code, price_cents, month, fetched_at
vehicle_daily_stats      vehicle_id + day (pk, dia em São Paulo), views (007: 1 por aparelho por dia, sem robôs;
                         seller_link_clicks entra na 008; leads do desempenho são contados em `leads`)
approvals                id, vehicle_id, checks (jsonb), status (pending|approved|changes_requested), reason,
                         reviewed_by, reviewed_at

# Contato e moderação
leads                    id, store_id, vehicle_id, name, email, phone, message (nulos no WhatsApp e após 2 anos),
                         channel (form|whatsapp), origin (cajugo|store_catalog), status (new|contacting|
                         negotiating|sold|lost; WhatsApp entra em contacting), created_at, updated_at, purged_at
                         (007), seller_id + origem seller (008: só vendedor ativo e parceiro da loja)
vehicle_reports          id (chave do envio, uuid v7 da tela), vehicle_id (cascade), reason (sold|unreal_price|
                         wrong_photos|scam), details, status (open|kept|hidden), decided_by, decided_at, created_at
                         (007b; sem autor nem IP; a denúncia de vendedor da 009 terá tabela própria)

# Rede Caju
sellers                  profile_id (pk), code (unique, gerado ao aprovar, usado no ?ref=), city,
                         status (in_review|active|blocked), document_front/back_public_id + _format (privados,
                         `authenticated`), blocked_reason, decided_by, approved_at, created_at, updated_at   # 008
                         (rating_avg entra na 009, com as avaliações)
partnerships             id, seller_id, store_id, origin (request|invite),
                         status (pending|active|declined|ended), created_at, updated_at, ended_at
                         # única aberta por vendedor e loja; bloqueio do vendedor não muda a parceria (008)
seller_vehicle_clicks    seller_id + vehicle_id + day (pk, dia em São Paulo), clicks (1 por aparelho por dia, sem robôs, 008)
sales                    id, vehicle_id, store_id, final_price_cents, seller_id (nulo na venda da loja),
                         attribution (link|other_partner|store), commission_cents, commission_status (to_receive|paid;
                         "em análise" é da fase 2), fee_bps + fee_cents (taxa CajuGo guardada na confirmação),
                         invoice_id (011), commission_received_at (Recebi do vendedor; desfazer em 24 h, 008b), confirmed_by,
                         created_at, canceled_at (desfazer)   # 009; 1 ativa por veículo
seller_reviews           id, seller_id, store_id, rating (1–5), text, created_at

# Caju Indica
referral_codes           code (pk), profile_id (dono) ou campaign_name (link de campanha, sem recompensa), active   # criadas na 003 (código pessoal do lojista); campanhas na 010
referrals                id, code, referrer_id, referred_store_id, status (invited|registered|active|paused|ended|rejected),
                         reject_reason (ex.: self_referral, spec 004), months_paid (0–3), created_at
rewards                  id, referral_id, beneficiary_id, period, amount_cents,
                         status (expected|credited|applied|redeemed)
payouts                  id, profile_id, amount_cents, pix_key, cpf, status (requested|paid), paid_by, paid_at

# Comprador
favorites                profile_id + vehicle_id (pk), price_at_save_cents, created_at   # sem conta: no aparelho
search_alerts            id, status (pending|notified|canceled|expired), name, phone (apagados ao fechar), query (filtros normalizados), discovery_path, consent_at, created_at, closed_at, notified_by   # 006d

# Plataforma
setting_values           id, key, value (jsonb), valid_from, changed_by    # só INSERT; ADR 0010
                         uma linha por alteração; valor atual = mais recente por key; chaves e limites
                         em src/domains/settings/definitions.ts (support_whatsapp, pix [chave, favorecido, cidade], membership_cents, installment_down_bps, installment_months, review_business_days,
                         past_due_tolerance_days, cajugo_fee_bps, installment_rate_bps, require_approval,
                         min_photos, retention_days, referral_enabled, referral_who, referral_pct_bps,
                         referral_months, payout_min_cents)
activity_log ✅           id, user_id, action, entity, entity_id, data (jsonb), created_at     # só INSERT
rate_limits ✅            key + window_start (pk), count
webhook_events           id (pk = id do evento no gateway), type, received_at, processed_at   # fase 2
```

Índices iniciais: `vehicles(status, share_on_cajugo)`, `vehicles(store_id, status)`, `vehicles(make, model)`, `vehicles(price_cents)`, GIN em `vehicles(search)`, `leads(store_id, status, created_at)`, `payments(status, submitted_at)`, `invoices(store_id, status)`, `notices(profile_id, created_at)`, `stores(tax_id)`, `partnerships(store_id, status)`, `sales(seller_id, commission_status)`, `referrals(referrer_id, status)`.

### Regras que o modelo garante
- **Nenhuma regra numérica no código:** valores de `setting_values` (PRD §5.14), lidos com cache de até 1 minuto; cálculos usam o valor vigente na data do fato (ADR 0010).
- **Estoque único:** vitrine, catálogo e links de vendedor leem `vehicles`; nada é copiado.
- **Antifraude do Caju Indica:** autoindicação bloqueada (mesmo CPF/CNPJ/celular entre quem indica e a loja); CPF único por resgate.

### Vitrine = consulta, não cópia
A regra do PRD §5.5 vira uma **view** `showcase_vehicles`:
```sql
vehicles v join stores s on s.id = v.store_id
where v.status = 'published' and v.share_on_cajugo
  and s.status in ('active','past_due','cancel_scheduled')
```
O catálogo da loja usa a mesma base sem a condição de `share_on_cajugo`. Com aprovação prévia ligada, o veículo só chega a `published` depois de aprovado. Filtros, ordenação e busca (`search @@ websearch_to_tsquery(...)`) são SQL comum.

## 5. Cache das páginas públicas
ISR com `revalidateTag('vehicles')` e `revalidateTag('store:<slug>')`, chamados nas actions que alteram veículo, loja ou assinatura. Cumpre o "≤ 60 s" do PRD §5.5.

## 6. Jobs (Vercel Cron, diário)
- **Ciclo de cobrança** (`runBillingCycle`, 011), em datas de São Paulo:
  - **fatura mensal:** 3 dias antes de `next_due_at`, abre a fatura de cada loja `active`, `past_due` ou `suspended` (mensalidade vigente + taxas CajuGo das vendas ainda não faturadas − créditos de `billing_credits`), liga as vendas (`sales.invoice_id`), avança `next_due_at` e avisa o lojista ("vence em dd/mm"); uma por período (`invoices_store_period`);
  - **atraso:** fatura aberta vencida → loja `active` → `past_due` (`past_due_since`);
  - **suspensão:** `past_due_since` + `past_due_tolerance_days` → `suspended`, avisa o lojista e os admins e invalida o cache público.
  
  A lista "Vencem em 3 dias" do admin [4b] é consulta, não job. A reativação acontece na confirmação do pagamento.
- **Cancelamento e retenção:** `cancel_scheduled` → `canceled` no fim do período; `canceled` há mais de `retention_days` → `archived` (e expira o crédito Caju Indica).
- **Slugs** reservados sem 1º pagamento confirmado há 7 dias são liberados.
- **Limpeza** de `rate_limits` antigos (`purgeRateLimits`).
- **Leads com mais de 2 anos** perdem nome, e-mail, telefone e mensagem (`purgeOldLeads`, 007); continuam nos números da loja.
- **Alertas de busca:** marca como vencido o alerta pendente além da validade das regras e apaga nome e celular (006d). O veículo compatível **não** é job: é calculado quando o admin abre "Alertas", em cache de 60 s, para aparecer em até 1 minuto (o cron do plano Hobby é 1×/dia).

Recompensas do Caju Indica **não** são job: são creditadas na hora em que o admin confirma o pagamento da loja indicada.

Todo job é idempotente e protegido por `CRON_SECRET`.

- **Horário inexato no Hobby:** o job agendado para 06:00 UTC (`vercel.json`) pode rodar a qualquer momento entre 06:00 e 06:59 (03:00–03:59 em Brasília). Para vencer alertas e limpar rate limits isso não importa; um job novo que dependa de hora exata precisa levar isso em conta.
- **Cron Jobs → Schedules:** a Vercel avisa que o Cron Jobs é legado e será migrado para o recurso Schedules. Quando a migração acontecer, conferir se o `vercel.json` (`crons`) precisa mudar.
- **Custo:** incluído em todos os planos; cada execução conta como chamada de função, já coberta pela cota gratuita do Hobby.
