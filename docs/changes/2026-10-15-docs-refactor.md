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
