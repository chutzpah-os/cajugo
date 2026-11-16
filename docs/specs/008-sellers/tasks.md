---
spec: 008
---

# Tasks · 008 Rede Caju · vendedor

Fatias verticais (`SDD.md` §7, skill `tdd`): cada task de comportamento é um ciclo teste falhando → código → verde. Testes com o ID do requisito no nome.

Toda ação com id tem o caso "outro dono" (`TESTING.md`):
- o vendedor B não lê nem age pelo vendedor A;
- documento de outro vendedor → 404;
- decisão de quem não é admin → 403.

Decisões D1–D6 do plano aprovadas em 2026-11-16.

## Fase 1 — Fundação
- [x] **T001** Documentos:
  - ARCHITECTURE §4 (`sellers`, `partnerships`, `seller_vehicle_clicks`, `stores.commission_*`, `leads.seller_id`, CPF e Pix em `profiles`);
  - API.md §5 (actions do vendedor e do admin, rota do documento);
  - SECURITY §8 (fotos do documento do vendedor);
  - GLOSSARY (Código do vendedor, status do vendedor, Curadoria).

  · _—_
- [x] **T002** Migration `0018`, aditiva:
  - enums `seller_status`, `partnership_status`, `partnership_origin` e `commission_type`;
  - CPF (único quando preenchido) e Pix em `profiles`;
  - tabelas `sellers`, `partnerships` (índice único das abertas) e `seller_vehicle_clicks`;
  - `stores.commission_*`;
  - `leads.seller_id` e `lead_origin` + `seller`.

  Teste de schema (índices, RLS, CPF único).

  · _SEL-SEC-001, SEL-SEC-004_
- [x] **T003** [P] `pixKeySchema` em `platform/pix`, tirado de `settings/definitions.ts`; os testes da 002 continuam verdes.

  · _SEL-FR-014_
- [x] **T004** [P] `sellers/schemas.ts`, `sellers/status.ts` e `sellers/commission.ts`:
  - `sellerSignupSchema` (`.strict()`; CPF válido, celular, Pix, termos, honeypot);
  - rótulos de status;
  - `commissionFor` (% e fixo);
  - geração do código do vendedor.

  · _SEL-FR-001, SEL-FR-004, SEL-FR-008, SEL-SEC-008_

## Fase 2 — Fatias verticais (servidor)
- [x] **T005** `registerSeller` sem sessão:
  - conta no Auth, `profile` com o papel de vendedor, CPF e Pix, e vendedor `in_review`;
  - honeypot e limite por IP;
  - CPF repetido → "CPF já cadastrado.";
  - e-mail que já existe → "entre para continuar".

  · _SEL-FR-001, SEL-SEC-003_
- [x] **T006** `registerSeller` com sessão: acrescenta o papel de vendedor à conta (lojista, indicador) sem nova senha. Conta da equipe é recusada.

  · _SEL-FR-016_
- [ ] **T007** Fotos do documento:
  - `documentUpload` (assinado, `authenticated`, pasta do vendedor);
  - `attachDocument` (formato, até 10 MB, pasta própria; senão, apaga do Cloudinary);
  - `documentFile` + rota `GET /api/v1/sellers/[id]/document/[side]`: admin, suporte e o próprio vendedor recebem 200; outros, 404.

  · _SEL-FR-001, SEL-SEC-009_
- [ ] **T008** `sellerHome`: status para "em análise" (faltando foto ou completo) e "bloqueado" (com o motivo); painel com os cliques do mês e as lojas Parceiro e Pendente.

  · _SEL-FR-002, SEL-FR-006, SEL-SEC-004_
- [ ] **T009** `sellersAdmin` e as decisões:
  - `sellersAdmin`: indicadores e listas;
  - `approve`: gera o código e recusa sem as duas fotos;
  - `block` (com motivo) e `unblock`;
  - `activity_log` sem CPF nem Pix;
  - suporte e demais → 403 nas decisões.

  · _SEL-FR-003, SEL-FR-004, SEL-FR-005, SEL-SEC-005, SEL-SEC-007_
- [ ] **T010** `sellerShowcase` e `requestPartnership`:
  - cards da vitrine com a parceria e "Você ganha" só em loja parceira com comissão;
  - link de compartilhar;
  - pedido repetido não duplica;
  - vendedor não ativo → recusado;
  - o vendedor B não vê a parceria do A.

  · _SEL-FR-007, SEL-FR-008, SEL-FR-009, SEL-SEC-004, SEL-SEC-008_
- [ ] **T011** `recordSellerClick` + `sellerClickAction`:
  - soma por vendedor, veículo e dia;
  - robô, vendedor bloqueado e código falso não contam;
  - limite por rede.

  · _SEL-FR-010_
- [ ] **T012** Lead com vendedor:
  - `sellerForLead`;
  - `contactStore` e `recordWhatsappClick` gravam `seller_id` e a origem `seller` com o cookie `cajugo_ref`;
  - sem parceria, vendedor bloqueado ou código falso → lead sem vendedor;
  - os testes da 007 continuam verdes;
  - [3a] traz o nome do vendedor.

  · _SEL-FR-011, SEL-SEC-006_
- [ ] **T013** `sellerAccount` e `updatePixKey`: CPF mascarado; troca da chave Pix com `pixKeySchema` e `activity_log` sem a chave; a chave Pix não sai na vitrine, no lead nem na página do veículo.

  · _SEL-FR-014, SEL-SEC-001, SEL-SEC-002_

## Fase 3 — Telas
- [ ] **T014** `/rede/cadastro` [7a] (com a conta única: entrar e voltar) e `/rede/cadastro/documento` (frente e verso) até a confirmação "Em análise".

  · _SEL-FR-001, SEL-FR-016, SEL-NFR-001_
- [ ] **T015** Área do vendedor:
  - menu Início · Vitrine · Extrato · Conta;
  - `/rede` com o status ou o painel [7b];
  - `/rede/extrato` com o aviso até a 008b;
  - vitrine e conta só para vendedor ativo.

  · _SEL-FR-002, SEL-FR-006, SEL-FR-015_
- [ ] **T016** `/rede/vitrine` [7c]:
  - busca e filtros da vitrine;
  - **Compartilhar** (copiar e WhatsApp);
  - "Você ganha R$ X";
  - **Pedir parceria** e o estado desabilitado;
  - "Carregar mais".

  · _SEL-FR-007, SEL-FR-008, SEL-FR-009, SEL-NFR-003_
- [ ] **T017** `/rede/conta` [13c]: CPF mascarado, **Trocar** chave Pix, links e os avisos "em breve".

  · _SEL-FR-014, SEL-SEC-001_
- [ ] **T018** `/admin/vendedores` [7h]: indicadores, as três listas, links da frente e do verso, **Aprovar**, **Bloquear** (com motivo, em [6f]) e **Desbloquear**; o suporte vê sem botões.

  · _SEL-FR-003, SEL-FR-004, SEL-FR-005, SEL-SEC-005_
- [ ] **T019** Página do veículo: `SellerClickPing` (lê `?ref=`, marca o aparelho por dia, chama a action) sem tirar a página do cache. Selo "via vendedor {nome}" em [3a].

  · _SEL-FR-010, SEL-FR-011, SEL-NFR-002_
- [ ] **T020** Seed do e2e (vendedor em análise com fotos, vendedor ativo parceiro da loja da vitrine, comissão da loja) e `tests/e2e/sellers.spec.ts`:
  - cadastro com fotos;
  - admin aprova e bloqueia;
  - vitrine com "Você ganha" e Compartilhar;
  - Pedir parceria;
  - link → clique → lead "via vendedor";
  - conta;
  - suporte sem botões;
  - 390 e 1280 px com `audit()`.

  · _SEL-FR-001…011, 014–016, SEL-SEC-005, SEL-SEC-009, SEL-NFR-001_
- [ ] **T021** LCP/CLS da página do veículo aberta com `?ref=` no e2e de produção.

  · _SEL-NFR-002_

## Fase 4 — Fechamento
- [ ] **T022** `/verify`: rastreabilidade verde; status da spec `implemented` e `docs/PLAN.md`. A migration `0018` no prod só com a sua autorização.

  · _—_
