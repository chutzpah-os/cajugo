---
spec: 002
---

# Tasks · 002 Regras configuráveis e troca de senha

Fatias verticais (`SDD.md` §7, skill `tdd`): cada task de comportamento é um ciclo teste falhando → código → verde. Testes com o ID do requisito no nome. Não há ação com id de loja nesta spec: as regras são da plataforma e a troca de senha é só da própria conta (o caso "outra conta" fica em CFG-SEC-006).

## Fase 1 — Fundação
- [x] **T001** Migration `0005`: tabela `setting_values` + índice `(key, valid_from desc)` + gatilho que recusa `UPDATE`/`DELETE` + carga dos valores provisórios; teste de migration (valores presentes, gatilho recusa) · _CFG-FR-003, CFG-SEC-003_
- [ ] **T002** `settings/definitions.ts`: as 14 regras com grupo, rótulo, unidade, schema zod com os limites aprovados (D2) e valor provisório; conversões % ↔ centésimos de ponto e R$ ↔ centavos; máscara da chave Pix; teste de que toda chave tem definição e bate com a carga da migration · _CFG-FR-004, CFG-FR-005_
- [ ] **T003** [P] `AuthProvider.verifyPassword(email, password)`: provedor falso (compara) e Supabase (cliente sem cookie, entra e encerra a sessão de conferência) · _—_

## Fase 2 — Fatias verticais (domínios `settings` e `auth`)
- [ ] **T004** `getSettings(db, at?)`: todas as regras tipadas, vigentes agora ou numa data · _CFG-FR-003, CFG-FR-009_
- [ ] **T005** `publicSettings` (sem `pix`) e `currentSettings()` com `'use cache'`, `cacheTag('settings')` e `cacheLife` de 1 min · _CFG-SEC-004, CFG-NFR-001_
- [ ] **T006** `updateSettings`: valida, grava só o que mudou numa transação, auditoria; admin grava, suporte e demais recusados · _CFG-FR-002, CFG-FR-004, CFG-SEC-001, CFG-SEC-002_
- [ ] **T007** `verifyOwnPassword` no domínio `auth`: confere a senha da conta da sessão com o bloqueio da spec 001 (falha conta por e-mail e por rede) · _CFG-SEC-005, CFG-SEC-006_
- [ ] **T008** `updateSettings` com chave Pix: exige senha (`verifyOwnPassword`); senha errada não grava e conta no bloqueio; auditoria sem o valor da chave · _CFG-FR-008, CFG-SEC-005, CFG-SEC-004_
- [ ] **T009** `settingHistory(db, session, key)`: de/para, quem e quando, do mais recente ao mais antigo; admin e suporte leem, demais recusados · _CFG-FR-006, CFG-SEC-001, CFG-SEC-002_
- [ ] **T010** `changePassword`: senha atual certa, validação (≥ 8, confirmação, diferente da atual), encerra os outros aparelhos, auditoria sem senha; senha atual errada conta no bloqueio; só a própria conta · _CFG-FR-010, CFG-SEC-006_
- [ ] **T011** `pnpm e2e:seed` volta as regras do staging aos valores provisórios (inserindo, já que a tabela é só de inserção) · _—_

## Fase 3 — Telas
- [ ] **T012** [P] `src/ui`: campos de porcentagem e de dinheiro (pt-BR) e aviso de "somente leitura", com testes · _CFG-NFR-002_
- [ ] **T013** [4c] `/admin/conta`: grupos Vitrine (nome e domínio só leitura, WhatsApp), Rede Caju, Pagamento, Aprovação prévia e Dados; "Salvar" por grupo só para admin; campos desabilitados para suporte; link "Alterar senha" · _CFG-FR-001, CFG-FR-002, CFG-FR-004, CFG-SEC-001, CFG-SEC-002_
- [ ] **T014** [4c] Chave Pix: bloco com a chave mascarada ou "não configurada" e o fluxo em 2 passos (nova chave → revisão lado a lado + senha) · _CFG-FR-003, CFG-FR-008, CFG-SEC-005_
- [ ] **T015** Histórico por regra na tela (link "Histórico" em cada regra) · _CFG-FR-006_
- [ ] **T016** [8f] `/admin/indica/regras`: programa ativo, quem pode indicar, recompensa, duração e resgate mínimo; link "Regras do programa" em `/admin/indica` · _CFG-FR-001, CFG-FR-002_
- [ ] **T017** `/conta/senha` (senha atual, nova, confirmação) para qualquer papel; `/conta` protegida no `proxy.ts` · _CFG-FR-010, CFG-SEC-006_
- [ ] **T018** `/recuperar` lê o WhatsApp das regras; `SUPPORT_WHATSAPP` sai do código, do `.env.example` e do DEPLOYMENT; avisar o dono para apagar na Vercel · _CFG-FR-007_

## Fase 4 — Ponta a ponta e fechamento
- [ ] **T019** Playwright (390 px, staging): admin altera uma regra e vê o valor e o histórico; suporte sem "Salvar"; lojista "Sem permissão"; troca de chave Pix com senha certa e errada; `/recuperar` com o número das regras; troca de senha; acessibilidade de `/admin/conta`, `/admin/indica/regras` e `/conta/senha` · _CFG-FR-001, CFG-FR-002, CFG-FR-006, CFG-FR-007, CFG-FR-008, CFG-FR-010, CFG-NFR-002, CFG-SEC-001, CFG-SEC-002_
- [ ] **T020** Aplicar a migration `0005` no staging e no prod e conferir os valores provisórios nos dois · _—_
- [ ] **T021** `/verify`: rastreabilidade verde; spec `implemented`; registrar em `docs/changes` e `docs/decisions` · _—_
