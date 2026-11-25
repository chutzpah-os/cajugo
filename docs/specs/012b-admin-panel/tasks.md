---
spec: 012b
---

# Tasks · 012b Admin · painel, lojas, usuários e detalhe da loja

Fatias verticais (`SDD.md` §7, skill `tdd`): cada task de comportamento é um ciclo teste falhando → código → verde, com o ID do requisito no nome do teste. Toda ação com id tem o caso "outra loja / id inexistente" e o do suporte (sem decidir). As telas seguem as capturas [4a], [1d], [6g], [4c] e [15c] (base visual da 012).

Decisões D1–D5 do plano aprovadas em 2026-11-24.

## Fase 1 — Fundação
- [x] **T001** Documentos e permissões:
  - ARCHITECTURE §3 (domínio `admin`, só leitura);
  - API.md §5 (rotas e actions);
  - GLOSSARY (Equipe CajuGo);
  - permissões `admin.view` (admin e suporte), `stores.manage` e `team.manage` (só admin), com teste.

  · _ADM-SEC-001, ADM-SEC-002_
- [x] **T002** Migration `0024` (índices de `activity_log`), teste de schema e a migration no staging. · _—_

## Fase 2 — Servidor
- [ ] **T003** `adminDashboard`: KPIs com a variação, "Precisa de atenção" (só com pendência), origem dos leads e top lojas, a partir dos serviços dos outros domínios. · _ADM-FR-001, ADM-FR-002, ADM-FR-003, ADM-NFR-002_
- [ ] **T004** `storesAdmin`: busca, filtros por situação, 20 por vez, KPIs. Lojista e visitante recusados. · _ADM-FR-004, ADM-NFR-003, ADM-SEC-001_
- [ ] **T005** `usersAdmin`: busca por nome ou e-mail, selos de papel, destino de cada conta. · _ADM-FR-007_
- [ ] **T006** `storeDetail` + `billing.storeBilling`:
  - cabeçalho, KPIs, Dono, Assinatura, Rede Caju e Veículos;
  - CPF/CNPJ mascarado ao suporte;
  - id inválido → 404.

  · _ADM-FR-008, ADM-SEC-004, ADM-SEC-005_
- [ ] **T007** `createStoreByAdmin`: loja cadastrada, conta do dono com a senha temporária devolvida uma vez, e-mail repetido → 422, registro sem a senha, suporte → 403. · _ADM-FR-005, ADM-SEC-002, ADM-SEC-003_
- [ ] **T008** `updateStoreByAdmin`: as validações de Minha loja, sem endereço nem dono, posse conferida e registro. · _ADM-FR-010, ADM-SEC-002_
- [ ] **T009** `storeHistory` e `activityLogView`: do mais recente ao mais antigo, filtros por tipo e período, 20 por vez, só a loja pedida. · _ADM-FR-011, ADM-FR-015, ADM-SEC-005_
- [ ] **T010** Equipe:
  - `teamView` e `inviteTeamMember` (senha uma vez);
  - `removeTeamMember` (encerra sessões; não remove a si mesmo nem o último admin);
  - suporte → 403.

  · _ADM-FR-012, ADM-SEC-002, ADM-SEC-003_
- [ ] **T011** Veículos CajuGo: na vitrine, com os filtros Denunciados e Aguardando aprovação. · _ADM-FR-006_

## Fase 3 — Telas
- [ ] **T012** Painel [4a] no celular e Visão geral [15c] no desktop, com as filas inline de comprovantes e aprovação. · _ADM-FR-001, ADM-FR-002, ADM-FR-003, ADM-FR-013, ADM-NFR-001_
- [ ] **T013** Lojas [1d] com as abas Lojas, Veículos CajuGo e Usuários. · _ADM-FR-004, ADM-FR-006, ADM-FR-007, ADM-NFR-001_
- [ ] **T014** Nova loja, com a senha mostrada uma vez e **Copiar**. · _ADM-FR-005_
- [ ] **T015** Detalhe da loja [6g]:
  - cards e lista de ações;
  - Definir senha temporária;
  - Suspender e Reativar;
  - Editar dados (o histórico da loja fica no Log, T016).

  · _ADM-FR-008, ADM-FR-009, ADM-FR-010, ADM-FR-011_
- [ ] **T016** Conta admin [4c]:
  - Equipe CajuGo com Convidar e Remover;
  - Log no menu: histórico das regras (feito, 012), logs de atividade e histórico por loja;
  - menu "Mais";
  - sai a página provisória de senha temporária.

  · _ADM-FR-012, ADM-FR-014, ADM-FR-015_
- [ ] **T017** e2e do admin: painel, lojas, nova loja, detalhe, equipe e logs, suporte e lojista, em 390 e 1280 px com `audit()`. · _ADM-FR-001…015, ADM-SEC-001…005, ADM-NFR-001_

## Fase 4 — Fechamento
- [ ] **T018** Verificação: rastreabilidade, suíte e2e e revisão; status `implemented` e `docs/PLAN.md`. A migration `0024` no prod só com a sua autorização. · _—_
