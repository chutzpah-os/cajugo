---
spec: 012
---

# Tasks · 012 Fidelidade ao design

Cada task de tela: abrir a captura de `docs/design/telas/`, refazer a tela sobre a base, ajustar os testes da tela (componente e e2e) e registrar a linha em `comparacao.md`. Sem regra de negócio nova (DSG-FR-016).

Decisões D1–D5 do plano aprovadas em 2026-11-24.

## Fase 1 — Base
- [x] **T001** Componentes base (`icons`, `Badge`, `Kpi`, `Initials`, `KeyValue`, `StoreCard`, `SettingsList`, `DataTable`, `PageHeader`) com testes de componente. · _DSG-FR-013_
- [x] **T002** `ConfirmSheet` do [6f] (alça, ícone 48 px por tipo, ordem dos botões) e botão pequeno com ícone. · _DSG-FR-011, DSG-FR-013_
- [x] **T003** Moldura: o cabeçalho sai da `AreaShell`; slot `identity` nos layouts; `PanelNav` com sidebar escura, card da identidade e contadores; barra inferior sem cobrir conteúdo; Sair e Trocar de painel no menu do avatar. · _DSG-FR-001, DSG-FR-002, DSG-FR-003_
- [x] **T004** `pnpm e2e:photos` e o seed com fotos de carro; `pnpm design:shots` e `comparacao.md`. · _DSG-NFR-001, DSG-NFR-004_

## Fase 2 — Painel do lojista
- [ ] **T005** [1c] Meus veículos no celular. · _DSG-FR-004_
- [ ] **T006** [15b] Meus veículos no desktop (tabela e 4 KPIs). · _DSG-FR-005_
- [ ] **T007** [3a] Leads (celular e desktop). · _DSG-FR-006, DSG-FR-017_
- [ ] **T008** [3b] Minha loja. · _DSG-FR-006, DSG-FR-017_
- [ ] **T009** [3c] Conta com o card escuro da assinatura, [12h] e Rede Caju/Caju Indica na ordem da captura. · _DSG-FR-006, DSG-FR-016_
- [ ] **T010** [10c], [6c], [10a], [5d], [12e], [12f]. · _DSG-FR-010_
- [ ] **T011** [2a] e [6e]. · _DSG-FR-011_

## Fase 3 — Admin já entregue
- [ ] **T012** [4b] Assinaturas. · _DSG-FR-007_
- [ ] **T013** [4c] Conta admin. · _DSG-FR-008_
- [ ] **T014** [10b], [7h], [14c], [14e], [12a], [8f]. · _DSG-FR-008, DSG-FR-017_

## Fase 4 — Rede Caju e Caju Indica
- [ ] **T015** Vendedor: [7a], [7b], [7c], [7d], conta [13c]. · _DSG-FR-012_
- [ ] **T016** Lojista na Rede Caju: [7e], [7f], [7g]. · _DSG-FR-012_
- [ ] **T017** Caju Indica: [8a–8e], [9a], [9b], [9d]. · _DSG-FR-012_
- [ ] **T018** Login [9f], Nova senha, [6b]. · _DSG-FR-012, DSG-FR-015_

## Fase 5 — Públicas
- [ ] **T019** [1a] vitrine e [15a] desktop, [6d] filtros. · _DSG-FR-009_
- [ ] **T020** [1b] página do veículo, [14b], [14d], [12d]. · _DSG-FR-009_
- [ ] **T021** Página da loja, [12g], [12a–12c], [14a]. · _DSG-FR-009_
- [ ] **T022** [11a] menu, [5b] landing, [5c] cadastro. · _DSG-FR-009_

## Fase 6 — Fechamento
- [ ] **T023** Textos-padrão §6/§8 conferidos em todas as telas; `DESIGN.md` §8 com o padrão do desktop sem captura. · _DSG-FR-014, DSG-FR-017_
- [ ] **T024** Acessibilidade e SEO: `audit()` em 390/1280 em todas as telas, checklist do `SEO.md` §6, build e LCP. · _DSG-NFR-002, DSG-NFR-003, DSG-SEC-001_
- [ ] **T025** Verificação: `comparacao.md` completa, rastreabilidade, suíte e2e; status `implemented` e `docs/PLAN.md`. · _—_
