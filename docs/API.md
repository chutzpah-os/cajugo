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
| Webhook, cron, polling do Pix, upload assinado, futuro app Expo | **Route Handler** em `/api/v1/...` |

Serviços (`vehicles`, `stores`, `leads`, `subscriptions`, `admin`…) concentram regra de negócio e acesso ao banco (Drizzle). Páginas, actions e rotas são finas: validam a entrada, checam a sessão e chamam o serviço.

---

## 2. Regras 🤖

1. **Valide toda entrada com schema** (biblioteca a definir; sugestão: zod), com limites explícitos (tamanho de texto, mínimo e máximo de número, tamanho de array). Rejeite campo desconhecido.
2. **Autorização em toda action e rota**, mesmo que o botão esteja escondido na UI. A sessão vem do cookie (`SECURITY.md` §3).
3. **Posse do recurso:** o `storeId` vem da sessão, nunca do body. Carregue o recurso e confira `resource.storeId === session.storeId`; se não bater, responda **404** (não revela existência).
4. **Campos privilegiados não entram no schema de entrada do lojista:** `status` direto, `hiddenByAdmin`, `approvalStatus`, `storeId`, `role`, status da assinatura. Mudança de status só por ações específicas (publicar, vender…).
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

## 4. Fotos (Cloudinary)
1. A tela pede uma assinatura ao servidor (action ou `POST /api/v1/uploads/signature`), informando o veículo. O servidor confere a posse e o limite de 20 fotos.
2. O servidor assina os parâmetros do upload: pasta `vehicles/{vehicleId}`, `public_id` gerado pelo servidor, formatos `jpg,png,webp,heic`, tamanho máximo, remoção de metadados.
3. O navegador envia direto ao Cloudinary (a imagem não passa pela Vercel) e devolve o `publicId` ao servidor, que confere a pasta e grava no veículo.
4. Exibição sempre por URL de transformação fixa (`thumb`, `card`, `full`) com `f_auto,q_auto`.

---

## 5. Mapa de rotas e ações

A coluna "Tipo" diz se é Route Handler (**R**) ou Server Action (**A**). Cada spec detalha os seus.

### Público
| Tipo | Rota / ação | Tela |
|---|---|---|
| página | `/`, `/{slug}` — vitrine e catálogo da loja (filtros na query string) | 1a, 6d |
| página | `/v/{id}-{make}-{model}`, `/{slug}/v/{id}` — detalhe | 1b |
| A | `createLead(vehicleId, form)` | 1b |
| A | `trackWhatsappClick(vehicleId)` | 1b |
| A | `reportVehicle(vehicleId, reason, description)` | 1b |
| A | `checkSlugAvailability(slug)` | 5c |

### Auth e cadastro
| Tipo | Rota / ação | Tela |
|---|---|---|
| A | `signIn(email, password)` · `signOut()` | 6a |
| A | `updatePassword(password)` — tela Nova senha | 6b |
| A | `registerStore(form)` → usuário + loja + assinatura `awaiting_payment` | 5c |

### Assinatura
| Tipo | Rota / ação | Tela |
|---|---|---|
| A | `startSubscription(method, document)` → Pix (QR + copia e cola) ou cartão | 5d |
| R | `GET /api/v1/subscriptions/pix/{txid}/status` (polling a cada 5 s) | 6c |
| R | `POST /api/v1/webhooks/payments` | — |

### Lojista
| Tipo | Rota / ação | Tela |
|---|---|---|
| A | `saveVehicle` (cria/edita rascunho) · `publish` · `unpublish` · `markSold` · `reopen` · `deleteVehicle` | 2a, 6e, 6f |
| A | `setShareOnCajugo(vehicleId, bool)` | 1c, 6e |
| R/A | assinatura de upload (§4) · `reorderPhotos` · `removePhoto` | 2a |
| A | `updateLeadStatus(leadId, status)` | 3a |
| A | `updateStore(form)` · `changeSlug(slug)` | 3b |
| A | `updateNotifications` · `cancelSubscription` · `undoCancel` · `changePaymentMethod` | 3c |

### Admin
| Tipo | Rota / ação | Tela |
|---|---|---|
| A | `createStore` (conta do dono com senha temporária) · `updateStore` · `setTemporaryPassword` | 1d, 6g |
| A | `hideVehicle(reason)` · `unhideVehicle` · `approveVehicle` · `rejectVehicle` | 1d, 6g |
| A | `suspendStore` · `reactivateStore` | 4b, 6g |
| A | `updatePlan` · `updateShowcaseConfig` · `inviteTeamMember` | 4b, 4c |
| A | `resolveReport` | 4a |

### Interno
| Tipo | Rota | Uso |
|---|---|---|
| R | `GET /api/v1/cron/daily` (protegido por `CRON_SECRET`) | jobs de `ARCHITECTURE.md` §6 |

---

## 6. Ao terminar uma mudança no servidor 🤖
1. Rode lint, typecheck e testes (comandos em `CLAUDE.md` quando definidos).
2. Se mudou o schema, gere a migration com o Drizzle Kit e confira o SQL gerado (sem `drop`/`rename` sem plano de transição).
3. Se uma rota `/api/v1` mudou de formato, atualize esta tabela e a spec da feature.
4. Só conclua com tudo verde.

> Quando o app Expo entrar, as ações usadas por ele viram Route Handlers com Bearer (access token do Supabase Auth) e passamos a gerar uma spec OpenAPI. Até lá, não.
