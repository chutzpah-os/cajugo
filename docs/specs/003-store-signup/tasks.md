---
spec: 003
---

# Tasks · 003 Cadastro do lojista, Minha loja e menu

Fatias verticais (`SDD.md` §7, skill `tdd`): cada task de comportamento é um ciclo teste falhando → código → verde. Testes com o ID do requisito no nome. O caso "loja B" entra em toda ação de Minha loja (STO-SEC-001).

## Fase 1 — Fundação
- [x] **T001** Migrations `0006` (tabelas e remoção de `stores.address`) e `0007` (campos da loja): endereço em colunas e remoção de `stores.address` (D2), `slug_changed_at`, `slug_reserved_until`, `store_slug_redirects`, enum `referral_status`, `referral_codes`, `referrals` + índice; teste de migration · _—_
- [x] **T002** [P] `src/platform/geo/`: script que gera a lista de cidades do IBGE (D3), lista versionada e busca sem acento (`searchCities`, `findCity`) · _STO-FR-004_
- [x] **T003** [P] `src/platform/cloudinary/`: `signUpload` (SHA-1, padrão do Cloudinary; vetor da documentação), `verifyUpload` (Admin API), `imageUrl`, e um Cloudinary falso para testes · _STO-SEC-004_
- [x] **T004** [P] `src/platform/seo/` (`pageMetadata`, `jsonLd` com escape) e `storeUrl(slug)` (função única de URL de loja, ADR 0009) · _STO-NFR-001, STO-FR-011_
- [x] **T005** [P] `AuthProvider.adminDeleteUser` (falso e Supabase), para desfazer a conta se o cadastro falhar · _—_

## Fase 2 — Fatias verticais (domínios `stores` e `referrals`)
- [x] **T006** `suggestSlug` e regras do endereço do catálogo; `checkSlug` (disponível, em uso, inválido) · _STO-FR-005_
- [x] **T007** `referrals`: `getOrCreateCode` (código pessoal único) e `checkCode` (inexistente, autoindicação por e-mail ou celular, só o nome de quem indicou) · _STO-FR-007, STO-FR-014, STO-SEC-005_
- [x] **T008** `registerStore` para visitante: conta + perfil + papel + loja `registered` + endereço reservado + código + indicação numa transação; desfaz a conta se falhar; auditoria · _STO-FR-003, STO-FR-004, STO-FR-006, STO-FR-007, STO-FR-014_
- [x] **T009** `registerStore`: honeypot e limite por rede; e-mail existente com mensagem neutra; conectado cria só a loja; equipe e quem já tem loja recusados · _STO-FR-015, STO-SEC-002_
- [x] **T010** `updateStore`: dados públicos, endereço em campos, horário, divulgar; loja só da sessão (loja B); usuário da loja recusado · _STO-FR-008, STO-FR-009, STO-FR-012, STO-SEC-001, STO-SEC-003_
- [x] **T011** `changeSlug` (limite de 30 dias, redirecionamento de 90 dias, transação, auditoria) e `resolveSlug` · _STO-FR-013, STO-SEC-001_
- [x] **T012** `storeImageUpload` e `setStoreImage` (pasta da loja, formato, ≤ 15 MB; loja B; usuário da loja) · _STO-FR-010, STO-SEC-004, STO-SEC-003_
- [x] **T013** `pnpm e2e:seed` apaga as lojas e contas criadas pelos e2e de cadastro (`e2e-cadastro-*@cajugo.test`) · _—_

## Fase 3 — Telas
- [x] **T014** [P] `src/ui`: menu em gaveta, campo com sugestões (autocomplete), campo de imagem (enviar/trocar) e aviso "Disponível/Indisponível", com testes · _STO-NFR-002_
- [x] **T015** Menu da home [11a] no cabeçalho de `/`: visitante e conectado (nome + painéis) · _STO-FR-001_
- [x] **T016** Landing `/lojistas` [5b] com metadata, canônica, JSON-LD e Open Graph; `sitemap.xml` e `robots.txt` · _STO-FR-002, STO-NFR-001_
- [x] **T017** [P] `/termos` [12i] com abas Termos e Privacidade e aviso de versão inicial · _STO-FR-016_
- [x] **T018** Cadastro `/lojistas/cadastro` [5c]: formulário, cidade com sugestões, endereço ao vivo, código ao vivo, conta existente; `/i/[codigo]` → cadastro com o código · _STO-FR-003, STO-FR-004, STO-FR-005, STO-FR-007, STO-FR-014, STO-FR-015_
- [x] **T019** Minha loja `/painel/loja` [3b]: informações públicas, endereço, horário e preferência de divulgar · _STO-FR-008, STO-FR-009, STO-FR-012, STO-SEC-003_
- [x] **T020** Minha loja: logo e capa, link, QR code em PNG (`qrcode`, D1), compartilhar e ver como cliente · _STO-FR-010, STO-FR-011_
- [x] **T021** Troca do endereço na tela e `/loja/[slug]` (redirecionamento do endereço antigo e página mínima, D4) · _STO-FR-013_

## Fase 4 — Ponta a ponta e fechamento
- [x] **T022** Playwright (390 px, staging): menu; landing → cadastro → pagamento com código do link; endereço "Indisponível"; conta existente; Minha loja (dados, horário, logo, link, QR); troca de endereço e redirecionamento; termos; SEO no HTML de `/lojistas`; acessibilidade · _STO-FR-001 a STO-FR-016, STO-NFR-001, STO-NFR-002, STO-SEC-002, STO-SEC-003_
- [ ] **T023** Aplicar as migrations `0006` e `0007` no staging e no prod e conferir · _—_
- [x] **T024** `/verify`: rastreabilidade verde; spec `implemented`; registrar em `docs/changes` e `docs/decisions` · _—_
