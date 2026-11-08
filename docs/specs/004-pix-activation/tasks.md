---
spec: 004
---

# Tasks · 004 Pix manual e ativação da loja

Fatias verticais (`SDD.md` §7, skill `tdd`): cada task de comportamento é um ciclo teste falhando → código → verde. Testes com o ID do requisito no nome. O caso "loja B" entra em toda ação com id ou com arquivo da loja (PIX-SEC-001). Decisões do plano D1–D4 nas opções recomendadas (confirmar antes do `/implement`).

## Fase 1 — Fundação
- [x] **T001** Documentos: ARCHITECTURE §4 (`stores.tax_id`/`tax_id_type`, `invoices.kind`, `payments.paid_cents`/`method`/`note`, `notices`), SECURITY §8 (valor pago e motivo de recusa), GLOSSARY ("valor pago", "indicação não válida", "aviso"), ADR 0011 (comprovante privado servido por rota nossa, D2) · _—_
- [x] **T002** Migration `0008`: enums, `invoices`, `payments`, `notices`, colunas em `stores` e `referrals`, `referral_status` + `rejected`, valor inicial de `membership_cents`; teste de migration (índices únicos parciais) · _—_
- [x] **T003** [P] `src/platform/br/tax-id.ts`: validar, normalizar e mascarar CPF/CNPJ; a regra `pix` passa a usar este módulo (sem mudar comportamento) · _PIX-FR-002, PIX-SEC-005_
- [x] **T004** [P] `src/platform/pix/br-code.ts`: payload EMV do Pix estático com valor + CRC16, testado contra o exemplo do manual do BACEN · _PIX-FR-004_
- [x] **T005** [P] `src/domains/billing/due-date.ts`: `firstDueDate` e `nextDueAfter` (dia em São Paulo; último dia do mês quando falta o dia) · _PIX-FR-009_
- [x] **T006** `src/platform/cloudinary/`: upload `authenticated` (formatos com PDF), `verifyUpload` por tipo, `destroy` e `fetchPrivate`; Cloudinary falso com os mesmos recursos; prova no staging (envio e leitura de PNG e PDF `authenticated`) · _PIX-SEC-002_
- [x] **T007** Logo e capa: arquivo recusado é apagado do Cloudinary (D4) · _STO-SEC-004_
- [x] **T008** Regras: `membership_cents` ("Mensalidade do Plano Catálogo") e "Cidade do favorecido" na regra `pix` (D1), em [4c], com histórico · _PIX-FR-001, PIX-FR-004_
- [x] **T009** Domínio `notices`: `notify`, `noticesFor` (só do perfil da sessão), `dismiss`; permissão `payments.view` (admin, suporte) · _PIX-FR-013, PIX-SEC-003_

## Fase 2 — Fatias verticais (domínios `billing`, `stores`, `referrals`)
- [x] **T010** `checkoutView` e `startCheckout`: valor da regra vigente, documento validado e gravado na loja, fatura first aberta (reaproveitada), sem chave Pix → `pixReady=false`; usuário da loja 403 · _PIX-FR-001, PIX-FR-002, PIX-FR-004, PIX-SEC-004, PIX-SEC-005, PIX-SEC-006_
- [x] **T011** `checkSelfReferralByTaxId` nos dois sentidos, chamado por `startCheckout`; indicação `rejected` sem aviso ao indicado · _PIX-FR-003_
- [x] **T012** `pixView` (valor da fatura, chave, favorecido, BR Code, prazo) e `receiptUpload` (pasta da loja da sessão) · _PIX-FR-004, PIX-SEC-001_
- [x] **T013** `submitReceipt`: nome exato assinado, formato e 10 MB (recusado é apagado), valor pago, um pagamento em análise por fatura, loja `payment_review`, log; loja B não envia para A · _PIX-FR-005, PIX-FR-006, PIX-SEC-001, PIX-SEC-002, PIX-SEC-004_
- [x] **T014** `reviewQueue`: fila do mais antigo, referência, valor pago, alerta de valor diferente, totais do mês, "Chave Pix não configurada"; suporte lê, lojista não · _PIX-FR-007, PIX-FR-008, PIX-SEC-003_
- [x] **T015** `confirmPayment`: valor corrigido, fatura paga, `activateFirstTime` (vencimento, endereço deixa de ser reservado), aviso, log, link `wa.me`; duas confirmações → uma ativação e 409 · _PIX-FR-008, PIX-FR-009, PIX-FR-013, PIX-SEC-004, PIX-SEC-007_
- [x] **T016** `rejectPayment`: motivo obrigatório, loja volta a `registered`, valor faltante, aviso, log; conferência dupla → 409 · _PIX-FR-010, PIX-FR-013, PIX-SEC-007_
- [x] **T017** `registerManualPayment` e `findStoresToCharge`: só admin, loja sem comprovante pendente, mesmo caminho de ativação, log · _PIX-FR-011, PIX-SEC-003_
- [x] **T018** `isStoreLive` no `publicStore` (ativa, em atraso, cancelamento agendado) e `onboardingStatus` (loja completa = logo, capa, sobre, horário) · _PIX-FR-012, PIX-FR-014_
- [x] **T019** Route Handler `GET /api/v1/payments/[id]/receipt` conforme `contract.md`: 401, 404 (outra loja, inexistente, manual), arquivo com `no-store` · _PIX-SEC-001, PIX-SEC-002, PIX-SEC-003_

## Fase 3 — Telas
- [ ] **T020** [5d] em `/lojistas/pagamento` (resumo, CPF/CNPJ, aviso sem chave com `wa.me`) e [12e] no mesmo endereço quando o último comprovante foi recusado · _PIX-FR-001, PIX-FR-002, PIX-FR-004, PIX-FR-010, PIX-NFR-002_
- [ ] **T021** [6c] em `/lojistas/pagamento/pix`: valor, chave com Copiar, QR, passos, prazo; anexo com pré-visualização (imagem e PDF), limite de 10 MB, valor pago; envio → [10a] em `/painel/pagamento` · _PIX-FR-004, PIX-FR-005, PIX-FR-006, PIX-NFR-002_
- [ ] **T022** [10b] em `/admin/pagamentos`: fila, abrir arquivo, alerta, corrigir valor, Confirmar com `wa.me`, Recusar com motivo, Registrar pagamento sem comprovante; suporte sem botões · _PIX-FR-007, PIX-FR-008, PIX-FR-009, PIX-FR-010, PIX-FR-011, PIX-SEC-003_
- [ ] **T023** [5e] em `/painel/veiculos` (banner, primeiros passos, "Cadastrar primeiro veículo" → `/painel/veiculos/novo`, D3) e avisos do painel com Dispensar · _PIX-FR-012, PIX-FR-013_

## Fase 4 — Fechamento
- [ ] **T024** Playwright (390 px, staging): [5d] → [6c] com PNG e PDF reais → [10a]; admin recusa → [12e] → reenvio → confirma → [5e] e `/loja/{slug}` abre; registro manual; suporte sem botões; usuário da loja bloqueado; `audit()`; seed limpa faturas e pagamentos do e2e · _PIX-FR-001 a PIX-FR-014, PIX-NFR-001, PIX-SEC-003, PIX-SEC-006_
- [ ] **T025** Migration `0008` no staging e no prod e conferir; `/verify`: rastreabilidade verde, spec `implemented`, PLAN, `docs/changes` e `docs/decisions` · _—_
