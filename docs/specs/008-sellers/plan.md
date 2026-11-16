---
spec: 008
status: approved
---

# Plano · 008 Rede Caju · vendedor

## Resumo técnico
Domínio novo `sellers` (previsto no `ARCHITECTURE.md` §3).
- **Cadastro [7a]:** em dois passos (D1).
  - O primeiro cria a conta, ou acrescenta o papel de vendedor a uma conta que já existe (conta única), com o vendedor **Em análise**.
  - O segundo, já logado, envia a foto do documento (frente e verso) por upload assinado privado (`authenticated`), como o comprovante da 004 (ADR 0011).
  - Sem as duas fotos, o cadastro não fica completo e o admin não aprova.
- **Curadoria [7h]:** em `/admin/vendedores`.
  - O admin e o suporte veem a tela; só o admin decide.
  - As fotos abrem por uma rota nossa que confere a sessão a cada abertura (`GET /api/v1/sellers/{id}/document/{side}`, `contract.md`).
  - Aprovar gera o **código do vendedor**, usado no `?ref=`.
- **Link e clique:**
  - O `?ref=` já é guardado pelo `proxy.ts` no cookie `cajugo_ref` (006, SHW-FR-009).
  - O clique é contado por uma ilha de cliente na página do veículo, que continua em cache. É uma por aparelho por dia, sem robôs, como a visualização da 007.
  - O lead lê o cookie na action e fica com o vendedor só se ele estiver ativo e for parceiro da loja.
- **Vitrine [7c]:** é a mesma busca da vitrine (`searchShowcase`), mais o estado de parceria de cada loja e a comissão calculada no servidor.
  - A comissão da loja passa a existir no banco agora (D2); a tela de configurar vem na 009.

## Impacto
| Camada | Mudança |
|---|---|
| Dados (migration `0018`, aditiva) | Enums `seller_status`, `partnership_status`, `partnership_origin`, `commission_type`. `profiles` + `cpf` (único quando preenchido), `pix_key`, `pix_key_type` (D3). Tabelas `sellers`, `partnerships`, `seller_vehicle_clicks`. `stores` + `commission_type`, `commission_value` (D2). `leads` + `seller_id`; `lead_origin` + `seller`. |
| `src/domains/sellers/` (novo) | `service.ts`, `schemas.ts`, `actions.ts`, `status.ts` (rótulos, sem servidor), `commission.ts` (cálculo, sem servidor), `components/` (cadastro, documento, status, painel, vitrine, conta, admin) |
| `src/domains/leads/` | `contactStore` e `recordWhatsappClick` recebem o código do cookie e gravam `seller_id` e a origem `seller` quando vale (SEL-FR-011). [3a] mostra "via vendedor {nome}". `ViewPing` ganha a contagem do clique do link. |
| `src/domains/auth/` | Permissões `sellers.view` (admin, suporte) e `sellers.review` (já existe, só admin). `AREA_NAV.rede`: Início · Vitrine · Extrato · Conta. Papel `seller` acrescentado a uma conta que já existe (`addRole`). |
| `src/platform/pix/` | `pixKeySchema` (tipos e formato da chave), tirado de `settings/definitions.ts` (D4); `settings` e `sellers` usam. |
| `src/app/` | `/rede/cadastro` e `/rede/cadastro/documento` (público e logado), `/rede` (status ou painel), `/rede/vitrine`, `/rede/extrato` (aviso até a 008b), `/rede/conta`, `/admin/vendedores`, `GET /api/v1/sellers/[id]/document/[side]`. |
| Jobs | Nenhum |

## Interfaces dos serviços (módulos profundos)
```ts
// domains/sellers/service.ts
registerSeller(deps, session | null, raw, ctx: { ipHash; honeypotFilled }) // SEL-FR-001, 016, SEC-003
  : Promise<{ userId: string }>     // cria conta ou acrescenta o papel; vendedor in_review
documentUpload(deps, session, side: "front" | "back"): Promise<SignedUpload>          // SEL-FR-001, SEC-009
attachDocument(deps, session, raw: { side; publicId }): Promise<void>                 // confere pasta, formato e tamanho
sellerHome(db, session, now): Promise<SellerHome>                                      // SEL-FR-002, 006
//   SellerHome = { kind: "status"; status: "in_review" | "blocked"; reason; documentsMissing }
//              | { kind: "panel"; clicksThisMonth; stores: { storeId; name; status: "partner" | "pending" }[] }
sellerShowcase(db, session, input: { filters; cursor }): Promise<SellerShowcase>      // SEL-FR-007, 008, 009
//   cards da vitrine + { shareUrl, partner: "partner" | "pending" | "none" | "closed", earnCents | null }
requestPartnership(db, session, raw: { storeId }): Promise<"pending">                 // SEL-FR-009 (idempotente)
recordSellerClick(db, raw: { vehicleId; code }, ctx: { ipHash; userAgent; now })      // SEL-FR-010
sellerForLead(db, code: string | null, storeId): Promise<{ sellerId; name } | null>   // SEL-FR-011, SEC-006
sellerAccount(db, session) / updatePixKey(db, session, raw)                           // SEL-FR-014, SEC-001, 002
sellersAdmin(db, session): Promise<SellersAdmin>                                      // SEL-FR-003, SEC-005
approve / block / unblock(db, session, raw, now): Promise<boolean>                    // SEL-FR-004, 005, SEC-005, 007
documentFile(deps, session, sellerId, side): Promise<PrivateFile>                     // SEL-SEC-009 (rota)
```
Regras que ficam escondidas:
- **Vendedor que vale:** só o ativo gera link, conta clique e marca lead. A parceria só vale com o vendedor ativo; o bloqueio não muda a parceria, que volta sozinha ao desbloquear (SEL-FR-005).
- **Código do vendedor:** gerado ao aprovar a partir do primeiro nome, sem acento e em maiúsculas, mais 2 dígitos se já existir. Fica no formato que o `parseRefCode` aceita (`[A-Z0-9]{3,20}`) e nunca muda.
- **Comissão:** `commission.ts` calcula `pct` (pontos-base) sobre o preço ou o valor fixo em centavos. Ela não vem do navegador (SEL-SEC-008).

## Mapa requisito → solução
| Requisito | Solução |
|---|---|
| SEL-FR-001 | `/rede/cadastro`: `registerSellerAction` com `sellerSignupSchema` (`.strict()`; nome, CPF com `isValidCpf`, celular `brPhoneSchema`, e-mail, cidade, chave Pix com `pixKeySchema`, senha, termos, honeypot). Cria o usuário no Auth (como `registerStore`), o `profile` com `roles = {seller}`, CPF e Pix, e o `sellers` `in_review`. Entra logado em `/rede/cadastro/documento`: duas fotos (frente e verso) por upload assinado `authenticated` na pasta `sellers/{profileId}`, conferidas em `attachDocument` (jpg, png, webp, heic ou pdf; até 10 MB; senão, apaga do Cloudinary). Depois da segunda foto: confirmação "Em análise". |
| SEL-FR-002 | `/rede` chama `sellerHome`: `in_review` mostra "Cadastro em análise" (ou "Envie a foto do documento" se faltar); `blocked` mostra "Conta bloqueada" com o motivo. As páginas `/rede/vitrine` e `/rede/conta` (Pix) exigem vendedor ativo; senão, voltam a `/rede`. |
| SEL-FR-003 | `/admin/vendedores` (`sellers.view`): `sellersAdmin` dá os indicadores e as três listas (em análise do mais antigo, ativos, bloqueados), com nome, cidade, celular, CPF completo e data. |
| SEL-FR-004 | Card em análise com links "Frente" e "Verso" (rota do documento) e **Aprovar** (`sellers.review`). `approve` muda `in_review` → `active`, gera o código e grava `activity_log`. Sem as duas fotos, Aprovar fica desabilitado e o servidor recusa (409). |
| SEL-FR-005 | **Bloquear** (motivo de 3 a 200 caracteres) e **Desbloquear**: `active` ⇄ `blocked`, com `blocked_reason`, `activity_log`. A regra "vendedor que vale" tira o vendedor bloqueado dos leads e das parcerias sem mexer nelas. |
| SEL-FR-006 | `sellerHome` no painel: cliques do mês (soma de `seller_vehicle_clicks` desde o dia 1 de São Paulo) e as lojas com parceria `active` ou `pending`. |
| SEL-FR-007 | `/rede/vitrine`: `searchShowcase({ scope: "showcase", filters })` com a mesma barra de busca e filtros de [1a] e "Carregar mais" de 20 em 20. |
| SEL-FR-008 | `sellerShowcase` junta a cada card a parceria da loja e `earnCents = commissionFor(loja, preço)` só na loja parceira com comissão definida. **Compartilhar** em todo card: copiar `${APP_URL}/v/{id}-…?ref={codigo}` e `wa.me` com a mensagem pronta. |
| SEL-FR-009 | **Pedir parceria**: `requestPartnership` grava `partnerships (origin request, status pending)`; o índice único parcial (vendedor, loja) com status `pending`/`active` torna o repetido inofensivo. Botão desabilitado com "Esta loja não aceita vendedores" fica pronto para a 009 (`accepts_sellers`); até lá, toda loja aceita. |
| SEL-FR-010 | `SellerClickPing` (ilha na página do veículo): lê `ref` da URL, marca no aparelho por dia (`claimOncePer` de 24 h por vendedor + veículo, chave `cajugo:seller-clicks:v1`) e chama `sellerClickAction`. O servidor filtra robôs (`isKnownBot`), limita por rede (`liveCheck`) e soma em `seller_vehicle_clicks (seller, veículo, dia)` só para vendedor ativo. |
| SEL-FR-011 | `contactLeadAction` e `whatsappClickAction` leem o cookie `cajugo_ref`; o serviço de leads pergunta `sellerForLead(código, loja)` e grava `seller_id` e a origem `seller`. [3a]: selo "via vendedor {nome}" (nome do vendedor lido no quadro, sem CPF nem contato). |
| SEL-FR-012, 013 | ~~Movidos para a 008b~~ |
| SEL-FR-014 | `/rede/conta`: CPF mascarado (`maskTaxId`), chave Pix com **Trocar** (`updatePixKey` com `pixKeySchema`, `activity_log` sem a chave), links (dados, lojas parceiras, Caju Indica, termos, sair) e os avisos "em breve". |
| SEL-FR-015 | `AREA_NAV.rede` com os 4 itens `mobile: true`; `/rede/extrato` mostra o estado vazio "Suas vendas aparecem aqui quando a loja confirmar". |
| SEL-FR-016 | `registerSeller` com sessão: acrescenta `seller` aos `roles` da conta (`addRole`, sem nova senha) e cria o `sellers`. Sem sessão e com e-mail que já existe: erro no campo "Se você já tem conta, entre para continuar." com o link Entrar, que volta para `/rede/cadastro`. Conta da equipe (admin, suporte) é recusada pela regra que já existe (AUT-SEC-009). |
| SEL-NFR-001 | Componentes base (44 px); e2e em 390 e 1280 px com `audit()` |
| SEL-NFR-002 | O ping é ilha de cliente que não bloqueia a renderização; a página e a canônica não mudam. Medição de LCP/CLS no e2e de produção com `?ref=`. |
| SEL-NFR-003 | Mesma consulta e cache de dados da vitrine; 20 por página |
| SEL-SEC-001 | Coluna `profiles.cpf`; só `sellersAdmin` devolve o CPF completo; `sellerAccount` devolve `maskTaxId`; o lead e a vitrine nem leem o CPF. |
| SEL-SEC-002 | `pix_key` só sai em `sellerAccount` (próprio vendedor) e em `sellersAdmin`; a leitura para as lojas parceiras fica para a 009, que paga a comissão. |
| SEL-SEC-003 | `isHoneypotFilledIn` + `withinPublicFormLimits(db, "seller-signup", ipHash)`; CPF repetido (índice único) → erro no campo "CPF já cadastrado." com o link Entrar. |
| SEL-SEC-004 | Toda leitura e escrita do vendedor usa `session.userId` como `seller_id` no `where`; `requestPartnership` recebe só a loja. |
| SEL-SEC-005 | `sellers.view` (admin, suporte) para ver; `sellers.review` (admin) para decidir; [7h] esconde os botões de quem não decide. |
| SEL-SEC-006 | O código só é lido no servidor (cookie `httpOnly`); a página do veículo não muda; `sellerForLead` devolve `null` para código inexistente, vendedor não ativo ou sem parceria. |
| SEL-SEC-007 | `logActivity` com `seller.approved`, `seller.blocked` (motivo) e `seller.unblocked`, entidade `seller`, sem CPF nem chave Pix. |
| SEL-SEC-008 | Status do vendedor e da parceria só mudam no servidor; a comissão é calculada no servidor a partir da loja; nenhum schema aceita status, código ou valores. |
| SEL-SEC-009 | Fotos `authenticated` na pasta `sellers/{profileId}`; `documentFile` confere `sellers.view` ou o próprio vendedor e devolve o arquivo com `Cache-Control: private, no-store` (ADR 0011); outro → 404. |

## Modelo de dados
```ts
export const sellerStatus = pgEnum("seller_status", ["in_review", "active", "blocked"]);
export const partnershipStatus = pgEnum("partnership_status", ["pending", "active", "declined", "ended"]);
export const partnershipOrigin = pgEnum("partnership_origin", ["request", "invite"]);
export const commissionType = pgEnum("commission_type", ["pct", "fixed"]);

// profiles (colunas novas, anuláveis; 010 reusa para o resgate do indicador)
cpf: text("cpf"),                       // só dígitos; único quando preenchido
pixKey: text("pix_key"), pixKeyType: text("pix_key_type"),

export const sellers = pgTable("sellers", {
  profileId: uuid("profile_id").primaryKey().references(() => profiles.id),
  code: text("code").unique(),          // nulo até aprovar
  city: text("city").notNull(),
  status: sellerStatus("status").notNull().default("in_review"),
  documentFront: text("document_front_public_id"), documentFrontFormat: text("document_front_format"),
  documentBack: text("document_back_public_id"),   documentBackFormat: text("document_back_format"),
  blockedReason: text("blocked_reason"),
  decidedBy: uuid("decided_by").references(() => profiles.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  ...timestamps,
}, (t) => [index("sellers_status_created").on(t.status, t.createdAt)]).enableRLS();

export const partnerships = pgTable("partnerships", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  sellerId: uuid("seller_id").notNull().references(() => sellers.profileId),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  origin: partnershipOrigin("origin").notNull(),
  status: partnershipStatus("status").notNull().default("pending"),
  ...timestamps, endedAt: timestamp("ended_at", { withTimezone: true }),
}, (t) => [
  uniqueIndex("partnerships_open").on(t.sellerId, t.storeId).where(sql`${t.status} in ('pending','active')`),
  index("partnerships_store_status").on(t.storeId, t.status),
]).enableRLS();

export const sellerVehicleClicks = pgTable("seller_vehicle_clicks", {
  sellerId: uuid("seller_id").notNull().references(() => sellers.profileId),
  vehicleId: uuid("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  day: date("day").notNull(),
  clicks: integer("clicks").notNull().default(0),
}, (t) => [primaryKey({ columns: [t.sellerId, t.vehicleId, t.day] })]).enableRLS();

// stores (anuláveis; a tela de configurar é da 009)
commissionType: commissionType("commission_type"), commissionValue: integer("commission_value"), // bps ou centavos
// leads
sellerId: uuid("seller_id").references(() => sellers.profileId),
```
```sql
-- 0018 (aditiva)
CREATE TYPE ...; ALTER TYPE "lead_origin" ADD VALUE 'seller';
ALTER TABLE "profiles" ADD COLUMN "cpf" text, ADD COLUMN "pix_key" text, ADD COLUMN "pix_key_type" text;
CREATE UNIQUE INDEX "profiles_cpf" ON "profiles" ("cpf") WHERE "cpf" IS NOT NULL;
CREATE TABLE "sellers" (...); CREATE TABLE "partnerships" (...); CREATE TABLE "seller_vehicle_clicks" (...);
ALTER TABLE "stores" ADD COLUMN "commission_type" "commission_type", ADD COLUMN "commission_value" integer;
ALTER TABLE "leads" ADD COLUMN "seller_id" uuid REFERENCES "sellers"("profile_id");
```
O e2e apaga contas de teste: as tabelas novas entram na limpeza do seed (`removeE2ESignups`), na ordem das FKs.

## Estratégia de testes
| Requisito | Unitário | Integração (PGlite) | e2e (staging) |
|---|---|---|---|
| SEL-FR-001 | schema (CPF, Pix, telefone, termos) | conta + vendedor `in_review`; foto fora do formato apagada; sem fotos não completa | cadastro e envio das fotos |
| SEL-FR-002 | — | `sellerHome` em análise, faltando foto, bloqueado com motivo | tela de status |
| SEL-FR-003 | — | indicadores e ordem das listas | [7h] |
| SEL-FR-004 | geração do código | aprovar gera código único; sem fotos → 409 | aprovar |
| SEL-FR-005 | — | bloquear com motivo, parceria fica e deixa de valer, desbloquear volta | bloquear e desbloquear |
| SEL-FR-006 | — | cliques do mês e lojas com status | painel |
| SEL-FR-007 | — | mesma lista da vitrine com filtro | filtro "BMW" |
| SEL-FR-008 | `commissionFor` (% e fixo) | "Você ganha" só em parceira com comissão | Compartilhar copia o link |
| SEL-FR-009 | — | pedido repetido não duplica | Pedir parceria |
| SEL-FR-010 | marca por dia | robô e vendedor bloqueado não contam | 2 aberturas → 1 clique |
| SEL-FR-011 | — | lead com vendedor parceiro; sem parceria, bloqueado e código falso → sem vendedor | formulário pelo link → selo em [3a] |
| SEL-FR-014 | — | troca de chave Pix válida e inválida | conta |
| SEL-FR-015 | menu | — | menu 390 e 1280 |
| SEL-FR-016 | — | conta de lojista ganha o papel; e-mail existente sem sessão → "entre" | — |
| SEL-NFR-001/002/003 | — | — | `audit()`; LCP/CLS com `?ref=` no build de produção |
| SEL-SEC-001 | `maskTaxId` | CPF só no admin | — |
| SEL-SEC-002 | — | Pix fora do lead e da vitrine | — |
| SEL-SEC-003 | honeypot | 6º envio; CPF repetido | — |
| SEL-SEC-004 | — | vendedor B não lê nem pede pelo A | — |
| SEL-SEC-005 | — | suporte e demais → 403 nas decisões | suporte sem botões |
| SEL-SEC-006 | — | HTML da página sem dados do vendedor | — |
| SEL-SEC-007 | — | `activity_log` sem CPF nem Pix | — |
| SEL-SEC-008 | schemas sem campos privilegiados | — | — |
| SEL-SEC-009 | — | rota: admin, suporte e dono 200; outros 404 | admin abre a foto |

## Riscos e alternativas descartadas
- **Upload antes de a conta existir:** assinar upload para visitante permitiria encher o Cloudinary sem conta. Fica o segundo passo logado (D1).
- **`ALTER TYPE lead_origin ADD VALUE`** na mesma migration: o valor não é usado nela; teste de migration no PGlite.
- **Mudança no lead (007):** `contactStore` ganha um parâmetro; os testes da 007 seguem verdes, e os novos cobrem o vendedor.
- **Descartado: guardar o vendedor no lead pelo navegador.** O cookie `httpOnly` do proxy já existe e não expõe o código a scripts.
- **Descartado: comissão só na 009.** Sem ela, "Você ganha" (SEL-FR-008) não tem como ser testado nem mostrado; a coluna entra agora e a tela, na 009.

## Decisões (aprovadas em 2026-11-16)
- **D1. Cadastro em dois passos:** dados e conta primeiro; fotos do documento já logado, no passo seguinte. **Recomendo:** o upload privado assinado exige dono, e é como o comprovante da 004. Sem as fotos, o cadastro aparece como "faltando documento" e não pode ser aprovado.
- **D2. Comissão da loja no banco já na 008** (`stores.commission_type`, `commission_value`), sem tela; a 009 cria [7e]. **Recomendo:** é o que permite "Você ganha R$ X" (SEL-FR-008) e o teste dele.
- **D3. CPF e chave Pix em `profiles`**, como o `ARCHITECTURE.md` §4 já prevê, para a 010 (resgate do indicador) reusar. CPF único quando preenchido.
- **D4. `pixKeySchema` em `src/platform/pix/`**, tirado de `settings/definitions.ts`, usado por `settings` e `sellers`.
- **D5. Máscara do CPF:** usar a que já existe (`maskTaxId`: `529.***.***-25`) em vez do exemplo da spec (`***.456.789-**`). **Muda o exemplo do critério da SEL-SEC-001.**
- **D6. Origem `seller` no lead** (valor novo de `lead_origin`) + `leads.seller_id`, como previsto no plano da 007.

## Ajustes de documento (na T001, com as decisões)
- **ARCHITECTURE §4:** `sellers` (com os campos das fotos e o motivo do bloqueio), `partnerships` sem `suspended` (o bloqueio é do vendedor), `stores.commission_*`, `leads.seller_id`.
- **API.md §5:** actions do vendedor e do admin; rota do documento.
- **SECURITY §8:** fotos do documento do vendedor (só admin, suporte e dono; rota do servidor).
- **GLOSSARY:** Código do vendedor; status do vendedor (Em análise, Ativo, Bloqueado); Curadoria.

## Conformidade
- [x] Todo requisito da spec aparece no mapa requisito → solução (14 FR ativos, 3 NFR, 9 SEC)
- [x] Actions seguem o `API.md` §2:
  - schemas `.strict()` com limites;
  - sessão e permissão em cada action;
  - `activity_log` nas decisões e na troca de chave Pix;
  - saída montada à mão.
- [x] Posse checada em toda action com id: o vendedor só age como ele mesmo (`session.userId`); as decisões são da equipe; documento de outro → 404.
- [x] Schemas de entrada sem campo privilegiado (status, código, comissão, `seller_id`)
- [x] Dados pessoais novos (CPF, chave Pix, fotos do documento) com regra de quem vê (`SECURITY.md` §8 atualizado na T001)
- [x] Formulário público com honeypot + rate limit
- [x] Upload privado com `authenticated` e entrega pela rota do servidor (ADR 0011); `contract.md` gerado
- [x] Consultas novas com índice (status do vendedor, parceria aberta, cliques por dia)
- [x] Migration aditiva; nada do Supabase além de Postgres e Auth; nenhuma dependência nova
- [x] D1–D6 aprovadas em 2026-11-16; exemplo da SEL-SEC-001 ajustado (D5)
