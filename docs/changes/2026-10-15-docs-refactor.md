# 2026-10-15 · Reorganização dos documentos (sem commit ainda)
- Stack trocado em todos os docs: Next.js full-stack na Vercel + Firebase (Auth, Firestore) + Cloudinary; saíram NestJS, Supabase, VPS, OpenAPI/Spectral/tiers.
- Marca CajuCar → CajuGo (PRD, DESIGN, protótipo HTML); `ssd.md` → `SDD.md`; PRD e protótipo movidos (`docs/PRD.md`, `docs/design/`).
- Reescritos: CLAUDE.md, API.md, SECURITY.md, DEPLOYMENT.md, design/README.md. Criados: ARCHITECTURE.md (modelo Firestore), OBSERVABILITY.md, PLAN.md.
- PRD: modelo de dados e API movidos para ARCHITECTURE/API; notificações só por e-mail no MVP.

# 2026-10-15 · Troca Firebase → Supabase
- Banco: Firestore → Postgres no Supabase com Drizzle (só servidor); login: Firebase Auth → Supabase Auth.
- ARCHITECTURE (modelo em tabelas + view `showcase_vehicles`), SECURITY, DEPLOYMENT, API, PLAN, SDD, CLAUDE e PRD atualizados. Render removido.

# 2026-10-22 · Backup adiado
- Removido o backup semanal do DEPLOYMENT/PLAN; ficou como item da Fase 2 (quando houver lojistas pagando).

# 2026-10-22 · Recuperação de senha manual
- 6b vira contato pelo WhatsApp do suporte; admin define senha temporária em 6g; troca obrigatória no login (`must_change_password`).
- Sem e-mails do Supabase Auth no MVP (sem SMTP, sem confirmação, sem convites). Reset por e-mail foi para a Fase 2.

# 2026-10-22 · Plugin mattpocock-skills
- Instalado o plugin mattpocock-skills (v1.3.1, escopo usuário) após revisão; registrado no CLAUDE.md com as skills que não devem ser usadas.

# 2026-10-22 · F02a
- CLAUDE.md na raiz com caminhos `docs/...`; criado `.claude/settings.json` (deny de git commit/push/merge/rebase/tag, gh pr create/merge, gh secret set, leitura de .env).

# 2026-10-22 · F02b
- `git init` (branch main) e `.gitignore` (node_modules, .next, .env* exceto .env.example, .vercel, settings.local.json).

# 2026-10-22 · Setup mattpocock-skills
- Criados GLOSSARY.md, docs/adr/ (0001–0004 com as decisões de stack e senha manual), docs/agents/ (issue tracker GitHub, rótulos padrão, domain) e a seção "Agent skills" no CLAUDE.md.

# 2026-10-22 · Capturas de terceiros
- Removidas as 5 capturas da Webmotors de docs/design/uploads/ (repositório será público).

# 2026-10-22 · Repositório no GitHub
- Criado o repositório público chutzpah-os/cajugo (remote origin) e os 5 rótulos de triagem.

# 2026-10-22 · F01
- Ferramentas escolhidas: pnpm, ESLint + Prettier, Vitest + Playwright, zod, Tailwind (PLAN, CLAUDE.md, ARCHITECTURE).

# 2026-10-22 · Sem GitHub Actions
- CI removido: verificações locais (`pnpm check`) antes do commit, migrations manuais, build/deploy pela Vercel (DEPLOYMENT, PLAN F11, SDD).

# 2026-10-22 · F03
- Estrutura de pastas por domínio (src/app, src/domains, src/ui, src/platform) em ARCHITECTURE §3 e CLAUDE.md.

# 2026-10-22 · F04
- App Next.js 16.4 (TypeScript, App Router, src/, Tailwind 4, ESLint+Prettier, Vitest), `output: standalone`, layout pt-BR e página provisória; comandos no CLAUDE.md (`pnpm check`).

# 2026-10-22 · Commit liberado para o Claude
- Removido o deny de git commit/push; Claude commita e sobe só quando pedido. Merge, rebase, tag, PR e gh secret continuam bloqueados (settings, CLAUDE.md, SDD, SECURITY).

# 2026-10-22 · F06 (parcial)
- Drizzle 0.45 + postgres.js; schema profiles/stores (RLS ligado); migration drizzle/0000_init.sql; docker-compose (Postgres 17); .env.example; uuidv7 com teste; scripts db:*. esbuild liberado no pnpm-workspace.

# 2026-10-22 · Rotina de testes
- Criado docs/TESTING.md (princípios, Husky, tipos de teste, AAA, bugs, prioridades, checklist). Husky 9 roda `pnpm check` no pre-commit; --no-verify bloqueado. F11 concluída.

# 2026-10-22 · Docker → PGlite
- Testes de integração com PGlite (createTestDb + schema.test.ts); removidos docker-compose.yml e db:up/db:down; dev local usa o Supabase de staging. Docs atualizados (TESTING, ARCHITECTURE, DEPLOYMENT, PLAN, CLAUDE). F06 concluída.

# 2026-10-22 · F09 (parcial)
- Tokens do DESIGN.md no Tailwind, fontes via next/font, componentes base em src/ui com testes (renderToStaticMarkup) e vitrine /dev/ui.

# 2026-10-22 · Segredos locais
- Criado .env.local (ignorado, 600) com a senha do banco do staging; DEPLOYMENT documenta onde ficam os segredos, sem os valores.

# 2026-10-22 · F05 (staging)
- Projeto Supabase cajugo-staging criado e configurado; DATABASE_URL e DATABASE_URL_MIGRATIONS (pooler) testadas.

# 2026-10-22 · Migration no staging
- `pnpm db:migrate` aplicou 0000_init no cajugo-staging; conferido: profiles e stores com RLS e sem policies.

# 2026-10-22 · Usuário do banco no MVP
- SECURITY §4, DEPLOYMENT e PLAN: app e migrations usam o usuário postgres no MVP; app_user foi para a fase 2. F05 (staging) concluída.

# 2026-10-22 · F13
- Criadas as skills /spec, /clarify, /plan, /tasks, /implement, /verify em .claude/skills; SDD §12.1 aponta para elas em vez de repetir o texto.

# 2026-10-22 · SDD + skills do Matt Pocock
- SDD §7 passa a fatias verticais (tdd); §12.2 mapeia skills do plugin por etapa; skills /clarify,/plan,/tasks,/implement,/verify, CLAUDE.md e TESTING atualizados.

# 2026-10-23 · F10
- src/platform/http: errors, session (authorize), rate-limit, client-ip/hash, honeypot, activity-log, logger, com 22 testes; migration 0001 (rate_limits, activity_log); zod 4; HASH_SECRET no .env.example.

# 2026-10-23 · Contas dos serviços
- DEPLOYMENT: tabela de contas (GitHub, Supabase, Cloudinary de victorhanielbusiness@gmail.com, cloud zr1zxzni); F07 em andamento.
- Migration 0001 aplicada no cajugo-staging (4 tabelas com RLS).

# 2026-10-23 · Leitura do .env liberada
- Dono removeu o deny de leitura de .env*; SECURITY §10 e CLAUDE.md passam a exigir uso mínimo (sem exibir valores).

# 2026-10-23 · F07 concluída
- Cloudinary testado (conexão ok, sem preset sem assinatura). Troca das credenciais expostas no chat adiada para a spec 009 (lançamento).
- vercel.json com região gru1 (São Paulo, perto do banco).

# 2026-10-23 · F08
- Projeto cajugo na Vercel (Hobby) com deploy da main; ENABLE_EXPERIMENTAL_COREPACK=1; contas e variável documentadas no DEPLOYMENT.
- Produção em https://cajugo.vercel.app (200, gru1; /dev/ui 404); Deployment Protection ligada nas prévias.

# 2026-10-23 · Endereços das lojas
- PRD §1.4, ARCHITECTURE §3a, DEPLOYMENT, GLOSSARY, DESIGN e ADR 0005: MVP em cajugo.vercel.app/{slug}; fase 2 em {slug}.cajugo.com.br via proxy.ts; middleware → proxy.ts (Next 16).

# 2026-10-23 · Pagamento manual no MVP
- PRD §5.6 e telas 5d/3c/4b/4c/6c/6g, PLAN (spec 007 = pagamento manual; gateway na fase 2), API, SECURITY §7, ARCHITECTURE, DEPLOYMENT e ADR 0006.

# 2026-10-23 · PRD v2 incorporado (docs/exports)
- PRD.md v2.0: produtos (Catálogo, Rede Caju, Caju Indica), papéis múltiplos, escopo, jornadas, regras (Pix com comprovante, Rede Caju, Caju Indica, simulador, favoritos, aprovação, denúncias, Config), 47 telas novas em §7, notificações manuais.
- DESIGN.md v2.0 (telas 7a–15c, padrões, microcopy), design/README, GLOSSARY, ARCHITECTURE (modelo v2, jobs), API (ações v2, uploads privados), SECURITY (ameaças, PDF privado, papéis), PLAN (specs 001–013), DEPLOYMENT, ADRs 0006–0008.
- Imagens movidas para design/telas/ (pastas "Turno 07…15"); pastas antigas renomeadas "Turno 01…06". docs/exports apagada.

# 2026-10-23 · Spec 001 clarified
- docs/specs/001-auth/spec.md: 15 FR, 2 NFR, 9 SEC; respostas do /clarify incorporadas; PRD [6a] e §2 alinhados.

# 2026-10-23 · Spec 001: plano, tasks e T001
- plan.md (aprovado) e tasks.md (T001–T021); T001: @supabase/ssr, @supabase/supabase-js, @playwright/test, AuthProvider + FakeAuthProvider; variáveis SUPABASE_PUBLISHABLE_KEY/SECRET_KEY e SUPPORT_WHATSAPP.

# 2026-10-23 · SEO como principal ativo
- Novo docs/SEO.md (regras técnicas, domínio, medição, testes, checklist); ligado em CLAUDE.md, PRD (§1.1b, escopo, NFR, pendência 7), PLAN (006, 013), ARCHITECTURE, TESTING, DEPLOYMENT.
- 001/T002: migration 0002 (papéis múltiplos, last_panel, last_seen_at, temp_password_expires_at, store_status) com cópia role→roles e teste de migration.
- Lojas em /loja/{slug} (ADR 0009 substitui 0005): PRD §1.7 sem fases nem lista de reservados, pendência 7 reduzida ao domínio; SEO, API, ARCHITECTURE §3a, DEPLOYMENT, PLAN, GLOSSARY, DESIGN.

# 2026-10-23 · 001/T003 sessão com vários papéis
- Session com roles + activeRole; authorize aceita qualquer papel da conta; authorizeStore aceita lojista e usuário da loja (restringível).
- src/domains/auth/permissions.ts: AREAS (painel, rede, indica, admin) e PERMISSIONS (loja: staff só veículos/leads/venda; admin: suporte só lê e modera).

# 2026-10-23 · 001/T004–T007 login
- domains/auth: landingFor/pickPanel (painel inicial por papel, último painel, status da loja, nova senha), signIn (erro genérico, temporária vencida, last_login/seen), schemas.
- platform/http: safeNext (só caminho interno); peekRateLimit e limite loginFailuresPerEmail (5 falhas/15 min) + 5/min por rede.
