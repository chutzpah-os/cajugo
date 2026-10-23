---
spec: 001
---

# Tasks · 001 Contas, papéis e login

Fatias verticais (`SDD.md` §7, skill `tdd`): cada task de comportamento é um ciclo teste falhando → código → verde. Testes com o ID do requisito no nome.

## Fase 1 — Fundação
- [x] **T001** Dependências (`@supabase/ssr`, `@supabase/supabase-js`, `@playwright/test`), variáveis novas no `.env.example`, interface `AuthProvider` + provedor falso para testes · _—_
- [x] **T002** Migration `0002` (valores novos de `user_role`, `profiles.roles/last_panel/last_seen_at/temp_password_expires_at`, `store_status` + `stores.status`, cópia `role → roles`) com teste de migration · _AUT-SEC-002_
- [x] **T003** `Session` com `roles` + papel ativo; `authorize` por papel; mapa de áreas e ações por papel (lojista × usuário da loja; admin × suporte) · _AUT-FR-012, AUT-SEC-007, AUT-SEC-008_

## Fase 2 — Fatias verticais (domínio `auth`)
- [x] **T004** `landingFor`: painel por papel, último painel, ordem no primeiro acesso, status da loja; usuário da loja com loja indisponível · _AUT-FR-006, AUT-FR-008, AUT-FR-009, AUT-FR-010, AUT-FR-016_
- [x] **T005** [P] `safeNext`: volta só para caminho interno · _AUT-SEC-005, AUT-FR-011_
- [x] **T006** `signIn`: sucesso, erro genérico, senha temporária vencida · _AUT-FR-001, AUT-FR-002, AUT-FR-014, AUT-SEC-003_
- [x] **T007** Bloqueio no `signIn`: por e-mail (5 falhas / 15 min) e por rede · _AUT-FR-003_
- [x] **T008** `getSession`: inatividade (30 dias; equipe 1 dia), `last_seen_at` no máximo 1×/hora, flag de troca de senha · _AUT-FR-004, AUT-FR-015_
- [x] **T009** `signOut` e `switchPanel` (só papéis da conta; "usuário B") · _AUT-FR-005, AUT-FR-007, AUT-SEC-001, AUT-SEC-002_
- [x] **T010** `setTemporaryPassword`: só admin, 24 h, auditoria sem senha, suporte e lojista recusados · _AUT-FR-014, AUT-SEC-003, AUT-SEC-004, AUT-SEC-008_
- [x] **T011** `updatePassword`: ≥ 8 e confirmação, limpa a flag, encerra as outras sessões · _AUT-FR-015_
- [x] **T012** [P] Regra "cadastro público nunca dá papel de equipe" e "conta da equipe não acumula papéis" · _AUT-SEC-009_

## Fase 3 — Supabase real, proxy e telas
- [x] **T013** Cliente Supabase de servidor (cookies `HttpOnly`, `maxAge` 30 dias) implementando `AuthProvider`; `src/proxy.ts` com renovação deslizante e `/entrar?next=` · _AUT-FR-004, AUT-FR-011, AUT-SEC-006_
- [x] **T014** Tela `/entrar` [9f] só e-mail e senha: erros, bloqueio, rodapé de cadastros · _AUT-FR-001, AUT-FR-002, AUT-FR-003, AUT-NFR-002_
- [x] **T015** Telas `/recuperar` [6b] (botão `wa.me` com `SUPPORT_WHATSAPP`) e `/nova-senha` · _AUT-FR-013, AUT-FR-015_
- [ ] **T016** Layouts das áreas (`/painel`, `/rede`, `/indica`, `/admin`) com `<Suspense>`, páginas provisórias, "Sem permissão", troca de painel, alerta provisório de loja suspensa, sair · _AUT-FR-005 a AUT-FR-012, AUT-SEC-001, AUT-SEC-007, AUT-SEC-008_
- [ ] **T017** Tela provisória do admin "Senha temporária" (busca por e-mail) · _AUT-FR-014_
- [x] **T018** Script `pnpm admin:create <email>` (chave secreta, senha temporária) · _AUT-SEC-009_

## Fase 4 — Ponta a ponta e fechamento
- [ ] **T019** Playwright (viewport 390 px) contra o staging: login → painel; visitante → página protegida → login → volta; indicador → `/admin` = sem permissão; senha temporária → nova senha; tempo de login · _AUT-FR-001, AUT-FR-011, AUT-FR-012, AUT-FR-015, AUT-NFR-001_
- [ ] **T020** Migration `0003`: remove `profiles.role` (nenhum código lê mais) · _—_
- [ ] **T021** `/verify`: rastreabilidade verde; spec `implemented`; registrar em `docs/changes` e `docs/decisions` · _—_
