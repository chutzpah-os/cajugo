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
│  └─ auth/ stores/ billing/ (faturas, Pix) leads/ moderation/ sellers/ (Rede Caju) referrals/ (Caju Indica) buyers/ (favoritos, alertas) settings/
├─ ui/                     componentes base do DESIGN.md (botão, input, chip, selo, toggle, bottom sheet...)
└─ platform/               infraestrutura comum
   ├─ db/                  cliente e schema do Drizzle
   ├─ supabase/            cliente de Auth no servidor
   ├─ cloudinary/          assinatura de upload, URLs de variantes
   ├─ seo/                 título, descrição, canônica, JSON-LD, Open Graph, sitemap (docs/SEO.md)
   └─ http/                errors (AppError, problem+json, ActionResult), session (authorize), rate-limit,
                           client-ip (hash), honeypot, activity-log, logger
drizzle/                   migrations SQL geradas pelo Drizzle Kit
tests/e2e/                 Playwright
```

Regras:
- `app/` não acessa o banco: chama `domains/*`.
- Um domínio usa outro só pelo `service.ts` dele, nunca pelos arquivos internos.
- `ui/` não conhece domínio nem banco.
- `platform/` não conhece domínio.

## 4. Modelo de dados (Postgres)

Tabelas e colunas em inglês, `snake_case` no banco (camelCase no TypeScript). IDs `uuid` v7 gerados pela aplicação (`src/platform/db/uuid.ts`; o Postgres 17 não gera v7). Dinheiro em centavos (`integer`). Datas `timestamptz`. Enums do Postgres para status. Cada tabela entra na migration da spec que a usa; as já criadas estão marcadas com ✅.

```
# Contas e papéis
profiles ✅              # 1:1 com auth.users (mesmo id; sem FK, porque o schema auth é do Supabase)
  id, name, email, phone, roles (user_role[]: store_owner|store_staff|seller|referrer|admin|support),
  store_id (loja do dono/equipe), cpf (só para vendedor/resgate), pix_key, pix_key_type,
  notify_email, must_change_password, created_at, last_login_at
  # hoje a coluna é `role` (um papel); vira `roles` na spec 001 (migration aditiva + cópia)

# Loja e assinatura (a assinatura vive na própria loja)
stores ✅ (+ colunas novas)
  id, name, slug (unique, `[a-z0-9-]`), cnpj, city, state, whatsapp, address, about, instagram,
  logo_public_id, cover_public_id, hours (jsonb), share_by_default, owner_id,
  status (registered|payment_review|active|past_due|suspended|cancel_scheduled|canceled|archived),
  billing_day, next_due_at, past_due_since, cancel_at, active_until, slug_reserved_until,
  accepts_sellers (bool), commission_type (pct|fixed), commission_value,
  referral_code_used, created_at, updated_at
store_slug_redirects     old_slug (pk), store_id, expires_at

invoices                 id, store_id, period (AAAA-MM), membership_cents, fees_cents, credit_cents, total_cents,
                         due_at, status (open|paid|overdue|canceled), paid_at
payments                 id, invoice_id, store_id, amount_cents, receipt_public_id (Cloudinary privado),
                         status (submitted|confirmed|rejected), reject_reason, manual (bool: registro sem comprovante),
                         submitted_at, reviewed_by, reviewed_at

# Veículos
vehicles
  id, store_id, type (car), status (draft|pending_approval|published|hidden|sold|deleted),
  plate (privada), plate_end, chassis (privado), make, model, version, fipe_code,
  year_manufacture, year_model, mileage_km, transmission, fuel, body, color, doors, engine,
  price_cents, fipe_price_cents, show_installment,
  accepts_trade, single_owner, ipva_paid, licensed, dealer_serviced, factory_warranty, armored,
  features (text[]), description, contact_whatsapp, share_on_cajugo, hidden_reason,
  commission_override_type, commission_override_value,
  search (tsvector de make/model/version com unaccent),
  published_at, sold_at, created_at, updated_at
vehicle_photos           id, vehicle_id, public_id, position, width, height     # position 0 = capa
vehicle_history          id, vehicle_id, field, old_value, new_value, user_id, created_at
vehicle_daily_stats      vehicle_id + day (pk), views, whatsapp_clicks, leads, seller_link_clicks
approvals                id, vehicle_id, checks (jsonb), status (pending|approved|changes_requested), reason,
                         reviewed_by, reviewed_at

# Contato e moderação
leads                    id, store_id, vehicle_id, seller_id, name, email, phone, message,
                         channel (form|whatsapp), origin (cajugo|store_catalog|seller),
                         status (new|contacting|negotiating|sold|lost), created_at, updated_at
reports                  id, target_type (vehicle|seller), target_id, reporter_id, reason, details, ip_hash,
                         status (open|kept|hidden|blocked), decided_by, decided_at, created_at

# Rede Caju
sellers                  profile_id (pk), code (unique, usado no ?ref=), city,
                         status (in_review|active|blocked), documents (jsonb: public_ids privados),
                         approved_by, approved_at, rating_avg
partnerships             id, seller_id, store_id, origin (request|invite),
                         status (pending|active|declined|ended), created_at, ended_at
seller_vehicle_clicks    seller_id + vehicle_id + day (pk), clicks
sales                    id, vehicle_id, store_id, final_price_cents, seller_id,
                         attribution (link|other_partner|store), commission_cents,
                         commission_status (in_review|to_receive|paid), cajugo_fee_cents, invoice_id, confirmed_at
seller_reviews           id, seller_id, store_id, rating (1–5), text, created_at

# Caju Indica
referral_codes           code (pk), profile_id (dono) ou campaign_name (link de campanha, sem recompensa), active
referrals                id, code, referrer_id, referred_store_id, status (invited|registered|active|paused|ended),
                         months_paid (0–3), created_at
rewards                  id, referral_id, beneficiary_id, period, amount_cents,
                         status (expected|credited|applied|redeemed)
payouts                  id, profile_id, amount_cents, pix_key, cpf, status (requested|paid), paid_by, paid_at

# Comprador
favorites                profile_id + vehicle_id (pk), price_at_save_cents, created_at   # sem conta: no aparelho
search_alerts            id, contact, filters (jsonb), active, notified_at, created_at

# Plataforma
settings                 (1 linha) showcase_name, domain, support_whatsapp, plan_price_cents,
                         pix_key, pix_beneficiary, review_business_days (1), past_due_tolerance_days (5),
                         cajugo_fee_pct (1), referral_pct (30), referral_months (3), payout_min_cents (5000),
                         installment_rate_pct (1.79), require_approval (false), min_photos (6), retention_days (90)
activity_log ✅           id, user_id, action, entity, entity_id, data (jsonb), created_at     # só INSERT
rate_limits ✅            key + window_start (pk), count
webhook_events           id (pk = id do evento no gateway), type, received_at, processed_at   # fase 2
```

Índices iniciais: `vehicles(status, share_on_cajugo)`, `vehicles(store_id, status)`, `vehicles(make, model)`, `vehicles(price_cents)`, GIN em `vehicles(search)`, `leads(store_id, status, created_at)`, `payments(status, submitted_at)`, `partnerships(store_id, status)`, `sales(seller_id, commission_status)`, `referrals(referrer_id, status)`.

### Regras que o modelo garante
- **Nenhuma regra numérica no código:** valores de `settings` (PRD §5.14), lidos com cache curto.
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
- **Vencimentos em 3 dias:** monta a lista para o admin avisar por `wa.me` e mostra o alerta no painel do lojista.
- **Fatura mensal:** gera a fatura de cada loja ativa (mensalidade + taxas CajuGo das vendas via vendedor do período − crédito Caju Indica disponível).
- **Atraso e suspensão:** `active` com vencimento passado e sem pagamento confirmado → `past_due`; após `past_due_tolerance_days` → `suspended`.
- **Cancelamento e retenção:** `cancel_scheduled` → `canceled` no fim do período; `canceled` há mais de `retention_days` → `archived` (e expira o crédito Caju Indica).
- **Slugs** reservados sem 1º pagamento confirmado há 7 dias são liberados.
- **Limpeza** de `rate_limits` antigos (`purgeRateLimits`).
- **Alertas de busca:** marca alertas com veículo compatível novo para o admin avisar.

Recompensas do Caju Indica **não** são job: são creditadas na hora em que o admin confirma o pagamento da loja indicada.

Todo job é idempotente e protegido por `CRON_SECRET`.
