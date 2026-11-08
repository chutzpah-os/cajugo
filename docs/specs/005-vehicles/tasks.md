---
spec: 005
---

# Tasks · 005 Veículos do lojista

Fatias verticais (`SDD.md` §7, skill `tdd`): cada task de comportamento é um ciclo teste falhando → código → verde. Testes com o ID do requisito no nome. O caso "loja B" entra em toda ação com `vehicleId` ou foto (VEH-SEC-001). Decisões do plano D1–D3 nas opções recomendadas (confirmar antes do `/implement`).

## Fase 1 — Fundação
- [x] **T001** Documentos: ARCHITECTURE §4 (`vehicles` com ids/mês da FIPE, `share_before_sale`, `deleted_at`, `conditions` jsonb; `vehicle_history`; `fipe_*`), GLOSSARY ("Histórico de preço", "Referência FIPE"), ADR 0012 (FIPE copiada sob demanda para o banco, D1) · _—_
- [x] **T002** Migration `0010`: enum `vehicle_status`, `vehicles`, `vehicle_photos`, `vehicle_history`, `fipe_brands`, `fipe_models`, `fipe_years`, `fipe_prices` + índices; teste de migration (posição única da foto) · _—_
- [x] **T003** [P] `src/platform/br/plate.ts`: placa Mercosul e antiga, normalização e final de placa · _VEH-FR-005, VEH-SEC-002_
- [x] **T004** [P] `src/platform/fipe/client.ts`: marcas, modelos, anos e preço da API pública, com prazo de 5 s e validação do formato da resposta (`fetch` falso nos testes) · _VEH-FR-005, VEH-FR-007_
- [x] **T005** `src/platform/cloudinary`: transformação de entrada assinada (`c_limit,w_1600,h_1600`) e dimensões no `verifyUpload`; prova no staging (foto com GPS sai sem metadados e com no máximo 1.600 px) · _VEH-SEC-003, VEH-NFR-002_
- [x] **T006** Domínio `fipe`: `brands`, `models`, `years`, `reference` lendo do banco e buscando só o que falta ou venceu (30 dias; preço do mês); API fora → o guardado · _VEH-FR-005, VEH-FR-007, VEH-NFR-004_

## Fase 2 — Fatias verticais (domínio `vehicles`)
- [x] **T007** `vehicles/lists.ts` + `saveDraft` (cria no 1º salvamento, parcial, `.strict()`, padrões de divulgação e contato da loja) e `vehicleForm`; loja B → 404 · _VEH-FR-003, VEH-FR-006, VEH-FR-008, VEH-SEC-001_
- [x] **T008** Identificação no `saveDraft`: ids e nomes da FIPE, regra dos anos, placa e final; referência FIPE e diferença percentual · _VEH-FR-005, VEH-FR-007_
- [x] **T009** Fotos: `photoUpload` (limite de 20, pasta do veículo), `addPhoto` (nome exato, formato, 15 MB, dimensões; recusado apagado), `removePhoto`, `reorderPhotos` (capa = 1ª); loja B → 404 · _VEH-FR-004, VEH-SEC-001, VEH-SEC-003_
- [x] **T010** `publish` com `publishSchema` (erros por campo) e transição condicional; loja não ativada publica; log · _VEH-FR-009, VEH-FR-010, VEH-SEC-005_
- [x] **T011** `setShare` (só publicado) e legendas por estado, inclusive "Aparece quando a loja for ativada" (D3) · _VEH-FR-002, VEH-FR-010_
- [x] **T012** Edição de publicado: `saveDraft` em publicado com histórico de preço na mesma transação; `vehicleSummary` com "Dias no ar"; log de preço · _VEH-FR-011, VEH-FR-012, VEH-SEC-005_
- [x] **T013** `markSold` / `undoSold` (7 dias, divulgação como antes) / `unpublish` / `remove` (definitivo para a loja, `deleted_at`), todos condicionais; loja B → 404; log · _VEH-FR-013, VEH-FR-014, VEH-SEC-001, VEH-SEC-005_
- [x] **T014** `listVehicles` (KPIs, contagem por filtro, busca por modelo ou placa) e `billing.subscriptionCard` · _VEH-FR-001, VEH-FR-002_
- [x] **T015** `publicVehicles` (só publicado de loja no ar, sem placa nem chassi) e `hasPublishedVehicle` no `onboardingStatus` (passado pela página) · _VEH-FR-010, VEH-FR-015, VEH-SEC-002, VEH-SEC-004_

## Fase 3 — Telas
- [x] **T016** `src/ui`: `ConfirmSheet` (diálogo [6f]), seletor dependente e campo de contagem de caracteres · _VEH-NFR-001_
- [ ] **T017** [2a] parte 1 em `/painel/veiculos/novo` e `/[id]/editar`: Identificação (FIPE dependente), Ficha técnica, Preço com referência, Condições, Itens, Descrição, Divulgação; autosave com "Rascunho salvo" · _VEH-FR-003, VEH-FR-005, VEH-FR-006, VEH-FR-007, VEH-FR-008_
- [ ] **T018** [2a] parte 2: Fotos (redução no navegador, progresso, arrastar, remover, limite) e "Publicar" com erros por seção · _VEH-FR-004, VEH-FR-009, VEH-NFR-002_
- [ ] **T019** [1c] em `/painel/veiculos`: KPIs, card da assinatura, busca, filtros, cards com toggle, Vendido e Editar; onboarding com o 1º veículo; texto de [10a] ajustado · _VEH-FR-001, VEH-FR-002, VEH-FR-010, VEH-FR-015_
- [ ] **T020** [6e] em `/painel/veiculos/[id]`: resumo, Dias no ar, seções com Editar, toggle, Vendido / Desfazer, Despublicar e Excluir com [6f] · _VEH-FR-011, VEH-FR-013, VEH-FR-014_
- [ ] **T021** Catálogo `/loja/[slug]` lista os veículos publicados (foto, nome, ano · km, preço) com cache `vehicles` renovado nas ações · _VEH-FR-010, VEH-NFR-003, VEH-SEC-002, VEH-SEC-004_

## Fase 4 — Fechamento
- [ ] **T022** Playwright (390 px, staging): cadastro completo com FIPE real e 2 fotos; autosave; publicar com erro e certo; [1c]; preço e histórico; vendido some do catálogo e desfazer; excluir; loja B; `audit()`; seed apaga veículos e fotos dos testes · _VEH-FR-001 a VEH-FR-015, VEH-NFR-001, VEH-NFR-003, VEH-SEC-001, VEH-SEC-002, VEH-SEC-004_
- [ ] **T023** Migration `0010` no staging e no prod e conferir; `/verify`: rastreabilidade verde, spec `implemented`, PLAN, `docs/changes` e `docs/decisions` · _—_
