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

**Ainda não definido:** gateway de pagamento, e-mail transacional, fonte da FIPE. Não escolha sem perguntar.

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
              ├ Route Handlers /api/v1     ├────▶ Gateway de pagamento (+ webhook)
              └ Vercel Cron                └────▶ E-mail transacional
```

Decisões:
- **O navegador nunca fala com o banco nem com o Supabase.** Login, logout e recuperação de senha são Server Actions; a sessão vive em cookies httpOnly definidos pelo servidor.
- **Camada de serviço por domínio** (`vehicles`, `stores`, `leads`, `subscriptions`, `admin`…). Páginas, actions e rotas chamam o serviço, nunca o Drizzle direto.
- **Telas usam Server Components e Server Actions.** Os Route Handlers em `/api/v1/*` ficam para webhooks, cron, polling do Pix e, no futuro, o app Expo.

### Conexão com o banco
- Em runtime (serverless): **pooler em modo transação** do Supabase (porta 6543), com prepared statements desligados no driver.
- Migrations: conexão direta (ou pooler em modo sessão).
- **Migrations só pelo Drizzle Kit, versionadas no repositório.** Nunca crie ou altere tabela pelo painel do Supabase.

## 3. Estrutura de pastas
Organizada **por domínio**: o que muda junto fica junto. As rotas do Next ficam finas e chamam o domínio.

```
src/
├─ app/                    rotas do App Router (finas: leem a sessão, chamam o domínio, renderizam)
│  ├─ (public)/            vitrine /, catálogo /{slug}, veículo /v/..., /lojistas, /entrar
│  ├─ painel/              área do lojista
│  ├─ admin/               área da equipe CajuGo
│  └─ api/v1/              Route Handlers: webhooks, cron, status do Pix
├─ domains/                um por área do GLOSSARY.md
│  ├─ vehicles/
│  │  ├─ service.ts        regra de negócio e acesso ao banco
│  │  ├─ actions.ts        Server Actions ('use server')
│  │  ├─ schemas.ts        zod: entrada das actions
│  │  ├─ components/       UI própria do domínio
│  │  └─ *.test.ts         testes Vitest (IDs de requisito no nome)
│  └─ stores/ leads/ subscriptions/ auth/ admin/ ...
├─ ui/                     componentes base do DESIGN.md (botão, input, chip, selo, toggle, bottom sheet...)
└─ platform/               infraestrutura comum
   ├─ db/                  cliente e schema do Drizzle
   ├─ supabase/            cliente de Auth no servidor
   ├─ cloudinary/          assinatura de upload, URLs de variantes
   └─ http/                erros (problem+json), requireSession, rate limit, activity log, logger
drizzle/                   migrations SQL geradas pelo Drizzle Kit
tests/e2e/                 Playwright
```

Regras:
- `app/` não acessa o banco: chama `domains/*`.
- Um domínio usa outro só pelo `service.ts` dele, nunca pelos arquivos internos.
- `ui/` não conhece domínio nem banco.
- `platform/` não conhece domínio.

## 4. Modelo de dados (Postgres)

Tabelas e colunas em inglês, `snake_case` no banco (camelCase no TypeScript). IDs `uuid` v7 gerados pela aplicação (`src/platform/db/uuid.ts`; o Postgres 17 não gera v7). Dinheiro em centavos (`integer`). Datas `timestamptz`. Enums do Postgres para status.

```
profiles                 # 1:1 com auth.users (mesmo id; sem FK, porque o schema auth é do Supabase e não existe no PGlite dos testes)
  id (pk = auth.users.id), name, email, phone, role (store_owner|admin|support), must_change_password (bool),
  store_id (fk stores, null para equipe CajuGo), notify_email (bool), created_at, last_login_at

stores
  id, name, slug (text, unique; só [a-z0-9-], validado na entrada), city, state, whatsapp, address, about, instagram,
  logo_public_id, cover_public_id, hours (jsonb), share_by_default (bool, default true),
  owner_id (fk profiles), created_at, updated_at

store_slug_redirects     old_slug (pk), store_id, expires_at            # 90 dias após troca

plans                    id, name, price_cents, active

subscriptions            # uma por loja
  id, store_id (unique), plan_id, status (awaiting_payment|active|past_due|suspended|cancel_scheduled|canceled),
  method (pix|card), tax_id (CPF/CNPJ p/ nota), gateway_customer_id, gateway_subscription_id,
  billing_day, next_charge_at, past_due_since, started_at, cancel_at, ends_at, slug_reserved_until

invoices
  id, subscription_id, period (AAAA-MM), amount_cents, status (pending|paid|failed|refunded),
  paid_at, receipt_url, pix_txid, pix_copy_paste, pix_expires_at

vehicles
  id, store_id, type (car), status (draft|published|sold|deleted),
  plate (privada), plate_end, make, model, version, fipe_code,
  year_manufacture, year_model, mileage_km, transmission, fuel, body, color, doors, engine,
  price_cents, fipe_price_cents, show_installment,
  accepts_trade, single_owner, ipva_paid, licensed, dealer_serviced, factory_warranty, armored,
  features (text[]), description, contact_whatsapp,
  share_on_cajugo (bool), hidden_by_admin (bool), hidden_reason, approval_status (pending|approved|rejected|null),
  search (tsvector gerado de make/model/version, com unaccent),
  published_at, sold_at, created_at, updated_at

vehicle_photos           id, vehicle_id, public_id, position, width, height     # position 0 = capa
vehicle_history          id, vehicle_id, field, old_value, new_value, user_id, created_at
vehicle_daily_stats      vehicle_id + day (pk), views, whatsapp_clicks, leads

leads
  id, store_id, vehicle_id, name, email, phone, message,
  channel (form|whatsapp), origin (cajugo|store_catalog),
  status (new|contacting|negotiating|sold|lost), created_at, updated_at

reports                  id, vehicle_id, reason, description, ip_hash, status (open|resolved|dismissed), created_at
activity_log             id, user_id, action, entity, entity_id, data (jsonb), created_at     # só INSERT (garantido no código no MVP)
showcase_config          (1 linha) name, domain, support_whatsapp, require_approval,
                         installment_rate, installment_months, down_payment_pct, past_due_tolerance_days
rate_limits              key + window_start (pk), count
webhook_events           id (pk = id do evento no gateway), type, received_at, processed_at
```

Índices iniciais: `vehicles(status, share_on_cajugo, hidden_by_admin)`, `vehicles(store_id, status)`, `vehicles(make, model)`, `vehicles(price_cents)`, GIN em `vehicles(search)`, `leads(store_id, status, created_at)`.

### Vitrine = consulta, não cópia
A regra do PRD §5.5 vira uma **view** `showcase_vehicles`:
```sql
vehicles v join stores s on s.id = v.store_id join subscriptions sub on sub.store_id = s.id
where v.status = 'published' and v.share_on_cajugo and not v.hidden_by_admin
  and sub.status in ('active','past_due','cancel_scheduled')
  and (not (select require_approval from showcase_config) or v.approval_status = 'approved')
```
O catálogo da loja usa a mesma base sem as condições de `share_on_cajugo`/aprovação. Filtros, ordenação e busca (`search @@ websearch_to_tsquery(...)`) são SQL comum.

## 5. Cache das páginas públicas
ISR com `revalidateTag('vehicles')` e `revalidateTag('store:<slug>')`, chamados nas actions que alteram veículo, loja ou assinatura. Cumpre o "≤ 60 s" do PRD §5.5.

## 6. Jobs (Vercel Cron, diário)
- Liberar slugs reservados sem pagamento há 7 dias.
- Passar assinaturas `past_due` para `suspended` após a tolerância.
- Efetivar `cancel_scheduled` → `canceled` no fim do período.
- Apagar linhas antigas de `rate_limits`.

Todo job é idempotente e protegido por `CRON_SECRET`.
