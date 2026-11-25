# API e camada de servidor

> Como escrever código de servidor no CajuGo (Next.js na Vercel + Supabase Postgres via Drizzle). Stack em `ARCHITECTURE.md`; segurança em `SECURITY.md`, que prevalece em caso de conflito.
>
> **Este arquivo é lido pelo Claude Code.** As seções marcadas com 🤖 são regras obrigatórias.

---

## 1. Onde fica cada coisa

| Necessidade | Use |
|---|---|
| Ler dados para uma página | Server Component chamando o **serviço** do domínio |
| Mutação disparada por uma tela (salvar, publicar, mudar status) | **Server Action** chamando o serviço |
| Cron, webhook (fase 2), futuro app Expo | **Route Handler** em `/api/v1/...` |

Serviços (`vehicles`, `stores`, `leads`, `subscriptions`, `admin`…) concentram regra de negócio e acesso ao banco (Drizzle). Páginas, actions e rotas são finas: validam a entrada, checam a sessão e chamam o serviço.

---

## 2. Regras 🤖

1. **Valide toda entrada com schema** (biblioteca a definir; sugestão: zod), com limites explícitos (tamanho de texto, mínimo e máximo de número, tamanho de array). Rejeite campo desconhecido.
2. **Autorização em toda action e rota**, mesmo que o botão esteja escondido na UI. A sessão vem do cookie (`SECURITY.md` §3).
3. **Posse do recurso:** o `storeId` vem da sessão, nunca do body. Carregue o recurso e confira `resource.storeId === session.storeId`; se não bater, responda **404** (não revela existência).
4. **Campos privilegiados não entram no schema de entrada:** `status` direto (veículo, loja, pagamento, vendedor, comissão), `storeId`, `roles`, valores de comissão/taxa já confirmados, saldos e recompensas. Mudança de status só por ações específicas. Mudança de status só por ações específicas (publicar, vender…).
5. **Saída explícita:** monte o objeto de resposta à mão por contexto (card público, detalhe público, visão do dono). Nunca devolva a linha do banco inteira; ela tem campos privados (placa, e-mail do dono).
6. **Efeitos colaterais idempotentes:** webhook de pagamento, criação de lead e cron precisam aguentar repetição (chave de idempotência ou ID determinístico + transação).
7. **Mudou veículo, loja ou assinatura?** Chame `revalidateTag` (`ARCHITECTURE.md` §5). Operações que mexem em mais de uma tabela rodam numa transação.
8. **Ações de status e de admin gravam `activity_log`.**
9. Não adicione dependência sem perguntar.

---

## 3. Convenções

- Código, paths e campos em **inglês**; mensagens ao usuário em **pt-BR**.
- Paths em `kebab-case`, recursos no plural; JSON em `camelCase`.
- Dinheiro em centavos (inteiro). Datas ISO 8601 UTC na resposta JSON.
- Rotas versionadas: `/api/v1/...`.
- Listas: paginação por cursor, padrão 20, máximo 50. Resposta: `{ "data": [...], "page": { "nextCursor": "...", "hasMore": true } }`.
- Card da listagem ≠ detalhe: o card leva só o necessário (id, título, preço, ano, km, cidade, loja, 1 foto).

### Erros (Route Handlers)
`application/problem+json` (RFC 9457), sem stack trace nem detalhe interno:
```json
{ "type": "vehicle-not-publishable", "title": "Anúncio incompleto", "status": 422,
  "detail": "Adicione pelo menos 1 foto antes de publicar.",
  "errors": [{ "field": "photos", "code": "min_items", "message": "Mínimo de 1 foto." }] }
```
Server Actions devolvem `{ ok: false, errors }` no mesmo formato de `errors`, para a tela mostrar abaixo do campo.

| Situação | Código |
|---|---|
| Criado | 201 |
| Sem conteúdo | 204 |
| Validação | 422 |
| Sem sessão / sem papel | 401 / 403 |
| Recurso de outra loja | **404** |
| Conflito (ex.: slug em uso) | 409 |
| Rate limit | 429 + `Retry-After` |

---

## 4. Uploads (Cloudinary)

### 4.1 Fotos de veículo, logo e capa (públicas)
1. A tela pede uma assinatura ao servidor (action), informando o veículo ou a loja. O servidor confere a posse e o limite (20 fotos).
2. O servidor assina os parâmetros: pasta (`vehicles/{vehicleId}`, `stores/{storeId}`), `public_id` gerado pelo servidor, formatos `jpg,png,webp,heic`, tamanho máximo, remoção de metadados.
3. O navegador envia direto ao Cloudinary e devolve o `publicId`; o servidor confere a pasta e grava.
4. Exibição por URL de transformação fixa (`thumb`, `card`, `full`) com `f_auto,q_auto`.

### 4.2 Comprovantes e documentos (privados)
- Comprovante de Pix [6c, 12e] e documentos do vendedor [7a]: upload assinado com `type: authenticated` (não acessível por URL pública), pasta `receipts/{storeId}` ou `sellers/{profileId}`, formatos `jpg,png,webp,heic,pdf`, até 10 MB.
- Só o admin (e o próprio dono do arquivo) vê, por **URL assinada de curta duração** gerada no servidor. Nunca exibido em página pública. Exceção ao "nada de PDF" registrada em `SECURITY.md` §5.

---

## 5. Mapa de rotas e ações

A coluna "Tipo" diz se é Route Handler (**R**) ou Server Action (**A**). Cada spec detalha os seus.

### Público e comprador
| Tipo | Rota / ação | Tela |
|---|---|---|
| página | `/`, `/loja/{slug}` — vitrine e catálogo da loja (filtros na query string) | 1a, 6d, 9a, 15a |
| página | `/v/{id}-{make}-{model}` — detalhe, uma URL só para vitrine e catálogo (a origem do lead vem da marca da aba, 007/D1; guarda `?ref=` do vendedor na 008) | 1b, 12d |
| página | `/i/{codigo}` — landing do Caju Indica, `noindex` (010) | 8c |
| A | `contactLeadAction({ requestId, vehicleId, origin, name, email, phone, message })` — honeypot + rate limit · `whatsappClickAction({ requestId, vehicleId, origin })` · `viewAction({ vehicleId })` (007); `requestId` é um uuid v7 gerado na tela e vira o id do lead (idempotência, §2.6) | 1b, 14b |
| A | `reportVehicleAction({ requestId, vehicleId, reason, details })` — honeypot + rate limit; `requestId` vira o id da denúncia; sem autor nem IP (007b) | 14d |
| página | `/favoritos` — favoritos guardados no aparelho, `noindex` (006c) | 14a |
| A | `favoriteCardsAction({ ids })` — leitura pública dos cards atuais dos favoritos (até 200 ids); sincronizar com conta é fase 2 | 14a |
| A | `createSearchAlertAction({ name, phone, consent, source, query })` — honeypot + rate limit; só vitrine e descoberta (006d) | 12a |
| página | `/alertas/cancelar/{token}` — cancelar o alerta pelo link (`noindex`) · A `cancelSearchAlertAction({ token })` | 12a |

### Auth e cadastros
| Tipo | Rota / ação | Tela |
|---|---|---|
| A | `signIn(email, password)` · `signOut()` · `switchRole(role)` | 9f |
| A | `updatePassword(password)` — tela Nova senha | 6b |
| A | `checkSlugAvailability(slug)` · `checkReferralCode(code)` | 5c, 8d |
| A | `registerStore(form)` → conta + loja `registered` (+ indicação, se houver código) | 5c |
| página | `/rede/cadastro` · `/rede/cadastro/documento` (008) | 7a |
| A | `registerSellerAction(form)` → conta (ou papel na conta logada) + vendedor `in_review`; honeypot + rate limit · `sellerDocumentUploadAction({ side })` · `attachSellerDocumentAction({ side, publicId })` | 7a |
| A | `registerReferrer(form)` → conta com papel indicador | 9b |

### Pagamento (Pix manual)
| Tipo | Rota / ação | Tela |
|---|---|---|
| A | `saveTaxId(document)` | 5d |
| A | assinatura de upload privado (§4.2) · `submitReceipt(invoiceId, publicId, amountCents)` → loja `payment_review` | 6c, 12e |
| A | `confirmPayment(paymentId)` — **admin**: quita as faturas abertas da mais antiga para a mais nova, sobra vira crédito, loja ativa/reativada (011), recompensas do Caju Indica | 10b |
| A | `rejectPayment(paymentId, reason)` — **admin**; na fatura mensal a loja não muda de status (011) | 10b |
| página | `/painel/fatura` — faturas abertas (mais antiga primeiro), taxas e **Pagar com Pix** (`billing.manage`, 011) | 10c |
| A | `registerManualPayment(storeId, {...})` — **admin**, exceção sem comprovante | 6g |

Fase 2 (gateway): `startSubscription`, status do Pix automático, `POST /api/v1/webhooks/payments`.

### Lojista
| Tipo | Rota / ação | Tela |
|---|---|---|
| A | `saveVehicle` · `publish` (→ `pending_approval` se ligada) · `unpublish` · `reopen` · `deleteVehicle` | 2a, 6e |
| A | `markSold(vehicleId, { finalPriceCents, attribution, sellerId, commissionPaid })` | 6f, 7g |
| A | `setShareOnCajugo(vehicleId, bool)` | 1c, 6e |
| A | assinatura de upload (§4.1) · `reorderPhotos` · `removePhoto` | 2a |
| página | `/painel/leads` — leads da loja, indicadores e filtros (`?status=`) (007) | 3a |
| A | `moveLeadAction({ leadId, to: "next" \| "lost" })` — `leads.manage` (dono e usuário da loja) (007) | 3a |
| A | `updateStore(form)` · `changeSlug(slug)` | 3b |
| A | `cancelSubscriptionAction({ reason? })` · `undoCancelAction()` · `resubscribeAction()` — `billing.manage` (só o dono, 011b) | 12h, 3c |
| página | seções Comissão e Vendedores dentro de `/painel/conta` (009; na própria tela desde a 012) | 7e, 7f |
| A | `setNetworkRulesAction({ acceptsSellers, commissionType, commissionValue })` · `setCommissionOverrideAction({ vehicleId, type, value })` — `sellers.manage` (009) | 7e |
| A | `decidePartnershipAction({ partnershipId, decision: "approve" \| "decline" \| "end" })` — `sellers.manage` (009) · `inviteSeller(sellerId)` (009b) | 7f, 13a |
| A | `saleTermsAction({ vehicleId, finalPriceCents, sellerId })` · `confirmSaleAction({ vehicleId, finalPriceCents, attribution, sellerId, commissionPaid })` · `undoSaleAction({ vehicleId })` — `sales.confirm` (009) | 7g |
| A | `reviewSeller(sellerId, rating, text)` · `reportSeller(sellerId, reason, details)` (009b) | 13b, 13d |

### Vendedor (Rede Caju)
| Tipo | Rota / ação | Tela |
|---|---|---|
| página | `/rede` (status ou painel) · `/rede/vitrine` · `/rede/extrato` (`?filtro=todas|a-receber|pagas`, 008b) · `/rede/conta` | 7b, 7c, 7d, 13c |
| A | `requestPartnershipAction({ storeId })` · `loadMoreSellerShowcaseAction({ query, cursor })` (008) | 7c |
| — | link do veículo: `/v/{id}?ref={code}` (montado por função única) | 7c |
| A | `sellerClickAction({ vehicleId, code })` — pública, 1 por aparelho por dia, sem robôs (008) | 1b |
| A | `setCommissionReceivedAction({ saleId, received })` — `commission.receive` (só o vendedor da venda; desfazer em até 24 h) (008b) | 7d |
| A | `updatePixKeyAction({ pixKey })` (008) | 13c |
| GET | `/api/v1/sellers/{id}/document/{side}` — foto privada do documento; admin, suporte ou o próprio vendedor (`contract.md` da 008) | 7h, 13c |

### Caju Indica
| Tipo | Rota / ação | Tela |
|---|---|---|
| página | seções Meu link, Indicações (`?filtro=`) e Crédito dentro de `/painel/conta` — lojista (`store.referral`) (010; na própria tela desde a 012) | 8a, 8b, 8e |
| página | `/indica` (indicador e vendedor) · `/indica/cadastro` (público) (010) | 9d, 9b |
| A | `registerReferrerAction(form)` — pública, honeypot + rate limit (010) | 9b |
| — | código pessoal criado no 1º acesso ao painel (`getOrCreateCode`, regras do programa) | 8a, 9d |
| A | `requestPayout({ cpf, pixKeyType, pixKey })` (saldo ≥ mínimo) (010b) | 9e |

### Admin
| Tipo | Rota / ação | Tela |
|---|---|---|
| página | `/admin` — painel [4a] / visão geral [15c] (`admin.read`, 012b) | 4a, 15c |
| página | `/admin/lojas?aba=lojas\|veiculos\|usuarios` · `/admin/lojas/[id]` (012b; o histórico da loja fica em `/admin/log`) | 1d, 6g |
| A | `createStoreByAdminAction(form)` → senha temporária uma vez · `updateStoreByAdminAction({ storeId, ... })` — `stores.manage` (só admin) · `setTemporaryPassword` (001) | 1d, 6g |
| página | `/admin/log` — históricos das regras e registro de atividade com filtros (`admin.read`, 012b) | 4c |
| A | `inviteTeamMemberAction({ name, email, role })` · `removeTeamMemberAction({ profileId })` — `team.manage` (012b) | 4c |
| página | `/admin/assinaturas` — MRR, contagens e filtros (`?filtro=`); admin e suporte veem (`subscriptions.view`), só o admin decide (011) | 4b |
| A | `suspendStoreAction({ storeId })` · `reactivateStoreAction({ storeId, reason })` — `stores.suspend` (só admin, 011) | 4b, 6g |
| A | `editPlanAction({ membershipCents, validFrom })` — `settings.edit` (só admin); data ≥ hoje + 30 dias (011b) | 4b |
| A | `approveVehicle` · `requestVehicleChanges(reason)` | 14c |
| página | `/admin/alertas` — alertas com veículo compatível e aguardando · A `markAlertNotifiedAction({ alertId })` (006d) | 12a |
| página | `/admin/denuncias` — fila de denúncias e aba `?aba=ocultados` (`admin.moderate`, 007b) | 14e |
| A | `keepReportsAction({ vehicleId })` · `hideVehicleAction({ vehicleId, reason, note })` · `showVehicleAction({ vehicleId })` (007b) · `blockSeller` por denúncia de vendedor (009) | 14e, 6f, 7h |
| página | `/admin/vendedores` — admin e suporte veem; só o admin decide (008) | 7h |
| A | `approveSellerAction({ sellerId })` · `blockSellerAction({ sellerId, reason })` · `unblockSellerAction({ sellerId })` (008) | 7h |
| A | `markPayoutPaid(payoutId)` · `createCampaignLink(name)` | 8g, 8f |
| A | `updateSettings(partial)` (todas as regras de `Config`) · `inviteTeamMember` | 4c, 8f |

### Interno
| Tipo | Rota | Uso |
|---|---|---|
| R | `GET /api/v1/cron/daily` (protegido por `CRON_SECRET`; contrato em `docs/specs/006d-search-alerts/contract.md`; ciclo de cobrança da 011) | jobs de `ARCHITECTURE.md` §6 |

---

## 6. Ao terminar uma mudança no servidor 🤖
1. Rode lint, typecheck e testes (comandos em `CLAUDE.md` quando definidos).
2. Se mudou o schema, gere a migration com o Drizzle Kit e confira o SQL gerado (sem `drop`/`rename` sem plano de transição).
3. Se uma rota `/api/v1` mudou de formato, atualize esta tabela e a spec da feature.
4. Só conclua com tudo verde.

> Quando o app Expo entrar, as ações usadas por ele viram Route Handlers com Bearer (access token do Supabase Auth) e passamos a gerar uma spec OpenAPI. Até lá, não.
