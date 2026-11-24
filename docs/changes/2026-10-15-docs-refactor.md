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

# 2026-10-23 · 001/T008–T012
- domains/auth/service: getSession (inatividade 30 d / equipe 1 d, last_seen 1×/h, temporária vencida), signOut, switchPanel, setTemporaryPassword (auditoria sem senha), updatePassword (encerra outros aparelhos).
- domains/auth/roles: grantRole, único caminho para dar papel (cadastro público sem equipe; equipe e clientes não se misturam).

# 2026-10-23 · AUT-FR-016 loja indisponível
- Spec/plan/tasks 001: usuário da loja com loja sem 1º pagamento, em análise, cancelada ou arquivada → /painel/loja-indisponivel; landingFor ajustado com testes.

# 2026-10-23 · 001/T013 Supabase real e proxy
- platform/supabase/server.ts (SupabaseAuthProvider, cookies HttpOnly 30 d) e next.ts (provedor da requisição); src/proxy.ts renova a sessão e manda área logada sem sessão para /entrar?next=.
- platform/http/protected-paths.ts; SEO.md: páginas que ranqueiam são /rede/cadastro, /indica/cadastro, /i/{codigo} (/rede e /indica são painéis).

# 2026-10-23 · 001/T014 tela /entrar
- app/entrar (9f só e-mail e senha, noindex, rodapé de cadastros), domains/auth/actions.ts (signInAction) e components/sign-in-form.tsx; testado no navegador contra o staging (erro genérico e next).

# 2026-10-23 · 001/T018 admin:create
- domains/auth/create-admin.ts (admin com senha temporária 24 h, auditoria sem senha) + scripts/create-admin.ts e `pnpm admin:create`; tsx (dev). Primeiro admin criado no staging.
- withSessionMaxAge: cookie de sessão com 30 dias (o @supabase/ssr forçava 400).

# 2026-10-23 · 001/T015 recuperar e nova senha
- app/recuperar (wa.me do suporte com mensagem pronta) e app/nova-senha (updatePasswordAction, NewPasswordForm); domains/auth/current.ts (currentSession com connection()); platform/whatsapp/link.ts; senha igual à atual vira erro de campo.

# 2026-10-23 · 001/T016 áreas logadas
- Layouts de /painel, /rede, /indica, /admin, /lojistas/pagamento (AreaShell: sair, troca de painel, alerta de suspensa); guards.ts (requireArea, requireStorePage), store-access.ts; NoPermission, loja indisponível e páginas em construção.
- /entrar estático: o next é lido da URL no envio (corrige perda do next).

# 2026-10-23 · 001/T017 senha temporária no admin
- /admin/senha-temporaria: busca por e-mail (findAccountByEmail, saída explícita; admin e suporte) e botão só para admin, senha mostrada uma vez com Copiar; labels.ts com os nomes dos painéis.

# 2026-10-23 · Banco conecta no primeiro uso
- platform/db/client.ts: getDb() no lugar de db; o build da Vercel falhava em /nova-senha sem DATABASE_URL.

# 2026-10-23 · Menu do admin
- ui/panel-nav.tsx (barra inferior no celular, lateral ≥ 1024 px) + domains/auth/navigation.ts com os itens do PRD §6; páginas em construção de Lojas, Assinaturas, Pagamentos Pix, Veículos, Rede Caju, Caju Indica e Conta. DEPLOYMENT: produção usa cajugo-staging até a 013.

# 2026-10-23 · 001/T020 remove profiles.role
- Migration 0003_drop_profiles_role (aplicada no staging) e teste de que só `roles` sobra.

# 2026-10-23 · Supabase de produção
- cajugo-prod criado (ref bomhlbnniwdxavtsipkx), migrations aplicadas, Vercel Production apontando para ele; admin do prod criado. Comandos db:migrate:prod e admin:create:prod (lêem só .env.prod); drizzle.config não completa com .env.local quando o banco vem de fora.

# 2026-10-23 · 001/T019 e2e
- tests/e2e (10 cenários a 390 px), playwright.config.ts, `pnpm e2e:seed` (contas e loja de teste só no staging, recusa produção, zera bloqueio das contas de teste) e `pnpm test:e2e`; E2E_PASSWORD no .env.example.
- currentStoreStatus: status da loja consultado uma vez por requisição. PLAN 013: medir cold start e rotacionar credenciais.

# 2026-10-23 · 001/T021 verify e correções da revisão
- Bloqueio de login em janela deslizante só com falhas (rede e e-mail); senha temporária encerra todas as sessões (adminSignOutAll) e grava perfil+auditoria em transação; /nova-senha só com senha temporária; rememberPanel (AUT-FR-006); CHECK no banco separando equipe e clientes (migration 0004, aplicada em staging e prod).
- IDs de requisito nos testes de feature, schemas fora do serviço, loadProfile e logUnexpected; e2e de acessibilidade (AUT-NFR-002). Spec 001 implemented.

# 2026-10-23 · Spec 002 clarified
- docs/specs/002-settings/spec.md: regras configuráveis e troca de senha (10 FR, 2 NFR, 6 SEC); PRD §5.14, [4c] e §12.1 #1 ajustados com as respostas do /clarify.

# 2026-10-23 · Menu do admin no celular
- ui/panel-nav.tsx: 5º item "Mais" abre a gaveta (<dialog>) com os itens que não cabem na barra; e2e admin-nav.spec.ts; PRD §6 navegação do admin atualizada.

# 2026-10-23 · Plano 002 aprovado
- docs/specs/002-settings/plan.md (approved); ADR 0010 (setting_values só de inserção); ARCHITECTURE §4, GLOSSARY (Vigência) e SECURITY §8 (chave Pix da CajuGo) atualizados.

# 2026-10-23 · 002/T001 tabela de regras
- tasks.md da 002 (T001–T021); migration 0005: setting_values + índice + gatilho só de inserção + 14 valores provisórios; testes de migration (CFG-FR-003, CFG-SEC-003).

# 2026-10-24 · 002/T002 lista das regras
- domains/settings/definitions.ts (14 regras, limites, chave Pix por tipo com dígito verificador) e format.ts (% e R$, máscara da chave); helper settingValueJson/parseSettingValue para ler jsonb.

# 2026-10-24 · 002/T003 conferir senha
- AuthProvider.verifyPassword (falso e Supabase); testado no staging: certa true, errada false, nenhuma sessão sobra.

# 2026-10-24 · 002/T004 ler regras
- settings/service.ts: getSettings(db, at) com distinct on (key) até a data; testes de valores provisórios e vigência por data.

# 2026-10-30 · 002/T005 regras públicas e cache
- settings: publicSettings (sem chave Pix) e currentSettings ('use cache', cacheTag settings, cacheLife 1 min); vitest com testTimeout/hookTimeout de 20 s.

# 2026-11-07 · Testes mais rápidos
- createTestDb: migrations aplicadas uma vez por arquivo de teste (dumpDataDir) e cada teste recebe um clone (loadDataDir); ~3,8 s → ~0,7 s por banco.

# 2026-11-07 · 002/T006 salvar regras
- settings/service.ts: updateSettings (só admin; valida; grava só o que mudou numa transação; auditoria só com as chaves; regra desconhecida recusada).

# 2026-11-07 · 002/T007 confirmar a própria senha
- auth/service.ts: passwordGuard (bloqueio único do login e das confirmações) e verifyOwnPassword; tasks T006/T007 marcadas.

# 2026-11-07 · 002/T008–T009 chave Pix e histórico
- updateSettings aceita a chave Pix com password (verifyOwnPassword, bloqueio do login; só troca, não apaga); settingHistory (de/para, quem, quando; admin e suporte; valor inicial não conta).

# 2026-11-07 · 002/T010 trocar a própria senha
- auth: changePasswordSchema e changePassword (senha atual conferida com o bloqueio do login, nova ≥ 8 e diferente, encerra outros aparelhos, auditoria sem senha).

# 2026-11-07 · 002/T011 seed volta as regras
- seedE2E reinsere os valores provisórios das regras que os testes mudaram (sem apagar histórico).

# 2026-11-07 · 002/T012 campos de tela
- src/ui: TextField com sufixo; PercentField e MoneyField (teclado numérico); ReadOnlyNotice.

# 2026-11-08 · 002/T013 tela [4c]
- /admin/conta real: grupos com Salvar (saveSettingsAction + updateTag), suporte só leitura, chave Pix mascarada, link Alterar senha; settings/form.ts (conversão do formulário); conta e2e-admin no seed; migration 0005 aplicada no staging.

# 2026-11-08 · 002/T014 fluxo da chave Pix
- [4c] PixKeyEditor (nova chave → revisão lado a lado + senha) e savePixAction; testado no navegador: CPF inválido volta ao passo 1, senha errada fica no passo 2, troca certa mostra a chave mascarada.

# 2026-11-08 · 002/T015 histórico na tela
- /admin/conta/historico/[key] (de/para por extenso, quem, quando em horário de Brasília; chave Pix mascarada) e links "Histórico" em cada regra e na chave Pix; displaySettingValue.

# 2026-11-08 · 002/T016 tela [8f]
- /admin/indica/regras com as regras do Caju Indica (mesmo formulário por grupo) e link "Regras do programa" em /admin/indica; testado no navegador (resgate mínimo e quem pode indicar).

# 2026-11-08 · 002/T017 /conta/senha
- Tela de troca da própria senha para qualquer papel (ChangePasswordForm + changePasswordAction); /conta protegida no proxy; testado no navegador (atual errada, troca certa, login com a nova).

# 2026-11-08 · 002/T018 WhatsApp pelas regras
- /recuperar lê o WhatsApp de atendimento das regras (botão por requisição com connection(), cache de 1 min); SUPPORT_WHATSAPP removida do código, do .env.example e do DEPLOYMENT.

# 2026-11-08 · 002/T019 e2e das regras
- tests/e2e/settings.spec.ts (10 cenários: salvar e histórico, faixa, suporte, lojista, chave Pix com senha, WhatsApp no recuperar, troca de senha, acessibilidade de 3 telas); audit() movida para fixtures.
- Corrigido: tipo da chave Pix voltava a CPF depois de um envio com erro (rascunho agora em campos ocultos).

# 2026-11-08 · 002/T020 migration no prod
- 0005 aplicada no cajugo-prod; staging e prod conferidos: 14 regras com os valores provisórios e gatilho só de inserção.

# 2026-11-08 · 002/T021 verify e correções da revisão
- Domínios só se usam pelo service.ts (auth reexporta authorizeTo e currentSession; reset das regras virou restoreInitialSettings); schemas de senha .strict(); cache de no máximo 1 min (expire 60); regra vale o provisório em datas antigas; histórico mostra "Sistema"; mesma chave Pix não diz "atualizada"; 429 do Supabase vira "muitas tentativas"; WhatsApp no card Vitrine CajuGo; chave atual inteira na revisão (só admin).
- Spec 002 implemented.

# 2026-11-08 · Spec 003 planejada
- docs/specs/003-store-signup (spec clarified, plano aprovado, 24 tasks); ARCHITECTURE §4 (endereço em campos, slug_changed_at, referral_codes na 003), SECURITY §8 (e-mail/celular da checagem de autoindicação), GLOSSARY (Código de indicação).

# 2026-11-08 · 003/T001 migrations do cadastro
- 0006: referral_status, referral_codes, referrals (índice referrer/status, 1 por loja), store_slug_redirects e remoção de stores.address (vazia, D2); 0007: endereço em campos, slug_changed_at, slug_reserved_until; testes de migration.

# 2026-11-08 · 003/T002 cidades do IBGE
- scripts/generate-cities.ts gera src/platform/geo/cities.json (5.571 cidades); searchCities (começo do nome, sem acento) e findCity (nome oficial + UF).

# 2026-11-08 · 003/T003 Cloudinary
- src/platform/cloudinary: signParams, createCloudinary (signUpload com pasta/nome/formatos do servidor, verifyUpload pela Admin API, imageUrl f_auto,q_auto), FakeCloudinary; CLOUDINARY_FOLDER (staging/prod) no .env.example e DEPLOYMENT. Testado com upload real no staging.

# 2026-11-08 · 003/T004 SEO e URL da loja
- src/platform/seo/seo.tsx: pageMetadata (título com marca, canônica absoluta sem query, Open Graph/Twitter) e JsonLd/jsonLdText (escapa <); src/platform/http/urls.ts: appUrl e storeUrl.

# 2026-11-08 · 003/T005 apagar conta
- AuthProvider.adminDeleteUser (falso e Supabase), testado no staging; usado para desfazer o cadastro se a transação do banco falhar.

# 2026-11-08 · 003/T006 endereço do catálogo
- domains/stores/slug.ts: slugSchema (3–40, [a-z0-9] com hífen interno), suggestSlug e checkSlug (em uso inclui endereço antigo ainda redirecionando).

# 2026-11-08 · 003/T007 referrals
- domains/referrals/service.ts: getOrCreateCode (NOME10, NOME11…, idempotente), checkCode (ok/not-found/self-referral por e-mail ou celular; só o primeiro nome), registerReferral.

# 2026-11-08 · 003/T008 cadastro do lojista
- domains/stores: schemas (registerStoreSchema/addStoreSchema, telefone BR com DDI, cidade do IBGE) e registerStore (conta + perfil + papel + loja registered com endereço reservado 7 dias + código + indicação + auditoria numa transação; apaga a conta se falhar). auth reexporta grantRole.

# 2026-11-08 · 003/T009 proteções do cadastro
- registerStore: limite por rede (5/min e 30/dia) e campo isca; e-mail existente com convite neutro para entrar; conectado (cliente sem loja) cria só a loja e ganha o papel de lojista; equipe 403; quem já tem loja 409.

# 2026-11-08 · 003/T010 Minha loja (dados)
- stores: hours.ts (intervalos por dia ou Fechado, até 3, sem sobreposição), storeUpdateSchema (CEP 8 dígitos, Instagram normalizado), updateStore e storeSummary só na loja da sessão; usuário da loja 403; auditoria store.updated.

# 2026-11-08 · 003/T011 troca do endereço
- stores: changeSlug (1×/30 dias com data em dd/mm/aaaa; antigo redireciona 90 dias; voltar a um antigo da própria loja; transação + auditoria store.slug_changed) e resolveSlug (atual ou antigo válido).

# 2026-11-08 · 003/T012 logo e capa
- stores: storeImageUpload (assinatura na pasta stores/{storeId}, nome do servidor, jpg/png/webp/heic) e setStoreImage (pasta da loja ou 404; confere formato e ≤ 15 MB no Cloudinary; auditoria).

# 2026-11-08 · 003/T013 limpeza dos cadastros de teste
- stores.removeE2ESignups (lojas, redirecionamentos, perfis e contas de e2e-cadastro-*@cajugo.test) e referrals.removeReferralData; chamado pelo pnpm e2e:seed. Migrations 0006/0007 aplicadas no staging para o seed rodar.

# 2026-11-08 · 003/T014 componentes
- src/ui: Drawer (gaveta em <dialog>, fecha ao tocar num link), AutocompleteField (combobox WAI-ARIA), AvailabilityHint (Disponível/Indisponível com role=status) e ImageField (recusa > tamanho no aparelho).

# 2026-11-08 · 003/T015 menu da home
- ui/site-menu.tsx (gaveta [11a]) e auth/components/site-header.tsx (sessão em <Suspense>); auth.accountMenu (primeiro nome e painéis, PANEL_HREF); home com cabeçalho.

# 2026-11-08 · 003/T016 landing do lojista
- /lojistas [5b] (benefícios, plano, FAQ, barra Prosseguir) com pageMetadata, JSON-LD (Organization, Service/Offer, FAQPage) e Open Graph; robots.ts e sitemap.ts (platform/seo/indexing.ts).

# 2026-11-08 · 003/T017 termos
- /termos [12i]: Termos de uso e Política de privacidade (seções com âncoras), aviso de versão inicial em revisão jurídica, SEO pelo pageMetadata.

# 2026-11-08 · 003/T018 tela de cadastro
- /lojistas/cadastro [5c] (StoreSignupForm: cidade com sugestões, endereço sugerido e checado ao vivo, código ao vivo, conta existente, termos) e stores/actions.ts (checagens ao vivo com limite liveCheck 60/min por rede; registerStoreAction entra e vai ao pagamento); rota /i/[codigo] → cadastro com o código; seed dá código LOJISTA10 ao lojista de teste. Testado no navegador contra o staging.

# 2026-11-08 · 003/T019 tela Minha loja
- /painel/loja [3b]: StoreInfoForm (informações públicas, endereço, horário por dia com 2 intervalos e Fechado, divulgar por padrão), updateStoreAction com erro de horário no próprio dia; hours-form.ts; seed com WhatsApp válido. Testado no navegador (lojista salva; usuário da loja: Sem permissão).

# 2026-11-08 · 003/T020 imagens e divulgação
- Minha loja: StoreSharePanel (logo e capa enviados direto ao Cloudinary com assinatura e conferidos no servidor; copiar link; QR code PNG com qrcode; compartilhar; ver como cliente) e actions storeImageUploadAction/setStoreImageAction. Dependência qrcode 1.5.4 (MIT, D1). Testado no navegador com upload real no staging.

# 2026-11-08 · 003/T021 troca do endereço e /loja/{slug}
- Minha loja: SlugChangeForm (checagem ao vivo, aviso + confirmação, data da próxima troca) e changeSlugAction; /loja/[slug] mínima (D4) com cachedPublicStore ('use cache', tag stores) e placeholder de build; actions de loja invalidam a tag. Endereço antigo leva ao novo (testado no navegador).

# 2026-11-08 · 003/T022 e2e do cadastro e de Minha loja
- tests/e2e/store-signup.spec.ts (11 cenários: menu, landing com SEO no HTML, cadastro pelo /i/lojista10 até o pagamento, Indisponível, conta existente, Minha loja com horário, logo no Cloudinary, link e QR, troca de endereço com redirecionamento, termos, Sem permissão, 390 px). Seed acha a loja de teste pelo dono e a deixa fora da vitrine; IP de teste só no localhost; audit mede o rótulo do campo. 35 e2e verdes.

# 2026-11-08 · 003/T024 verificação da spec 003
- Rastreabilidade: 23 requisitos com teste, 268 unidade/integração e 35 e2e verdes. Correções da revisão: imagem só com o nome exato assinado (bloqueia `../` para outra loja), /loja/{slug} só para loja ativa, código pessoal e link /i/ em Minha loja (STO-FR-014), regra dos 30 dias só no serviço. Spec `implemented`; prod pendente (T023).

# 2026-11-08 · APP_URL obrigatória na produção
- appUrl() para o build quando falta APP_URL com VERCEL_ENV=production (antes caía em localhost sem avisar); aceita espaço e barra no fim. Teste novo em urls.test.ts; DEPLOYMENT.md atualizado.

# 2026-11-08 · 004/T001 documentos do Pix manual
- ARCHITECTURE §4: documento fiscal na loja (tax_id/tax_id_type), invoices.kind, payments com valor pago, método e observação, tabela notices, indicação rejected; SECURITY §8 (comprovante pela rota do servidor; valor pago e motivo); GLOSSARY (valor pago, documento fiscal, aviso, indicação não válida); ADR 0011.

# 2026-11-08 · 004/T002 migration 0008
- Enums e tabelas invoices, payments, notices; stores.tax_id/tax_id_type/billing_day/next_due_at/activated_at; referrals.reject_reason e status rejected; regra membership_cents (R$ 100). Índices únicos parciais: uma fatura first por loja e um comprovante em análise por fatura (testados). Aplicada no staging.

# 2026-11-08 · 004/T003 CPF e CNPJ
- src/platform/br/tax-id.ts: isValidCpf, isValidCnpj, parseTaxId (11 dígitos = CPF, 14 = CNPJ) e maskTaxId; a regra da chave Pix passou a usar o módulo (a cópia da validação saiu de settings/definitions.ts).

# 2026-11-08 · 004/T004 BR Code do Pix
- src/platform/pix/br-code.ts: payload EMV do Pix estático (chave, favorecido, cidade, valor) com CRC16, igual ao exemplo do manual do BACEN; nome e cidade sem acento e no limite do padrão.

# 2026-11-08 · 004/T005 vencimento
- billing/due-date.ts: firstDueDate e nextDueAfter, com o dia contado em São Paulo, último dia do mês quando falta o dia (31/01 → 28/02 → 31/03; bissexto), virada de ano e vencimento à meia-noite de São Paulo com o fuso da data.

# 2026-11-08 · 004/T006 arquivos privados no Cloudinary
- signUpload com type=authenticated, verifyUpload por tipo, destroy (pedido assinado) e fetchPrivate (API de download assinada); Cloudinary falso com tipo, apagados e leitura. Prova real no staging com PNG e PDF (ADR 0011 atualizado com o resultado).

# 2026-11-08 · 004/T007 logo e capa recusados são apagados
- setStoreImage apaga do Cloudinary a imagem recusada por formato ou tamanho (D4 do plano 004); nota da 005 no PLAN atualizada (falta só a remoção de metadados das fotos públicas).

# 2026-11-08 · 004/T008 mensalidade e cidade do favorecido
- Regra membership_cents ("Mensalidade do Plano Catálogo", grupo Pagamento, R$ 10–1.000) em [4c]; a chave Pix ganhou "Cidade do favorecido", obrigatória na troca (pixWriteSchema) e opcional na leitura; pixReady(); aviso no editor quando a chave atual não tem cidade; e2e da troca com cidade.

# 2026-11-08 · 004/T009 avisos no painel
- Domínio notices: notify (na transação do evento), noticesFor (só do perfil da sessão, frase montada no servidor) e dismissNotice (outro perfil → 404); permissão payments.view (admin e suporte); src/platform/br/money.ts (centsToReais, reaisToCents, brl), reaproveitado pelas regras.

# 2026-11-08 · 004/T010 tela de pagamento no servidor
- billing: checkoutView (mensalidade vigente ou da fatura aberta, documento mascarado, pixReady, wa.me do atendimento, última recusa) e startCheckout (CPF/CNPJ validado e gravado na loja, fatura first aberta uma vez, sem chave Pix → 409); AppError.conflict substituiu o Object.assign do 409 do endereço (achado da revisão da 003); fixtures de teste do billing.

# 2026-11-08 · 004/T011 autoindicação por CPF/CNPJ
- referrals.rejectSelfReferralsByTaxId: ao gravar o documento da loja, compara nos dois sentidos (indicação desta loja × documentos de quem indicou; indicações do dono × documento das lojas indicadas) e marca rejected/self_referral, com log só do motivo; chamado por startCheckout. Documentos de quem indicou: lojas dele hoje, CPF do perfil nas specs 008/010.

# 2026-11-08 · 004/T012 Pix e assinatura do comprovante
- billing.pixView (valor da fatura aberta, chave, favorecido, cidade, BR Code com valor, prazo; sem fatura → null; chave não pronta → 409) e receiptUpload (pasta privada receipts/{loja da sessão}, nome gerado, jpg/png/webp/heic/pdf, type authenticated; só com loja registered e fatura aberta).

# 2026-11-08 · 004/T013 envio do comprovante
- billing.submitReceipt: nome exato assinado para a loja da sessão (senão 404), arquivo conferido (jpg/png/webp/heic/pdf, até 10 MB; recusado é apagado), valor pago obrigatório, pagamento submitted e loja payment_review numa transação, log com valor pago e esperado; segundo envio (ou corrida no índice único) → 409 e arquivo apagado. stores: markPaymentReview, backToRegistered e activateFirstTime, cada uma só a partir do status esperado.

# 2026-11-08 · 004/T014 fila de comprovantes
- billing.reviewQueue (payments.view: admin e suporte): comprovantes em análise do mais antigo, com loja, referência, valor pago × esperado ("Valor diferente do esperado"), horário e formato; totais aguardando e confirmados no mês (São Paulo); pixReady e canReview (suporte sem botões). due-date.saoPauloMonthStart; auth/service reexporta can.

# 2026-11-08 · 004/T015 confirmar comprovante
- billing.confirmPayment (só admin): atualização condicional (submitted → confirmed, valor corrigido opcional), fatura paga, 1ª ativação com dia e próximo vencimento, aviso "Pagamento confirmado", log com valor pago/vale/esperado e referência, link wa.me com o endereço da loja e o vencimento; segundo admin → 409 "Este comprovante já foi conferido.", inexistente → 404. settleInvoice fica para o registro manual (T017) e para as mensais (011).

# 2026-11-08 · 004/T016 recusar comprovante
- billing.rejectPayment (só admin): motivo de 3 a 300 caracteres, atualização condicional (submitted → rejected), 1ª mensalidade volta a registered (fatura continua aberta para reenviar), aviso com motivo e valor faltante, log com motivo e valores; já conferido → 409.

# 2026-11-08 · 004/T017 pagamento sem comprovante
- billing.findStoresToCharge (lojas sem 1ª mensalidade paga, por nome ou endereço, com aviso de comprovante pendente) e registerManualPayment (só admin; forma, valor e observação; loja registered sem comprovante em análise; abre a fatura se faltar; pagamento confirmed manual; mesma ativação da confirmação; log payment.manual).

# 2026-11-08 · 004/T018 loja no ar e primeiros passos
- stores: LIVE_STATUSES/isStoreLive (ativa, em atraso, cancelamento agendado, PRD §5.5) no publicStore, corrigindo o filtro só "active" da 003; onboardingStatus (assinatura ativa, primeiro veículo da 005, loja completa = logo, capa, sobre e horário; some com os 3). Teste de ponta a ponta no serviço: /loja/{slug} só abre depois da confirmação.

# 2026-11-08 · 004/T019 rota do comprovante
- GET /api/v1/payments/[id]/receipt (contract.md): billing.receiptFile (admin e suporte qualquer; lojista só o da própria loja; resto, id inválido, inexistente ou manual → 404) e billing/http.receiptResponse (arquivo lido pelo servidor, private no-store, inline com nome neutro, nosniff; 403 vira 404). Conferido no servidor local: sem sessão → 401 problem+json.

# 2026-11-08 · 004/T020 tela de pagamento [5d] e recusa [12e]
- /lojistas/pagamento substitui a tela provisória: "2 de 2", card escuro do plano (mensalidade das regras, loja, vencimento, sem fidelidade, cancelar quando quiser), forma de pagamento Pix, CPF/CNPJ, barra fixa "Pagar com Pix · R$ X"; sem chave Pix, aviso com WhatsApp e botão desabilitado; com recusa, motivo e valor faltante [12e]. billing/actions.ts com startCheckoutAction.

# 2026-11-08 · 004/T021 tela do Pix [6c] e pagamento em análise [10a]
- /lojistas/pagamento/pix: valor, QR do BR Code (gerado no servidor), chave e copia e cola com Copiar, favorecido, passos, prazo; ReceiptForm com pré-visualização (imagem ou nome do PDF), limite de 10 MB, valor pago, envio direto ao Cloudinary privado e ida para [10a]. /painel/pagamento substitui a provisória (comprovante, valor, prazo; sem análise → painel). platform/cloudinary/browser-upload.uploadSigned agora é o envio único (logo e capa também usam). billing.paymentInReview e actions de assinatura e envio.

# 2026-11-08 · 004/T022 Pagamentos Pix do admin [10b]
- /admin/pagamentos substitui a provisória: aviso "Chave Pix não configurada", totais, lembrete do extrato, fila com Ver comprovante (rota privada), alerta de valor diferente, valor corrigido, Confirmar (com botão wa.me para avisar a loja) e Recusar com motivo; Registrar pagamento sem comprovante com busca da loja; suporte vê sem botões. Actions de conferência renovam a página pública da loja (STORES_TAG foi para stores/tags.ts e é reexportada pelo serviço).

# 2026-11-08 · 004/T023 onboarding [5e] e avisos no painel
- /painel/veiculos: banner "Assinatura ativa. Sua loja está no ar." com o link do catálogo, primeiros passos (N de 3, com links para cadastrar veículo e completar a loja) e estado vazio "Cadastrar primeiro veículo" → /painel/veiculos/novo (rota da 005), substituindo o texto provisório. Avisos (NoticeList com Dispensar) na moldura de todas as áreas logadas; notices/actions.dismissNoticeAction.

# 2026-11-08 · 004/T024 e2e do Pix manual
- tests/e2e/payment.spec.ts (3 cenários, vários atores): [5d] com CPF inválido → [6c] com QR, copiar e PNG real → [10a] → admin recusa com motivo → [12e] com faltante e aviso → reenvio em PDF real → admin abre o PDF pela rota privada e confirma (wa.me) → [5e] e /loja/{slug}; registro sem comprovante; suporte sem botões; usuário da loja sem pagamento. Seed: chave Pix de teste (restoreInitialSettings com destino), limpeza de faturas, pagamentos, avisos e comprovantes no Cloudinary. 38 e2e verdes; staging limpo depois.

# 2026-11-08 · 004 verificação
- Correções da revisão: fatura paga uma vez só (atualização condicional + índice único de pagamento confirmado, migration 0009), loja travada no registro sem comprovante, posse do comprovante no próprio filtro, id do aviso validado, observação no log do registro manual, reenvio [12e] sem redigitar o documento, erros que sumiam agora vão para o log; teste da PIX-NFR-002 (fora da busca) e auditoria de [12e] no e2e. Spec implemented; prod pendente (T025).

# 2026-11-08 · 004/T025 migrations no prod
- 0008 e 0009 aplicadas no cajugo-prod e conferidas: 10 migrations, tabelas invoices/payments/notices, colunas novas de stores, índices únicos de pagamento em análise e confirmado, mensalidade R$ 100 e status rejected da indicação.

# 2026-11-08 · rota do comprovante confere a sessão primeiro (004)
- receiptResponse recebe uma função que monta as dependências: sem sessão responde 401 antes de ler a configuração do Cloudinary; erro inesperado vai para o log (billing.receipt_failed) e vira 500 problem+json sem detalhe interno. No prod a rota respondia 500 vazio sem sessão.

# 2026-11-08 · 005/T001 documentos de veículos
- ARCHITECTURE §4: vehicles com ids/nomes/mês da FIPE, conditions jsonb, share_before_sale, deleted_at; vehicle_history (field = price); tabelas fipe_*; GLOSSARY (Histórico do veículo, Referência FIPE); ADR 0012 (FIPE copiada sob demanda).

# 2026-11-08 · 005/T002 migration 0010
- Enum vehicle_status e tabelas vehicles, vehicle_photos (posição única por veículo), vehicle_history, fipe_brands, fipe_models, fipe_years e fipe_prices, com índices; só CREATE. Aplicada no staging.

# 2026-11-08 · 005/T003 placa
- src/platform/br/plate.ts: parsePlate aceita Mercosul (ABC1D23) e antiga (ABC1234), com ou sem hífen, guarda em maiúsculas e devolve o final de placa.

# 2026-11-08 · 005/T004 cliente da FIPE
- src/platform/fipe/client.ts: marcas, modelos, anos e preço da API pública (códigos em texto, preço em centavos, mês de referência), com prazo de 5 s e validação do formato; qualquer falha vira FipeUnavailable. Formato conferido com 3 consultas reais; plano anota que a família (Modelo) sai do nome da FIPE.

# 2026-11-08 · 005/T005 fotos reduzidas e sem metadados
- signUpload aceita transformação de entrada assinada; verifyUpload devolve largura e altura. Prova no staging: JPEG 3000×2000 com GPS e aparelho no EXIF ficou guardado com 1600×1067 e nenhum metadado, mesmo baixando o original sem transformação; apagado depois.

# 2026-11-08 · 005/T006 domínio fipe
- brands, models (agrupados por família = primeira palavra, com as versões da FIPE), years (id modelo:ano) e reference (preço do mês), lendo do banco e consultando a API só quando falta ou venceu (30 dias); API fora → o guardado, mesmo vencido; sem nada guardado → 503 "Lista indisponível agora" (referência → null).

# 2026-11-08 · 005/T007 rascunho do veículo
- vehicles: lists.ts (câmbio, combustível, carroceria, portas, condições, itens; limites fixos D2), schemas (campos do [2a], tudo opcional no rascunho, .strict()), saveDraft (cria no 1º salvamento com divulgação e WhatsApp da loja; depois grava só o enviado; vendido/excluído → 409/404) e vehicleForm (saída montada à mão); loja B → 404; usuário da loja cadastra. stores.vehicleDefaults; brPhoneSchema foi para platform/br/phone.ts.

# 2026-11-08 · 005/T008 identificação do veículo
- fipe.identify confere marca → versão → ano contra a FIPE guardada e devolve nomes (marca, família = Modelo, versão), ano modelo (Zero KM = ano corrente) e referência do mês; saveDraft grava esses dados e a referência (nunca da tela), aplica a regra dos anos e a placa com final. vehicles/price.priceVsFipe ("4,6% abaixo").

# 2026-11-08 · 005/T009 fotos do veículo
- photoUpload (pasta vehicles/{id}, nome gerado, jpg/png/webp/heic, transformação de entrada de 1.600 px sem metadados, limite de 20), addPhoto (nome exato, formato, 15 MB, dimensões; recusado apagado; posição no fim), removePhoto (apaga no Cloudinary e fecha o buraco) e reorderPhotos (lista inteira; 1ª = capa); vehicleForm traz as fotos; loja B → 404 em tudo.

# 2026-11-08 · 005/T010 publicar veículo
- vehicles.publish: exige 1 foto e marca, versão, ano modelo, ano de fabricação, km, câmbio, combustível e preço, com erro em cada campo que falta; draft → published condicional com published_at e log vehicle.published; repetir não faz nada; loja não ativada publica; loja B → 404.

# 2026-11-08 · 005/T011 divulgação e legendas
- vehicles.setShare (só publicado; rascunho → 409 "Publique para liberar."; loja B → 404) e captions.ts (selo por status e legenda: vitrine, só catálogo, publique, removido, e "Aparece quando a loja for ativada", D3).

# 2026-11-08 · 005/T012 edição do publicado e resumo
- saveDraft em veículo publicado grava vehicle_history (field price, antes/depois, quem) e log vehicle.price_changed na mesma transação quando o preço muda; vehicleSummary ([6e]) com nome, selo, km, preço, capa, legenda da divulgação, Dias no ar e se a venda ainda pode ser desfeita; stores.storeIsLive.

# 2026-11-08 · 005/T013 vendido, desfazer, despublicar e excluir
- vehicles: transição única (trava a linha, status de origem fixo, log) para markSold (guarda e desliga a divulgação), undoSold (até 7 dias, volta com a divulgação de antes), unpublish (→ rascunho) e remove (→ excluído com deleted_at, definitivo para a loja); loja B → 404. Nome no resumo passa a ser a versão da FIPE.

# 2026-11-08 · 005/T014 lista Meus veículos
- vehicles.listVehicles: indicadores (publicados, na CajuGo, vendidos no mês em São Paulo), contagem por filtro (todos, publicados, rascunhos, vendidos; excluído não conta), busca por marca/modelo/versão ou placa, cards com capa, selo, legenda e o que pode fazer; loja B vê só os próprios. billing.subscriptionCard (só lojista) e reexport de saoPauloMonthStart.

# 2026-11-08 · 005/T015 catálogo público e primeiro veículo
- vehicles.publicVehicles (só publicado de loja no ar; saída sem placa nem chassi; capa) e hasPublishedVehicle; stores.onboardingStatus recebe firstVehicle de quem chama (a página /painel/veiculos junta os dois domínios, sem ciclo).

# 2026-11-08 · 005/T016 componentes base
- src/ui: ConfirmSheet (diálogo [6f] em folha de baixo, <dialog> nativo, controlado), SelectField (rótulo, ajuda, erro apontado) e TextAreaField (contador N/máx); testes de marcação.

# 2026-11-08 · 005/T017 formulário do veículo (parte 1)
- /painel/veiculos/novo e /[id]/editar com VehicleForm: identificação pela FIPE (marca → modelo → versão → ano, ano de fabricação, placa), ficha técnica, preço com referência FIPE e diferença, parcela estimada, condições (YesNo controlado, 44 px), itens com contador, descrição com contador e divulgação/contato; salva sozinho 1 s depois (só o que mudou), mostra "Salvando…" já na alteração, avisa antes de sair com alteração pendente e troca o endereço para o de edição no 1º salvamento. Actions de veículo e FIPE; tag de cache vehicles. Testado no navegador com a FIPE real.

# 2026-11-08 · 005/T018 fotos e Publicar no formulário
- PhotosSection (redução no navegador, progresso, capa, arrastar ou setas, remover, limite de 20) e PublishBar (salva o pendente, publica, mostra erro em cada campo e rola até a seção; publicado → resumo); contexto do formulário por React Context; uploadSigned com progresso e shrinkImage na plataforma; imageUrlFor e cloudName para a tela. Ações só renovam as páginas públicas quando o veículo é ou era público (renovar recarrega a rota e remontava o rascunho). Testado no navegador: erros, foto real, FIPE real e publicação.

# 2026-11-09 · 005/T019 tela Meus veículos [1c]
- /painel/veiculos: indicadores, card da assinatura (só lojista), busca, filtros com contagem, VehicleCard (selo, legenda, toggle, Vendido com diálogo [6f], Editar), estado vazio e botão Novo veículo; primeiros passos com o 1º veículo; texto de [10a] alinhado ao PRD. Corrigido: data crua em SQL manual quebrava no Postgres real (o PGlite aceita); agora vai ISO com cast. Testado no navegador contra o staging.

# 2026-11-09 · 005/T020 resumo do veículo [6e]
- /painel/veiculos/[id]: resumo com capa, nome, ano, km, preço, selo e Dias no ar; seções com Editar (âncoras do [2a]); VehicleActions com toggle de divulgação, vendido, desfazer venda, despublicar e excluir com o diálogo [6f]. Testado no navegador contra o staging.

# 2026-11-09 · 005/T021 catálogo com veículos
- /loja/{slug} lista os veículos publicados (capa, nome, ano, km, preço) ou o aviso de catálogo vazio; vehicles/current.cachedPublicVehicles com tag vehicles + stores e validade de 60 s; publicStore devolve storeId. A página segue fora da busca até a 006.

# 2026-11-09 · 005/T022 e2e de veículos
- tests/e2e/vehicles.spec.ts: publicar vazio com erros, 2 fotos reais e troca de capa, FIPE real, autosave ao fechar e voltar, publicar, catálogo sem placa, [1c] com indicadores e busca por placa, vendido some do catálogo e desfazer volta, despublicar, excluir (404), usuário da loja cadastra e loja recém-cadastrada não abre. Seed apaga veículos, fotos e histórico (Cloudinary também). Página 404 em português. 40 e2e verdes; staging limpo depois.

# 2026-11-09 · 005/T023 migration no prod
- 0010 aplicada no cajugo-prod e conferida: 11 migrations, tabelas vehicles, vehicle_photos, vehicle_history e fipe_*, índices e os 6 status do veículo. Falta o /verify.

# 2026-11-09 · 005 verificação
- Correções da revisão: publicado não perde identificação, preço, km nem a última foto; fotos travadas em vendido; corridas resolvidas com trava do veículo (fotos, publicar, histórico de preço); log sem parâmetros de consulta em todas as actions (errorMessage); id inválido → 404; busca sem curinga; referência FIPE renovada ao abrir a edição; autosave em fila, sem perder o lote nem duplicar rascunho; /novo mostra os padrões da loja; 15 MB conferidos antes de reduzir; selo Na CajuGo. 408 testes e 40 e2e verdes. Spec implemented.

# 2026-11-09 · 006/T001 /loja/{slug} no build de produção
- `instant = false` em /loja/[slug] (a cada revalidação o build registrava erro de pré-renderização); `pnpm test:e2e:prod` (playwright.prod.config.ts, scripts/start-production.sh, tests/e2e-prod): build, servidor standalone e teste que confere conteúdo e ausência desse erro no log.

# 2026-11-09 · 006/T002 documentos da vitrine
- ARCHITECTURE §4 (slugs, search_text, search sem unaccent, rank_score, regras da parcela), SEO.md (status real no proxy), GLOSSARY (Relevância), ADR 0013.

# 2026-11-09 · 006/T003 migration 0011
- vehicles: make_slug, model_slug, search_text, search (tsvector gerado, config simple), rank_score e 5 índices; regras installment_down_bps (20%) e installment_months (48) em [4c]. Aplicada no staging.

# 2026-11-09 · 006/T004 parcela e texto sem acento
- platform/br/installment.ts (tabela Price) e slug.ts (plainText, slugify).

# 2026-11-09 · 006/T005 filtros e endereço do veículo
- showcase/filters.ts (URL em português ↔ filtros; inválido ignorado; contador) e urls.ts (vehiclePath, idFromVehicleParam).

# 2026-11-09 · 006/T006 SEO do catálogo
- platform/seo/catalog.ts: títulos e descrições de veículo e loja, alt da imagem, JSON-LD Car+Offer (InStock/SoldOut), AutoDealer, ItemList, BreadcrumbList, Organization+WebSite.

# 2026-11-09 · 006/T007 campos de busca do veículo
- vehicles.syncSearchFields grava make_slug, model_slug, search_text e rank_score (dia da publicação + até 7 pontos de completude) na mesma transação de salvar, publicar e mudar fotos.

# 2026-11-09 · 006/T008 consulta da vitrine
- showcase: publicVisible (regra única), searchShowcase com total e lojas, PublicCard montado à mão (sem placa, chassi nem cobrança), pickBadges na ordem combinada e parcela pelas regras.

# 2026-11-09 · 006/T009 catálogo da loja no serviço
- showcase.storePage: loja no ar (dados públicos e iniciais), suspensa (aviso sem motivo), endereço antigo (redireciona), fora do ar ou inexistente (null); catálogo por escopo de loja, divulgados ou não.

# 2026-11-09 · 006/T010 busca e filtros
- showcase: busca por prefixo de cada palavra no texto sem acento, filtros de marca, preço, ano, km, câmbio e combustível, countMatches e facets; símbolos digitados não chegam ao to_tsquery.

# 2026-11-09 · 006/T011 ordenação e paginação
- showcase: 6 ordens com cursor por valor + id (sem repetir nos empates; cursor adulterado volta ao início); listVehicles [1c] de 20 em 20 pela ordem do id.

# 2026-11-09 · 006/T012 página do veículo no serviço
- showcase.vehiclePage: publicado (divulgado ou não) com galeria, ficha em português, condições na ordem do PRD, itens, selos, loja e wa.me com veículo e link; vendido/excluído com parecidos; loja suspensa com aviso; rascunho, fora do ar ou inexistente: null. Só colunas públicas.

# 2026-11-09 · 006/T013 status real no proxy
- proxy.ts: /loja/* e /v/* decididos por gateDecision (308 para endereço antigo, texto desatualizado e /loja/{slug}/v/{id}; 404 de verdade) com memória de 60 s (platform/http/public-gate); /?filtros reescrito para /vitrine; cookie cajugo_ref de 30 dias (vale o último). Seed cria um endereço antigo; provado no build de produção.

# 2026-11-09 · 006/T014 sitemaps
- Um sitemap por tipo (pages, stores, vehicles), listados no robots.txt; showcase.sitemapEntries com cache renovado por veículo e loja; showcase/current.ts com as leituras públicas em cache.

# 2026-11-09 · 006/T015 vitrine [1a]
- PublicCard, CatalogView e a página / pré-renderizada com contador, cards, JSON-LD (Organization, WebSite, ItemList, BreadcrumbList) e vitrine vazia com convite, fora do Google até ter veículo; cache das leituras públicas renova a cada 30 s e por etiqueta.

# 2026-11-09 · 006/T016 catálogo da loja
- /loja/[slug] no layout novo com CatalogView, JSON-LD (AutoDealer, BreadcrumbList, ItemList) e [12g] sem motivo; saem publicStore, publicVehicles e os dois current.ts antigos, com os testes levados para storePage e searchShowcase.

# 2026-11-09 · 006/T017 filtros, busca e ordenação
- Folha [6d] com contagem ao vivo (countMatchesAction, em cache), busca, ordenação e [12a] na vitrine e no catálogo; /vitrine recebe os filtros reescritos pelo proxy (o acesso direto não é redirecionado: a canônica já é /); filtro sem resultado fica fora do Google.

# 2026-11-09 · 006/T018 carregar mais e estados
- useLoadMore (cursor, sem repetir) e LoadMoreButton em src/ui, usados na vitrine, no catálogo e em [1c]; [12b] em error.tsx e no próprio botão; [12c] com esqueleto só em transição do cliente, sem Suspense no conteúdo indexável.

# 2026-11-09 · 006/T019 página do veículo
- /v/[slug] com galeria de rolagem nativa, selos, ficha com final de placa, card da loja, barra WhatsApp e compartilhar sem ?ref=; Car + Offer e BreadcrumbList; vendido [12d] com SoldOut e noindex; suspensa [12g]; não divulgado leva a loja no cabeçalho.

# 2026-11-09 · 006/T020 desktop [15a]
- FiltersForm único, usado na folha do celular e na coluna lateral do desktop (a partir de 1024 px), com cards em 3 colunas na vitrine e no catálogo.

# 2026-11-15 · 006/T021 e2e da vitrine
- Seed com loja de vitrine (45 veículos, 1 vendido, 1 loja suspensa; fotos `sample`, nunca apagadas); e2e em 390 e 1280 px e contra o build de produção (308, LCP/CLS em 4G, pré-renderização); chips com 44 px; sai o 308 de /vitrine direta.

# 2026-11-15 · 006 /verify
- Revisão: cache da vitrine renova com as regras ([4c] → parcela), AutoDealer com horário, SiteHeader fora do domínio, VEHICLES_TAG e parseFilters pelo service, cookie cajugo_ref nos termos [12i], teste da vitrine vazia; spec 006 implemented.

# 2026-11-15 · 006/T022 migration no prod
- `0011` aplicada no prod e conferida: 12 migrations, colunas de busca em `vehicles` e as regras `installment_down_bps`/`installment_months`.

# 2026-11-15 · 006b/T001 documentos
- SEO.md (índice /carros, marca na cidade, discovery.xml, /carros/* no proxy, página vazia), PRD [1a] (links Buscar por marca/cidade), ARCHITECTURE (`stores.city_slug`), ADR 0014 aceita.

# 2026-11-15 · 006b/T002 migration 0012
- `stores.city_slug` gerado pelo banco (igual ao slugify em todas as 5.571 cidades do IBGE, provado em teste), índices por cidade e por modelo, `make_slug` de GM e VW corrigido; aplicada no staging.

# 2026-11-15 · 006b/T003 nome da marca
- `fipe.brandName` com a lista de correções dos 108 nomes guardados (GM/VW sem prefixo, maiúsculas, Kia, Caoa Chery); `make_slug` sai do nome corrigido e as marcas da vitrine mostram esse nome, somando nomes da FIPE iguais.

# 2026-11-15 · 006b/T004 endereços de descoberta
- `showcase/discovery-urls.ts`: lê e monta `/carros/{marca}[/{modelo}]` e `/carros/{cidade}-{uf}[/{marca}]` (cidade pelas 27 UFs); formato inválido vira `null` e não chega ao banco.

# 2026-11-15 · 006b/T005 SEO da descoberta
- `platform/seo/discovery.ts`: título, descrição e parágrafo gerado (veículos, cidades ou lojas, faixa de preço em reais inteiros). `SITEMAP_IDS` com `discovery` passa para a T009, junto do conteúdo.

# 2026-11-15 · 006b/T006 escopo de descoberta
- `Scope` ganha `{ discovery }` (marca, modelo, cidade, marca na cidade): só acrescenta condições à regra da vitrine, valendo para busca, contagem ao vivo e marcas disponíveis.

# 2026-11-15 · 006b/T007 página de descoberta
- `discoveryPage`: nomes (marca corrigida), caminho, números (total, lojas, cidades, faixa de preço), `empty` com a página acima e `null` para o que nunca existiu (D2). Regra de visibilidade em `visibility.ts`. Migration `0013`: índice `vehicles (make_slug, model_slug)`; aplicada no staging.

# 2026-11-15 · 006b/T008 índice e links
- `discoveryIndex` (marcas e cidades da vitrine com contagem) e `discoveryLinks` (marca, modelo e cidade com veículos, numa consulta); `knownMakes` único para o índice e para as marcas dos filtros.

# 2026-11-15 · 006b/T009 status real e sitemap
- `/carros/*` passa pelo gate do proxy: 404 real para o que nunca existiu, página esvaziada continua respondendo; sitemap `discovery.xml` (índice + páginas com veículos, numa consulta) listado no robots.txt.

# 2026-11-15 · 006b/T010 origem da lista
- Actions de contagem e "Carregar mais" recebem `source` (vitrine, loja ou endereço de descoberta) validado por schema e resolvido no servidor; componentes passam `source` no lugar de `store`; leituras de descoberta em cache em `current.ts`.

# 2026-11-15 · 006b/T011 páginas de descoberta
- `/carros/[first]` e `/carros/[first]/[second]` com `DiscoveryView`: lista, filtros com a marca fixa (`lockMake`), parágrafo, caminho visível + JSON-LD, metadados com canônica sem filtros e `noindex` quando vazia; página vazia mostra os veículos da página acima.

# 2026-11-15 · 006b/T012 índice /carros
- `/carros` pré-renderizada com marcas e cidades da vitrine (contagem e link), JSON-LD e `noindex` enquanto vazia; vitrine com os atalhos "Buscar por marca" e "Buscar por cidade".

# 2026-11-15 · 006b/T013 links internos
- Página do veículo com "Veja também" (marca, modelo, cidade com veículos) e catálogo da loja com o link da cidade; `vehiclePage` e `storePage` devolvem os identificadores de descoberta.

# 2026-11-15 · 006b/T014 e2e da descoberta
- `tests/e2e/discovery.spec.ts` (390 e 1280 px): as quatro páginas, filtro na URL, carregar mais, página vazia, `/carros`, links no veículo e na loja, HTML cru, sitemap e `robots.txt`; seed com loja em Recife/PE. Build de produção: 404/200 de `/carros/*` e LCP da descoberta (1,2 s, CLS 0,002).
- Testes de veículos e do menu ajustados à página nova: contam só a lista do catálogo e repetem o clique do menu até ele abrir.

# 2026-11-15 · 006b/verify ajustes da revisão
- Migration `0014`: `make_slug` de Kia e Caoa Chery corrigido; teste compara as correções de `brandName` que mudam o endereço com as migrations.
- Marca na cidade que nunca existiu junta responde 404; página vazia com descrição "Nenhum … à venda agora" e foto na prévia; `/carros` com foto e fora do sitemap quando vazio; atalhos da vitrine também com filtro sem resultado.
- Spec 006b `implemented`, PLAN marcado; teste de LCP da descoberta com `DSC-NFR-003`.

# 2026-11-16 · 006c/T001 documentos
- GLOSSARY com "Simulador de parcelas" e favorito no aparelho; API.md com `/favoritos` e `favoriteCardsAction` (no lugar de `syncFavorites`/`toggleFavorite`, que ficam para a fase 2); ARCHITECTURE `buyers/`; plano e tasks usam `buyers/` em vez do domínio novo `favorites`.

# 2026-11-16 · 006c/T002 simulação Price
- `simulateInstallment` devolve entrada, financiado, parcela e total; `estimatedInstallment` (card) passa a usá-la, com teste de igualdade para várias entradas e prazos.

# 2026-11-16 · 006c/T003 favoritos no aparelho
- `buyers/favorites.ts`: loja de favoritos sobre o `localStorage` (chave `cajugo:favorites:v1`, conteúdo validado, até 200, mais recente primeiro, preço do momento), com `useFavorites`/`useFavorite` por `useSyncExternalStore` e aviso entre abas.

# 2026-11-16 · 006c/T004 cards dos favoritos
- Escopo `{ vehicleIds }` em `publicVisible` (publicado e loja no ar, divulgado ou não) e `favoriteCards(db, ids)`; `publicVisible` passa a decidir a parte do escopo numa função só (`scopeWhere`).

# 2026-11-16 · 006c/T005 leitura dos favoritos
- `buyers/actions.ts`: `favoriteCardsAction({ ids })` (uuid, 1 a 200, sem campo a mais, ids repetidos juntados) chama `showcase.favoriteCards`; só lê e devolve `null` em entrada inválida ou falha.

# 2026-11-16 · 006c/T006 dados do simulador
- `vehiclePage.simulator` (preço, regras [4c] vigentes, contato do anúncio, título e link) ou `null` sem "Exibir parcela estimada" ou sem preço; `showcase/simulator.ts` com as opções (regra fora da lista entra nela, D2) e a mensagem pronta para a loja.

# 2026-11-16 · 006c/T007 simulador [14b]
- `SimulatorSheet` (folha de baixo; centralizada no desktop) com entrada e prazo em chips, parcela, entrada, financiado, total, aviso de estimativa e "Enviar simulação à loja"; "Simular" abaixo do preço e "Ver parcelas" ao lado do WhatsApp, só com a parcela ativada.

# 2026-11-16 · 006c/T008 coração
- `buyers/components/favorite-button.tsx` sobre a foto do `PublicCard` (vitrine, descoberta, catálogo, "Carregar mais", parecidos) e na galeria do veículo ao lado de compartilhar; sai desmarcado no servidor; aviso ao chegar a 200. `favorites.ts` valida à mão, sem zod, para não pesar nas páginas públicas.

# 2026-11-16 · 006c/T009 Favoritos [14a]
- `/favoritos` pré-renderizada com `noindex` e fora do sitemap; ♡ no cabeçalho; `FavoritesView` com esqueleto até hidratar, cards atuais na ordem, "Baixou R$ X", "Vendido" com "Ver veículos parecidos" (página do veículo, D3), estado vazio e "Tentar de novo".
- `HeartIcon` em `ui/`; os hooks do navegador saíram para `buyers/use-favorites.ts` ("use client"), e `favorites.ts` ficou só com a regra, para a action do servidor poder ler o limite.

# 2026-11-16 · 006c/T010 e2e das ferramentas do comprador
- `tests/e2e/buyer-tools.spec.ts` (390 e 1280 px): simulador pelos dois botões, recálculo, mensagem à loja e ausência sem a opção; coração no card, na página e no catálogo, sem POST ao servidor; [14a] com ordem, "Baixou", "Vendido" e vazio; HTML sem placa; `/favoritos` no LCP do build de produção. Seed: veículo completo com a parcela ativada.
- Botões do simulador abrem e fecham pelo HTML (Invoker Commands), antes do JavaScript; chave das fotos da galeria com a posição (foto repetida gerava aviso de chave duplicada).

# 2026-11-16 · 006c/verify ajustes da revisão
- `similarPaths`: favorito fora da vitrine leva à página de descoberta do modelo (ou da marca; sem registro, à vitrine); leitura de [14a] devolve `{ cards, similar }`.
- Favorito estragado no aparelho sai sozinho, sem apagar os outros; aviso de 200 some em 4 s; coração com 22 px (DESIGN §2.4); nomes e esqueleto únicos em [14a].
- Spec 006c `implemented`, PLAN marcado; plano com D3 revista e o `<dialog>` do simulador no lugar do `Drawer`.

# 2026-11-16 · 006d/T001 documentos
- ARCHITECTURE §4 (`search_alerts`) e §6 (vencimento no job; compatível na leitura), API.md §5 (actions, `/admin/alertas`, `/alertas/cancelar`, cron com contrato), SECURITY §8 (nome e celular do alerta), GLOSSARY (estados do alerta); ALR-FR-004 com o link de cancelar também na confirmação (D3).

# 2026-11-16 · 006d/T002 migration 0015
- Enum `search_alert_status`, tabela `search_alerts` (RLS ligado; nome e celular anuláveis), índice único parcial da busca pendente por celular (vitrine e descoberta separadas) e `(status, created_at)`; regra `search_alert_validity_days` (90, de 7 a 365) com o valor inicial semeado na migration. Aplicada no staging.

# 2026-11-16 · 006d/T003 celular
- `brMobileSchema`: só celular com DDD (9 + 8 dígitos), com máscara ou +55, guardado como `55…`; fixo recusado com "Informe um celular com WhatsApp, com DDD.".

# 2026-11-16 · 006d/T004 link de cancelar
- `buyers/alert-token.ts`: `cancelToken(id)` = `{id}.{HMAC-SHA256 do id, 18 bytes, base64url}` com `HASH_SECRET`; `alertIdFromToken` confere em tempo constante e recusa link adulterado, de outro alerta ou fora do formato.

# 2026-11-16 · 006d/T005 pedir alerta
- `showcase.savedSearch(source, query)`: busca normalizada sem a ordenação, com a página de descoberta (marca fixa fora dos filtros); catálogo de loja e página inválida → `null`. `discoveryFilters` saiu do componente para `filters.ts`.
- `buyers.createAlert`: pendente com nome, celular, busca e hora do consentimento; mesma busca → `duplicate`; 6º pendente do celular → `too-many`. `isUniqueViolation` passou de `billing` para `platform/db/errors.ts`.

# 2026-11-16 · 006d/T006 formulário público do alerta
- `buyers.requestAlert`: limite por IP (5/min, 30/dia), honeypot que finge sucesso, schema estrito (nome, celular, consentimento, origem, query), só vitrine ou descoberta, mensagens de duplicado e de limite do celular, link de cancelar para a confirmação; `createSearchAlertAction` só lê o IP, chama o serviço e invalida `ALERTS_TAG`.

# 2026-11-16 · 006d/T007 veículo compatível
- `showcase.firstMatch(search, after)`: escopo da página de descoberta (ou vitrine) + filtros da busca guardada pela mesma regra da lista, só publicado depois do alerta, o mais antigo primeiro; não divulgado e loja suspensa de fora.

# 2026-11-16 · 006d/T008 alertas do admin
- `buyers.alertInbox`: pendentes dentro da validade das regras (lida na hora), cada um com o 1º veículo compatível (`firstMatch`) e a mensagem `wa.me` (nome, veículo, link de cancelar); os sem veículo vão para "aguardando", sem nome nem celular. `cachedAlertInbox` em cache de 60 s com as tags de veículos, lojas, regras e alertas. `showcase.searchLabel` dá o rótulo da busca.

# 2026-11-16 · 006d/T009 avisar e cancelar
- `markNotified` (permissão nova `alerts.notify`: admin e suporte) fecha o alerta, apaga nome e celular, grava `notified_by` e o `activity_log` sem dado pessoal; `cancelAlert` só com o link do próprio alerta (`canceled`, `closed`, `invalid`). Actions com `updateTag(ALERTS_TAG)`; cancelar com limite `liveCheck` por rede.

# 2026-11-16 · 006d/T010 job diário
- Primeiro cron: `GET /api/v1/cron/daily` (contract.md da 006d) com `isCronRequest` (`Bearer CRON_SECRET`, tempo constante; sem segredo, recusa tudo), `purgeExpired` (pendente vencido → `expired` sem nome e celular) e `purgeRateLimits` (> 2 dias); `vercel.json` com `crons` às 06:00 UTC; `.env.example` explica o `CRON_SECRET`.

# 2026-11-16 · 006d/T011 formulário [12a]
- `buyers/components/alert-form.tsx` no `NoResults` da vitrine e da descoberta (prop `alertSource`; o catálogo da loja não passa): botão que abre nome, celular, consentimento com link para a privacidade e honeypot; confirmação "Vamos avisar quando chegar" com "Não quero mais este aviso" (D3) ou "Já estamos de olho nessa busca". Termos [12i] com o trecho "Avisar quando chegar".

# 2026-11-16 · 006d/T012 tela Alertas
- `/admin/alertas` (admin e suporte, `alerts.notify`): "Com veículo" com o pedido, o veículo, "Avisar no WhatsApp" e "Marcar como avisado"; "Aguardando" com a busca e o vencimento, sem nome nem celular; estado vazio. Item "Alertas" no menu do admin com contador (`NavItem.count`; ponto no "Mais"), do mesmo cache da tela.
- `brDate` saiu de `stores` para `platform/br/date.ts`.

# 2026-11-16 · 006d/T013 cancelar pelo link
- `/alertas/cancelar/[token]` (`noindex, nofollow`; `/alertas` no `PRIVATE` do `robots.txt`): abrir só mostra a confirmação, e o toque em "Cancelar aviso" chama a action; mensagens de cancelado, já encerrado, link inválido, limite e falha.

# 2026-11-16 · 006d/T014 e2e do Avisar quando chegar
- `tests/e2e/search-alerts.spec.ts` (390 e 1280 px): pedido na vitrine com fixo e sem consentimento recusados, repetido ("Já estamos de olho") e cancelado pelo link; descoberta com formulário e catálogo sem; link adulterado; admin vê o compatível com WhatsApp e contador, marca como avisado; lojista sem acesso; suporte no desktop. Seed `buyers/testing/e2e-seed.ts` com um alerta compatível ("Argo V0") e um esperando. Build de produção: LCP da busca sem resultado (632 ms, CLS 0).

# 2026-11-16 · 006d/verify ajustes da revisão
- `auth` deixou de ler o cache de `buyers`: o contador do menu vem do `app/admin/layout.tsx` (`navCounts`) e o item tem `permission`. `buyers/schemas.ts`; cancelar com schema estrito; cancelar e vencer no `activity_log`.
- Pedido com trava por celular em transação; busca guardada sem maiúscula/acento; avisar e cancelar vencem antes os atrasados; o job invalida o cache do admin; `NoResults` com `alert={{ source }}`; título do veículo e validade num lugar só; termos sem "90 dias" fixo.

# 2026-11-16 · 006d/T015 fechamento
- Spec `implemented`: ALR-SEC-001 diz "admin e suporte" e ALR-FR-002 conta só veículos publicados depois do alerta. Migration `0015` aplicada no prod (tabela e regra de 90 dias conferidas). PLAN e T015 marcados.

# 2026-11-16 · 006d docs do cron
- `ARCHITECTURE.md` §6: horário inexato do Hobby (06:00–06:59 UTC), aviso da migração Cron Jobs → Schedules e custo. `DEPLOYMENT.md`: onde cadastrar o `CRON_SECRET` e como gerar.

# 2026-11-16 · 006d log do cron
- `api/v1/cron/daily`: `logger.info("cron.daily", { expiredAlerts, durationMs })` a cada execução bem-sucedida, como pede o `OBSERVABILITY.md`.

# 2026-11-16 · 007/T001
- ARCHITECTURE §4 (`leads`, `vehicle_daily_stats`) e §6 (`purgeOldLeads`); API.md §5 com as actions de lead e `/painel/leads`; SECURITY §8 (2 anos, marcas no aparelho); GLOSSARY (status do lead, Visualização, Desempenho); PRD §8 com uma URL só para o veículo; termos com o trecho do lead.

# 2026-11-16 · 007/T002
- Migration `0016` (staging): enums `lead_channel`, `lead_origin`, `lead_status`; tabelas `leads` e `vehicle_daily_stats` com índices; FKs com cascade. GLOSSARY da T001 (ficou fora daquele commit).

# 2026-11-16 · 007/T003
- `leads/status.ts` (próximo status, aberto, rótulos, destaque de Novo > 24 h) e `leads/device.ts` (lead de WhatsApp a cada 24 h, visualização por dia de São Paulo, origem pela aba do catálogo); `brDay` em `platform/br/date.ts`.

# 2026-11-16 · 007/T004
- `isKnownBot(userAgent)` em `platform/http/bots.ts`: buscadores, prévias de redes sociais, navegadores automatizados e clientes HTTP; sem User-Agent também conta como robô.

# 2026-11-16 · 007/T005
- `showcase.contactTarget(vehicleId)`: loja e divulgação de um veículo visível ao público (`publicVisible`), senão `null`. `leads/schemas.ts`: formulário estrito (e-mail, telefone BR fixo ou celular, mensagem ≤ 1.000), clique e visualização.

# 2026-11-16 · 007/T006
- `leads.contactStore` e `contactLeadAction`: lead `form`/`new` na loja do veículo visível, origem `store_catalog` forçada para não divulgado, honeypot com sucesso falso, limite por IP (5/min, 30/dia), erros por campo.

# 2026-11-16 · 007/T007
- `recordWhatsappClick` e `whatsappClickAction`: lead `whatsapp`/`contacting` sem nome nem contato; limite por IP com chave própria; entrada inválida, veículo fora do ar ou limite só não gravam, nunca lançam.

# 2026-11-16 · 007/T008
- `recordView` e `viewAction`: upsert em `vehicle_daily_stats` por veículo e dia de São Paulo; robô (`isKnownBot`), veículo fora do ar e mais de 60/min do IP não contam.

# 2026-11-16 · 007/T009
- `leadsBoard` (cards da loja da sessão, mais novo primeiro, até 200; contagens por status; Novos agora; % da vitrine em 30 dias; destaque; veículo excluído marcado; WhatsApp e tel só com telefone) e `newLeadsCount`; permissão `leads.view`.

# 2026-11-16 · 007/T010
- `moveLead` e `moveLeadAction`: próximo status ou Perdido só a partir de status aberto (409 se fechado), troca com `where status = esperado`; lead de outra loja ou id inválido → 404; permissão nova `leads.manage` (dono e usuário da loja).

# 2026-11-16 · 007/T011
- `vehiclePerformance`: soma de `vehicle_daily_stats.views`, contagem de leads do veículo e dias no ar (publicação até hoje ou até a venda); veículo de outra loja, excluído ou id inválido → 404.

# 2026-11-16 · 007/T012
- `purgeOldLeads` no job diário: lead com 2 anos ou mais perde nome, e-mail, telefone e mensagem (`purged_at`), idempotente; resposta e log `cron.daily` com `purgedLeads`; contrato da 006d atualizado.

# 2026-11-16 · 007/T013
- [1b]: `ContactForm` abaixo do card da loja (mensagem padrão, honeypot, privacidade, "Mensagem enviada…"); `ViewPing` conta a visualização depois da hidratação; `CatalogVisit` em `/loja/{slug}` marca a aba; `browserStorage` com queda silenciosa; a marca de origem usa o slug da loja.

# 2026-11-16 · 007/T014
- `WhatsappButton` na barra de [1b] e em "Enviar simulação à loja" [14b]: link comum em outra aba; `onWhatsappTap` registra no máximo um lead por aparelho e veículo a cada 24 h, sem esperar e sem lançar.

# 2026-11-16 · 007/T015
- Menu do painel do lojista (`AREA_NAV.painel`): Veículos · Leads · Minha loja · Conta, cada item com a permissão da tela (usuário da loja vê Veículos e Leads); `app/painel/layout.tsx` passa `navCounts` com os leads novos, sem cache.

# 2026-11-16 · 007/T016
- `/painel/leads` [3a]: indicadores (Novos, % da vitrine em 30 dias), filtros com contagem (`?status=`), card com sigla, tempo relativo, veículo · preço, selos, mensagem, WhatsApp, Ligar, "→ próximo status" e "Perdido" no menu; card "Contato pelo WhatsApp"; destaque de Novo > 24 h; veículo excluído sem link. `relativeTime` em `platform/br`.

# 2026-11-16 · 007/T017
- Bloco "Desempenho do anúncio" em `/painel/veiculos/[id]` [6e]: Visualizações, Leads e Dias no ar. Os dias saem da linha de selos para o bloco; `vehiclePerformance` devolve só visualizações e leads; e2e da 005 lê o número no bloco.

# 2026-11-16 · 007/T018
- e2e `tests/e2e/leads.spec.ts` (390 e 1280 px): formulário com erros e envio via CajuGo, WhatsApp pelo catálogo (dois toques, um lead Seu catálogo), tela Leads (indicadores, destaque, filtro, avançar, Perdido, veículo excluído, contador), vitrine sem o contato. Seed `leads/testing/e2e-seed.ts` na loja da vitrine. Selo de contador também nos itens da barra do celular. Link do veículo no card com 44 px. LCP de [1b] no build de produção: 1,86 s, CLS 0,001.

# 2026-11-16 · 007/verify ajustes da revisão
- Lead idempotente (`requestId` uuid v7 da tela vira o id, `on conflict do nothing`); `uuidv7` com Web Crypto; lista de robôs sem CUBOT nem navegador de app; WhatsApp do card só para celular; `isHoneypotFilledIn` (leads e alertas); filtros de [3a] em `status.ts`; `newLeadsCount` devolve 0 sem permissão; exceção de tela showcase → leads no ARCHITECTURE §3; API.md e plano atualizados.

# 2026-11-16 · 007/T019 fechamento
- Spec 007 `implemented`: rastreabilidade verde (24 requisitos com teste), revisão em dois eixos corrigida, migration 0016 no prod. PLAN e T019 marcados.

# 2026-11-16 · 007b/T001 documentos
- Spec, plano e tasks da 007b; PRD §5.12 e [1b] (oculto abre como veículo do catálogo, noindex). ARCHITECTURE §3 (platform/browser) e §4 (vehicle_reports, marca de moderação em vehicles), API.md §5, SECURITY §8, GLOSSARY (Ocultar, Mostrar de novo, status da denúncia).

# 2026-11-16 · 007b/T002 migration 0017
- Migration aditiva 0017_reports: enums report_reason e report_status, tabela vehicle_reports (id da tela, FK cascade, índice parcial das abertas, RLS), marca de moderação em vehicles (hidden_reason, hidden_note, hidden_at, hidden_by), notice_kind + vehicle_hidden/vehicle_shown. Aplicada no staging.

# 2026-11-16 · 007b/T003 marcas no aparelho
- src/platform/browser/marks.ts: claimOncePer, readMark/writeMark, browserStorage. leads/device.ts usa claimOncePer para o WhatsApp; componentes de leads importam browserStorage da plataforma.

# 2026-11-16 · 007b/T004 motivos e schemas
- Domínio moderation: reasons.ts (4 motivos da denúncia, 5 do Ocultar, rótulos) e schemas.ts (reportSchema strict com requestId v7 e descrição ≤ 1.000 sem 'Outro'; hideSchema com nota obrigatória no 'Outro' até 200; vehicleDecisionSchema).

# 2026-11-16 · 007b/T005 denunciar anúncio
- moderation/service.ts reportVehicle e actions.ts reportVehicleAction: limite 5/min e 30/dia por hash do IP, honeypot com sucesso falso, requestId como id (on conflict do nothing), veículo visível ao público, sem autor nem IP. withinPublicFormLimits em platform/http/rate-limit (leads, alertas e denúncia).

# 2026-11-16 · 007b/T006 fila de denúncias
- reportQueue (admin.moderate; um card por anúncio publicado com denúncia aberta, da mais antiga; contagem por motivo, descrições, card público via favoriteCards) e openReportsCount (0 sem permissão). Fixture moderation/testing/fixtures.ts.

# 2026-11-16 · 007b/T007 Manter
- keep (admin.moderate): denúncias abertas do anúncio viram kept com quem e quando, numa transação com o activity_log (vehicle_reports.kept, só a contagem). keepReportsAction.

# 2026-11-16 · 007b/T008 veículo oculto
- vehicles: hideVehicle (published → hidden com a marca) e showVehicle (hidden → published, limpa a marca), só admin.moderate. Vender, despublicar e excluir aceitam hidden; publicar e desfazer a venda voltam a hidden enquanto há marca; divulgar e editar o oculto → 409.

# 2026-11-16 · 007b/T009 visibilidade do oculto
- publicVisible: vitrine e descoberta só publicados e divulgados; catálogo e veículos escolhidos aceitam hidden. vehiclePage abre o oculto como do catálogo (shared false) com indexable false → noindex em /v; gateDecision 200; contactTarget dá shared false ao oculto (lead Seu catálogo). Sitemap segue só published.

# 2026-11-16 · 007b/T010 avisos à loja
- notices: tipos vehicle_hidden (nome do veículo e motivo em texto, tom de alerta) e vehicle_shown; notifyStore avisa só o dono e os usuários da loja.

# 2026-11-16 · 007b/T011 Ocultar
- moderation.hide numa transação: hideVehicle, denúncias abertas → hidden, notifyStore com o motivo em texto (hiddenReasonText), activity_log vehicle.hidden com motivo e nota. hideVehicleAction com updateTag(VEHICLES_TAG). closeOpenReports compartilhado com Manter.

# 2026-11-16 · 007b/T012 Ocultados e Mostrar de novo
- moderation.hiddenList (ocultos do mais recente, motivo em texto) e show (showVehicle, aviso vehicle_shown, activity_log vehicle.shown) + showVehicleAction com updateTag. cardsOf compartilhado entre a fila e a aba. Aviso usa marca e modelo (Fiat Argo).

# 2026-11-16 · 007b/T013 leitura do lojista
- listVehicles e vehicleSummary trazem moderation (motivo e nota da CajuGo) e nada das denúncias; o filtro e o indicador Publicados contam também o oculto; canSell no oculto, canShare não.

# 2026-11-16 · 007b/T014 Denunciar anúncio em [1b]
- moderation/components/report-sheet.tsx: ReportTrigger e ReportSheet (<dialog> por Invoker Commands, 4 motivos, descrição até 1.000, honeypot, chave do envio, uma vez a cada 24 h por aparelho com claimOncePer). ui/dialog.ts com os helpers do diálogo, usado também pelo simulador. Exceção de tela showcase → moderation no ARCHITECTURE §3.

# 2026-11-16 · 007b/T015 menu Denúncias
- Item Denúncias (/admin/denuncias, admin.moderate) no menu do admin, fora da barra do celular (gaveta Mais); contador openReportsCount no navCounts do layout do admin, sem cache.

# 2026-11-16 · 007b/T016 tela Denúncias
- /admin/denuncias (admin.moderate; Sem permissão para os demais) com ReportQueue: card com foto, nome e link do anúncio, loja, preço, N denúncias, contagem por motivo, descrições e Manter. DecisionButton genérico das decisões; ModeratedVehicle.

# 2026-11-16 · 007b/T017 folha Ocultar
- moderation/components/hide-sheet.tsx: Ocultar abre a ConfirmSheet 'Ocultar veículo' com os 5 motivos, texto no Outro (até 200) e o efeito; sem motivo não confirma ('Escolha um motivo.'). No card da fila ao lado de Manter.

# 2026-11-16 · 007b/T018 aba Ocultados
- /admin/denuncias ganha as abas Denúncias e Ocultados (?aba=ocultados): HiddenList com o motivo, quando foi ocultado e Mostrar de novo (ShowButton).

# 2026-11-16 · 007b/T019 painel do lojista
- [1c]: selo Oculto e o motivo, sem Divulgar, 'Ver' no lugar de Editar; [6e]: 'Veículo oculto', aviso com o motivo e 'Para revisar, fale com a CajuGo', sem seções nem Divulgar; vender, despublicar e excluir continuam. Legenda 'Oculto da vitrine pela CajuGo'. O aviso no painel vem dos notices.

# 2026-11-16 · 007b/T020 e2e de denúncias
- Seed: BMW X1 V1 da vitrine com id fixo (reportedId) e uma denúncia aberta (moderation/testing/e2e-seed.ts). tests/e2e/moderation.spec.ts: denunciar (sem motivo, repetida no mesmo aparelho), fila com contagens e contador no menu (390 e 1280 px), Manter, lojista sem permissão, Ocultar (noindex, fora do sitemap, aviso e [6e] da loja) e Mostrar de novo. Suíte completa: 91 passaram.

# 2026-11-16 · 007b/T021 LCP/CLS de [1b]
- e2e de produção: [1b] com Denunciar anúncio no LCP (1,97 s, CLS 0,001) e o diálogo de denúncia no HTML em cache, aberto por Invoker Commands. 15 passaram.

# 2026-11-16 · 007b migration 0017 no prod
- Migration 0017_reports aplicada no Supabase de produção com autorização do dono; conferido: tabela vehicle_reports, 4 colunas de moderação em vehicles e os avisos vehicle_hidden/vehicle_shown.

# 2026-11-16 · 007b/verify ajustes e fechamento
- Denúncia marca o aparelho só depois do envio aceito. Cards da equipe lidos direto (loja suspensa na fila, no contador e em Ocultados). Ocultados lista todo veículo com a marca; Mostrar de novo tira a marca e só republica o oculto; [6e] mostra o motivo sempre que há marca. canSell no resumo, shortTitle único, updateTag só quando muda. Spec 007b implemented, PLAN e T022 marcados.

# 2026-11-16 · 008/T001 documentos
- Spec, plano, contrato e tasks da 008; PRD §5.7, [7a], [7c] e §12.1 item 4; PLAN com a 008b. ARCHITECTURE §4 (sellers, partnerships, cliques, CPF/Pix em profiles, comissão em stores, leads.seller_id), API.md §5, SECURITY §8 (foto do documento), GLOSSARY (Código do vendedor, Curadoria, Status do vendedor).

# 2026-11-16 · 008/T002 migration 0018
- Migration aditiva 0018_sellers: enums seller_status, partnership_status, partnership_origin, commission_type; lead_origin + seller; tabelas sellers, partnerships (única aberta por par) e seller_vehicle_clicks (RLS); profiles.cpf (único quando preenchido), pix_key, pix_key_type; stores.commission_*; leads.seller_id. LeadOrigin com seller. Aplicada no staging.

# 2026-11-16 · 008/T003 chave Pix na plataforma
- src/platform/pix/key.ts: PIX_TYPES, normalizePixKey, pixKeySchema (tipo + chave normalizada). settings/definitions.ts usa a mesma normalização na chave da CajuGo.

# 2026-11-16 · 008/T004 regras do vendedor
- sellers/schemas.ts (sellerSignupSchema e addSellerSchema strict, CPF válido, Pix pelo tipo), status.ts (rótulos e codeCandidates do código do vendedor), commission.ts (commissionFor em bps ou centavos).

# 2026-11-16 · 008/T005 cadastro do vendedor
- sellers/service.ts registerSeller (visitante): limite por rede, honeypot com sucesso falso, schema estrito, e-mail existente pede para entrar, CPF já cadastrado no campo; conta no Auth + perfil com CPF e Pix + papel seller + vendedor in_review + activity_log numa transação, com rollback da conta.

# 2026-11-16 · 008/T006 vendedor na mesma conta
- registerSeller com sessão: acrescenta o papel seller (grantRole), CPF e Pix à conta e cria o vendedor in_review, sem nova senha; conta já vendedora → 409, equipe → 403; CPF da própria conta não conta como repetido.

# 2026-11-16 · 008/T007 fotos do documento
- sellers: documentUpload (assinado, authenticated, pasta do vendedor, só em análise), attachDocument (nome assinado, foto/PDF até 10 MB, recusado apagado, anterior apagada), documentFile + GET /api/v1/sellers/[id]/document/[side] (admin, suporte e o próprio; outros 404). Permissão sellers.view. checkPrivateUpload e privateFileResponse na plataforma, usados também pelo comprovante da 004.

# 2026-11-16 · 008/T008 início do vendedor
- sellerHome: em análise (faltando foto ou não) e bloqueado (com motivo) mostram só o status; ativo mostra o código, os cliques do mês de São Paulo e as lojas Parceiro e Pendente. Fixtures seller/activeSeller.

# 2026-11-16 · 008/T009 curadoria
- sellersAdmin (sellers.view: admin e suporte; indicadores, em análise do mais antigo, ativos e bloqueados por nome, CPF completo). approve (sellers.review; exige as duas fotos, gera o código livre), block (motivo 3–200) e unblock, transição só a partir do status esperado, activity_log sem CPF nem Pix.

# 2026-11-16 · 008/T010 vitrine do vendedor
- sellerShowcase: searchShowcase da vitrine + loja de cada veículo, parceria do vendedor da sessão (partner/pending/none), earnCents só em parceira com comissão (commissionFor) e shareUrl com ?ref= em todo veículo. requestPartnership: só vendedor ativo, loja no ar, Pendente sem duplicar, devolve Parceiro se já é.

# 2026-11-16 · 008/T011 cliques do link
- recordSellerClick + sellerClickAction: soma em seller_vehicle_clicks por vendedor, veículo e dia de São Paulo; robô, código fora do formato ou de vendedor não ativo, veículo fora do ar e mais de 60/min da rede não contam. showcase exporta parseRefCode.

# 2026-11-16 · 008/T012 lead com vendedor
- sellerForLead (vendedor ativo e parceiro ativo da loja). insertLead grava seller_id e origem seller; contactLeadAction e whatsappClickAction leem o cookie cajugo_ref (REF_COOKIE agora em showcase/urls, usado pelo proxy). [3a] recebe sellerName (só o nome).

# 2026-11-16 · 008/T013 conta do vendedor
- sellerAccount (só vendedor ativo; CPF mascarado com maskTaxId, chave Pix) e updatePixKey (pixUpdateSchema pelo tipo; activity_log seller.pix_changed só com o tipo). Teste de que Pix e CPF não saem na vitrine do vendedor, no lead nem na página do veículo.

# 2026-11-16 · 008/T014 telas de cadastro
- /rede/cadastro (SellerSignupForm; conectado só CPF, cidade e Pix; 'Entrar e continuar' para e-mail existente; 'Entrar' para CPF já cadastrado) e /rede/cadastro/documento (DocumentForm: frente e verso direto ao Cloudinary privado). registerSellerAction entra e segue para as fotos; actions de upload e anexo; sellerDocuments.

# 2026-11-16 · 008/T015 área do vendedor
- AREA_NAV.rede (Início · Vitrine · Extrato · Conta, todos na barra do celular). /rede com SellerHome (status em análise com 'Enviar documento' se faltar, bloqueado com motivo, ou painel com cliques do mês, código e lojas). /rede/extrato com o aviso até a 008b.

# 2026-11-16 · 008/T016 vitrine do vendedor
- /rede/vitrine: barra de busca e filtros da vitrine (CatalogToolbar), SellerShowcaseList com 'Você ganha R$ X' na parceira, Copiar link e WhatsApp em todos, Pedir parceria e 'aguardando a loja', Carregar mais. Actions requestPartnershipAction e loadMoreSellerShowcaseAction; whatsappShareLink; showcase exporta filtersFromQuery.

# 2026-11-16 · 008/T017 conta do vendedor
- /rede/conta [13c]: dados com CPF mascarado e código, chave Pix com Trocar (PixKeyForm + updatePixKeyAction), avisos 'em breve', links (lojas, Caju Indica, termos) e Sair; só vendedor ativo. PIX_TYPE_OPTIONS num lugar só.

# 2026-11-16 · 008/T018 tela de vendedores do admin
- /admin/vendedores [7h] (sellers.view): indicadores, em análise primeiro com links para frente e verso do documento, ativos e bloqueados (com motivo); Aprovar (desabilitado sem as fotos), Bloquear com motivo na ConfirmSheet e Desbloquear só para quem tem sellers.review. formatBrPhone na plataforma.

# 2026-11-16 · 008/T019 clique e selo do vendedor
- SellerClickPing na página do veículo (lê ?ref=, marca o aparelho por 24 h por vendedor e veículo, chama sellerClickAction; a página segue em cache). [3a]: selo 'via vendedor {nome}' no lead de origem seller.

# 2026-11-16 · 008/T019 clique e selo do vendedor
- SellerClickPing na página do veículo (lê ?ref=, marca o aparelho por 24 h por vendedor e veículo, chama sellerClickAction; a página segue em cache). [3a]: selo 'via vendedor {nome}' no lead de origem seller. Teste da curadoria confere o CPF e a chave Pix reais em vez de um padrão de dígitos (instável).

# 2026-11-16 · 008/T020 e2e da Rede Caju
- Seed: removeSellersForTests (contas de teste e cadastros e2e, com as fotos) e seedSellers (conta sellerReferrer como vendedor ativo E2EVENDE, parceiro da loja da vitrine com comissão de 2%). tests/e2e/sellers.spec.ts: cadastro com fotos, admin abre documento/aprova/bloqueia/desbloqueia, suporte só vê, vitrine com Você ganha e link, pedir parceria, link → clique → lead via vendedor, conta, desktop. Formulário de cadastro envia sem reset (select da chave Pix) e manda campo vazio. Suíte: 97 passaram.

# 2026-11-16 · 008/T021 LCP pelo link do vendedor
- e2e de produção: página do veículo aberta com ?ref= no LCP (1,96 s, CLS 0,001). 16 passaram.

# 2026-11-16 · 008 migration 0018 no prod
- Migration 0018_sellers aplicada no Supabase de produção com autorização do dono; conferido: sellers, partnerships e seller_vehicle_clicks com RLS, 6 colunas novas (profiles, stores, leads) e lead_origin com seller.

# 2026-11-16 · 008/verify ajustes e fechamento
- Suporte vê o CPF mascarado em [7h] (formatTaxId só para o admin); conta que já tem CPF mantém o mesmo ao virar vendedor; schemas strict nas actions das fotos e do Carregar mais; [13c] com links do próprio documento e Trocar senha; colunas da foto e estado da parceria num lugar só; exceção de tela da página do veículo no ARCHITECTURE §3. Spec 008 implemented, PLAN e T022 marcados.

# 2026-11-16 · 009/T001 documentos
- Spec, plano e tasks da 009. ARCHITECTURE §4 (accepts_sellers desligado, ajuste e sale_id em vehicles, sales com taxa guardada e canceled_at), API.md §5 (actions de [7e], [7f], [7g]; convite, avaliação e denúncia na 009b), GLOSSARY (Parceria que vale, Status da comissão).

# 2026-11-16 · 009/T002 migration 0019
- Migration aditiva 0019_store_network: stores.accepts_sellers (padrão false), vehicles.commission_override_* e sale_id, enums sale_attribution e commission_status, tabela sales (uma ativa por veículo, índices por loja e por vendedor, RLS). Aplicada no staging.

# 2026-11-16 · 009/T003 regras da venda
- sellers/schemas: networkRulesSchema e commissionOverrideSchema (até 10% ou R$ 10.000, nulo remove), partnershipDecisionSchema, confirmSaleSchema (strict, só o valor final como número) e saleTermsSchema; commission.feeFor (bps sobre o valor final).

# 2026-11-16 · 009/T004 parceria que vale
- effectivePartner (vendedor ativo, parceria ativa, loja aceitando vendedores) em sellerForLead; sellerShowcase devolve closed sem 'Você ganha' para loja que não aceita; requestPartnership recusa (409); vitrine do vendedor mostra 'Esta loja não aceita vendedores' desabilitado. Testes da 008 e seed do e2e com a loja aceitando vendedores (fixture acceptSellers).

# 2026-11-16 · 009/T005 Rede Caju da loja
- storeNetwork (sellers.manage, só o lojista): aceita vendedores, comissão padrão, ajustes por veículo, pedidos pendentes de vendedor ativo do mais antigo, parceiros com celular, Pix, vendas e selo de bloqueado, sem CPF. setNetworkRules grava as regras com activity_log.

# 2026-11-16 · 009/T006 decisões de parceria
- decidePartnership (só o lojista): aprovar pending→active, recusar pending→declined (libera pedido novo), encerrar active→ended com ended_at; outra loja → 404, status inesperado → 409; activity_log partnership.approved/declined/ended.

# 2026-11-16 · 009/T007 ajuste por veículo
- sellers.setVehicleCommission (só o lojista, limites da comissão, activity_log) grava pelo vehicles.writeCommissionOverride (só na loja dada; outra → 404). sellerShowcase usa o ajuste no lugar da padrão (ruleOf); storeNetwork lista os ajustes.

# 2026-11-16 · 009/T008 cálculo da venda
- saleTerms (sales.confirm: lojista e usuário da loja): comissão (ajuste ou padrão) e taxa CajuGo (cajugo_fee_bps) sobre o valor final, só para parceiro que vale; vendedor sugerido pelo lead mais recente com parceria que vale; lista de parceiros. effectivePartner reaproveita effectivePartners.

# 2026-11-16 · 009/T009 confirmar venda
- confirmSale (sales.confirm): vendedor do link = sugerido, outro parceiro = parceiro que vale (senão 422 no sellerId), venda da loja sem comissão nem taxa; numa transação grava a venda (comissão A receber ou Paga, fee_bps e fee_cents guardados) e vehicles.sellInTx (sold com sale_id, divulgação guardada); repetir → 409; activity_log sale.confirmed.

# 2026-11-16 · 009/T010 desfazer venda
- undoSale (sales.confirm): comissão paga → 409 com a mensagem do PRD; senão cancela a venda (canceled_at) e vehicles.reopenInTx reabre como estava (7 dias, tira o sale_id); activity_log sale.canceled. vehicles.undoSold recusa com sale_id (blocked na transição). saleOf para [6e].

# 2026-11-16 · 009/T011 resumo da Rede Caju
- networkSummary (só o lojista): se a loja aceita vendedores e quantos pedidos de vendedor ativo esperam, para o bloco Rede Caju da Conta.

# 2026-11-16 · 009/T012 tela de comissão
- /painel/rede/comissao [7e] (só o lojista): CommissionForm (Aceitar vendedores, tipo e valor com a prévia de comissão e taxa num carro de R$ 60.000, informativo da taxa) e VehicleOverrides (ajustes com Remover, adicionar por veículo). Actions setNetworkRulesAction e setCommissionOverrideAction; commissionFromText/ToText; storeNetwork traz feeBps e os veículos no ar.

# 2026-11-16 · 009/T013 tela de vendedores
- /painel/rede/vendedores [7f] (só o lojista): PartnersView com pedidos (Aprovar, Recusar) e parceiros (celular, Pix, vendas, selo Bloqueado pela CajuGo, Encerrar parceria com confirmação); aviso quando a loja não aceita vendedores. decidePartnershipAction.

# 2026-11-16 · 009/T014 bloco Rede Caju na Conta
- /painel/conta ganha o NetworkBlock (aceita vendedores?, Comissão e Vendedores com o número de pedidos pendentes); o resto da Conta segue provisório até a 011.

# 2026-11-16 · 009/T015 Confirmar venda
- ConfirmSaleButton [7g] (valor final, quem vendeu com o sugerido, outro parceiro ou a loja, comissão e taxa do servidor ao vivo, Já paguei) e UndoSaleButton; actions saleTermsAction, confirmSaleAction e undoSaleAction (updateTag). VehicleActions com os slots sellAction e undoAction (D2); [6e] monta a venda com storeAcceptsSellers, saleOf e saleTerms e abre com ?vender=1; em [1c], Vendido leva a [6e] quando a loja aceita vendedores.

# 2026-11-16 · deps: next 16.4.6
- next e eslint-config-next de 16.4.2 para 16.4.6 (pnpm). pnpm audit sem vulnerabilidades; pnpm check e e2e do build de produção verdes.

# 2026-11-16 · 009 migration 0019 no prod
- Migration 0019_store_network aplicada no Supabase de produção com autorização do dono; conferido: tabela sales com RLS, stores.accepts_sellers e as 3 colunas novas de vehicles.

# 2026-11-16 · 009/T016 e2e da Rede Caju do lojista
- Seed: Citroën C3 V2 com id fixo (saleTestId), segundo vendedor ativo (conta temporary, E2ETADEU) com pedido pendente na loja da vitrine, loja de Recife aceitando vendedores; limpeza apaga as vendas dos vendedores de teste. tests/e2e/store-network.spec.ts: Conta → Comissão com prévia, desligar/religar Aceitar vendedores, aprovar e encerrar parceria, lead pelo link → Confirmar venda com o sugerido → vendido na hora → desfazer, usuário da loja sem permissão, 1280 px. Suíte: 96 passaram, 3 falharam por login instável na rodada longa e passaram isoladas.

# 2026-11-16 · 009/verify ajustes e fechamento
- markSold recusa com a loja aceitando vendedores (stores.storeAcceptsSellers); confirmSale confere parceria e vendedor sugerido dentro da transação (suggestedSeller) e sem recalcular por saleTerms; comissão sem regra = R$ 0 na tela e na venda; parceiro bloqueado sem celular nem Pix em [7f]; bloco Rede Caju da Conta só com sellers.manage; e2e da 009 independente da chave Pix trocada pela 008. Spec 009 implemented, PLAN e T017 marcados.

# 2026-11-23 · 011 · spec, plano, tasks e documentos [011/T001]
- Spec 011 (fatura mensal, atraso e suspensão) clarificada, plano aprovado e tasks; PRD §5.1/§5.6, PLAN (011b), ARCHITECTURE (billing_credits, ciclo no job diário), API.md, contrato do cron e GLOSSARY.

# 2026-11-23 · Migration 0020 do ciclo de cobrança [011/T002]
- billing_credits (crédito da loja), stores.past_due_since, avisos invoice_due/store_suspended/store_reactivated e índice invoices_open_due; aditiva.

# 2026-11-23 · Contas da fatura mensal [011/T003]
- invoice-math.ts: total (mensalidade + taxas − créditos até o subtotal), quitação da mais antiga e MRR, com testes unitários.

# 2026-11-23 · Datas do ciclo de cobrança [011/T004]
- cycle-dates.ts: abertura 3 dias antes, vencendo, atraso no dia seguinte, dias de atraso e suspensão após a tolerância, pelo dia em São Paulo.

# 2026-11-23 · Abertura da fatura mensal [011/T005]
- runBillingCycle abre a fatura 3 dias antes (mensalidade, taxas não faturadas, créditos até o total), liga as vendas, avança next_due_at, avisa o lojista e registra; idempotente.

# 2026-11-23 · Atraso e suspensão no job diário [011/T006]
- Loja ativa com fatura vencida → em atraso desde o dia seguinte; após a tolerância → suspensa, com aviso ao lojista e aos admins; cron devolve opened/pastDue/suspended e invalida o cache público ao suspender.

# 2026-11-23 · Taxa de venda desfeita [011/T007]
- billing.refundSaleFee na transação de sellers.undoSale: sem fatura nada; fatura aberta tira a taxa e recalcula; fatura paga vira crédito fee_refund.

# 2026-11-23 · Fatura e Conta do lojista [011/T008]
- invoiceView (faturas abertas da mais antiga, taxas por veículo, total em aberto) e accountView (plano, status, próxima cobrança, Como pagar, fatura do mês e anteriores); só o dono.

# 2026-11-23 · Comprovante da fatura mensal [011/T009]
- pixView/receiptUpload/submitReceipt cobram o total das faturas mensais abertas (pagamento ligado à mais antiga); a loja não muda de status ao enviar nem ao ser recusada; fila mostra 'Mensalidade mm/aaaa' com o total esperado.

# 2026-11-23 · Confirmação da fatura mensal [011/T010]
- confirmPayment quita as faturas mensais da mais antiga, sobra vira crédito, valor menor que a mais antiga → 422; sem fatura vencida, em atraso/suspensa → ativa, com avisos e registro.

# 2026-11-23 · Assinaturas do admin, serviço [011/T011]
- subscriptionsView: MRR, contagens, plano, filtros, linha por status (em dia, atraso, em análise, suspensa), wa.me de cobrança e 'Vencem em 3 dias'; permissão subscriptions.view (admin e suporte).

# 2026-11-23 · Suspender e reativar pelo admin [011/T012]
- suspendStore (só em atraso) e reactivateStore (só suspensa, motivo 3–200; volta em atraso com a tolerância contada de novo, ou ativa sem fatura vencida), com avisos, registro e as actions com updateTag.

# 2026-11-23 · Painel da loja suspensa [011/T013]
- Testes de que a loja em atraso ou suspensa abre o painel inteiro (fatura, pagamento, edição) e edita veículo; o store-access já liberava (D5).

# 2026-11-23 · Alerta da fatura no painel [011/T014]
- billingAlert + BillingAlertBanner: vence em 3 dias, em atraso há N dias e loja suspensa [12f], com Pagar agora; AreaLayout ganha o slot banner (a rota do painel monta), no lugar do aviso fixo de suspensa.

# 2026-11-23 · Fatura do mês e Pix da mensal [011/T015]
- /painel/fatura [10c] com as faturas abertas, total a pagar e Pagar com Pix; /painel/fatura/pix [6c] com o total em aberto; PixPayment compartilhado com o Pix da 1ª mensalidade.

# 2026-11-23 · Conta do lojista [011/T016]
- /painel/conta [3c] completa: Plano Catálogo, status, valor, próxima cobrança, Como pagar (chave Pix e WhatsApp), fatura do mês, faturas anteriores e o bloco Rede Caju.

# 2026-11-23 · Assinaturas do admin, tela [011/T017]
- /admin/assinaturas [4b]: MRR, contagens, plano, Vencem em 3 dias, filtros na URL e cards por status com wa.me, Conferir, Suspender (ConfirmSheet) e Reativar (motivo); suporte sem os botões.

# 2026-11-23 · e2e do ciclo de cobrança [011/T018]
- Conta e loja 'Fatura E2E' no seed, suspensa pelo runBillingCycle real (restrito à loja); billing-cycle.spec: alerta [12f], edição, [10c], [6c], [3c], [12g] sem dados, [4b] suporte/admin, Reativar/Suspender, comprovante e confirmação.

# 2026-11-23 · Fechamento da 011 [011/verify]
- Ajustes do /verify (comprovante em conferência segura o job, recusa na [10c], próxima cobrança da Conta, taxa que zera a fatura reativa, totalOf, suspended_staff); spec implemented, PLAN; migration 0020 aplicada e conferida no prod.

# 2026-11-23 · 008b · spec, plano, tasks e documentos [008b/T001]
- Spec 008b (extrato do vendedor) clarificada, plano aprovado e tasks; PRD §5.7/§5.13/[7d]/§9, ARCHITECTURE (sales.commission_received_at), API.md e GLOSSARY.

# 2026-11-23 · Migration 0021 do extrato [008b/T002]
- sales.commission_received_at e avisos sale_confirmed, commission_received, commission_unreceived; só acrescenta.

# 2026-11-23 · Permissão e avisos do extrato [008b/T003]
- commission.receive (só seller) e avisos sale_confirmed (vendedor), commission_received/unreceived (loja), com as frases.

# 2026-11-23 · Extrato do vendedor, serviço [008b/T004]
- sellerStatement: vendas do vendedor sem as desfeitas, com veículo, loja, data, valor final, comissão e status; filtros com contagens, cursor de 20, sem dados do comprador; bloqueado continua vendo.

# 2026-11-23 · Recebi da comissão [008b/T005]
- setCommissionReceived: só o vendedor da venda (o bloqueado também, D2) passa A receber → Paga com a data; repetir não muda; aviso à loja (dono e usuários) e registro; vendedor B → 404, outros papéis → 403.

# 2026-11-23 · Desfazer o Recebi [008b/T006]
- Desfazer em até 24 h volta a A receber; depois 409 'fale com a CajuGo'; comissão marcada paga pela loja não desfaz; aviso à loja e registro; canUndoUntil no extrato.

# 2026-11-23 · Painel do vendedor com vendas [008b/T007]
- sellerHome traz a receber, vendas do mês (São Paulo) e as 5 últimas, sem as desfeitas; confirmSale avisa o vendedor (veículo, loja, comissão).

# 2026-11-23 · Tela do extrato [008b/T008]
- /rede/extrato [7d]: filtros na URL com contagens, cards (veículo, loja, data, valor final, comissão, status), Recebi com confirmação, Desfazer com o prazo, Carregar mais vendas, estado vazio.

# 2026-11-23 · Painel do vendedor [008b/T009]
- [7b] com a receber, vendas do mês, cliques, código, últimas vendas e Ver extrato; bloqueado ganha o link do extrato.

# 2026-11-23 · e2e do extrato [008b/T010]
- Seed com duas vendas da E2EVENDE (BMW X1 paga pela loja, Citroën C3 a receber); seller-statement.spec: [7b] com KPIs, [7d] com filtro, Recebi e Desfazer, aviso à loja, 390 e 1280 px; migration 0021 no staging.

# 2026-11-23 · Fechamento da 008b [008b/verify]
- Rastreabilidade verde (16 requisitos com teste), spec implemented, PLAN; ajustes do /implement no plano.

# 2026-11-23 · 010 · spec, plano, tasks e documentos [010/T001]
- Spec 010 (Caju Indica: indicação, recompensa e saldo) clarificada, plano aprovado e tasks; PRD §5.8/[8c], PLAN (010b), ARCHITECTURE (referral_rewards), API.md e GLOSSARY.

# 2026-11-23 · Migration 0022 do Caju Indica [010/T002]
- referral_rewards (uma por fatura), enum reward_target, avisos referral_active e referral_reward; só acrescenta.

# 2026-11-23 · Avisos e área do Caju Indica [010/T003]
- Avisos referral_active e referral_reward (crédito ou saldo); área /indica aberta também ao vendedor.

# 2026-11-23 · Recompensa do Caju Indica [010/T004]
- rewardPaidInvoices: cada fatura paga da loja indicada entre as N primeiras (pela ordem de vencimento) rende uma vez o percentual vigente; não válida e campanha não rendem; ativa/encerrada, aviso e registro; devolve o crédito do lojista.

# 2026-11-24 · Caju Indica na cobrança [010/T005]
- rewardReferrals onde a fatura vira paga (1ª confirmada ou registrada, mensais quitadas, nasce paga com crédito, zerada por taxa desfeita); crédito referral do lojista lançado no billing_credits e abatido na fatura seguinte.

# 2026-11-24 · Regras do programa nos códigos [010/T006]
- canRefer (programa ativo e algum papel em 'quem pode indicar'); checkCode recusa o código fora das regras; as indicações existentes continuam rendendo.
