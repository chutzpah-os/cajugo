---
spec: 003
status: approved
---

# Plano · 003 Cadastro do lojista, Minha loja e menu

## Resumo técnico
Dois domínios novos:
- **`stores`**: cadastro, Minha loja, endereço do catálogo e redirecionamentos.
- **`referrals`**: código pessoal e registro da indicação. É a parte antecipada da 010.

O cadastro [5c] é uma action pública, com honeypot e limite por rede. Ela cria a conta no Supabase Auth e, numa transação, o perfil, o papel (`grantRole`, `public-signup`), a loja `registered`, o código pessoal e a indicação. Depois a pessoa entra, com cookies, e vai para `/lojistas/pagamento`. Quem já está conectado cria só a loja.

Minha loja [3b] fica em `/painel/loja`:
- dados públicos, endereço em campos, horário (`jsonb` validado) e preferência de divulgar;
- logo e capa por **upload assinado direto do navegador ao Cloudinary** (assinatura feita no servidor, sem SDK);
- link e QR code;
- troca de endereço com redirecionamento de 90 dias e limite de 1 a cada 30 dias.

Páginas públicas: o menu [11a] no cabeçalho da home, a landing `/lojistas` [5b] (com as primeiras funções de SEO, `src/platform/seo/`), `/termos` [12i] e `/i/{codigo}`, que leva ao cadastro.

## Impacto
| Camada | Mudança |
|---|---|
| Banco | migration `0006`: em `stores`, endereço em colunas (`address_street`, `address_number`, `address_complement`, `address_district`, `address_zip`), `slug_changed_at` e `slug_reserved_until`; tabela `store_slug_redirects`; enum `referral_status`; tabelas `referral_codes` e `referrals` (ARCHITECTURE §4, antecipadas da 010). Remoção de `stores.address`: **D2** |
| Domínio | `src/domains/stores/` (`service.ts`, `schemas.ts`, `slug.ts`, `hours.ts`, `actions.ts`, `components/`); `src/domains/referrals/` (`service.ts`, `code.ts`); `auth` ganha `adminDeleteUser` no `AuthProvider`, para desfazer a conta se a transação falhar |
| Plataforma | `src/platform/cloudinary/` (assinatura de upload, verificação do arquivo enviado, URL de entrega `f_auto,q_auto`); `src/platform/seo/` (metadata, canônica, JSON-LD, Open Graph); `src/platform/geo/` (lista de cidades do IBGE e busca sem acento: **D3**) |
| Rotas | `/` (cabeçalho + menu [11a]); `/lojistas` [5b]; `/lojistas/cadastro` [5c]; `/i/[codigo]`; `/painel/loja` [3b]; `/termos` [12i]; `/loja/[slug]` (só redirecionamento de endereço antigo + página mínima até a 005: **D4**); `sitemap.xml` e `robots.txt` com as páginas públicas desta spec |
| UI | `src/ui/`: menu (gaveta), campo com sugestão (autocomplete), campo de imagem (enviar/trocar), aviso "Disponível/Indisponível" |
| Dependência | `qrcode` (gerar o QR code PNG no navegador): **D1** |
| Jobs | nenhum (liberação do endereço sem pagamento é da 011) |

## Desenho dos módulos (`codebase-design`)
**`stores/service.ts`:** poucas funções públicas; a regra fica escondida.
- `registerStore(deps, session | null, input, ctx)`: cadastro completo (FR-003…007, 014, 015; SEC-002). Sem sessão, cria conta e loja. Com sessão de cliente sem loja, cria só a loja. Equipe ou quem já tem loja: 403/409.
- `checkSlug(db, slug)`: `{ status: "available" | "taken" | "invalid", suggestion? }` (FR-005).
- `suggestSlug(name)`: função pura (sem acento, minúsculas, hífen, 3–40).
- `updateStore(deps, session, input)`: Minha loja (FR-008, 009, 012); loja só da sessão (SEC-001/003).
- `changeSlug(deps, session, newSlug)`: troca com limite de 30 dias e redirecionamento de 90 dias, numa transação (FR-013).
- `storeImageUpload(deps, session, kind)`: assinatura do Cloudinary para `stores/{storeId}/{logo|cover}` (SEC-004).
- `setStoreImage(deps, session, kind, publicId)`: confere a pasta da loja e o arquivo (formato e tamanho) no Cloudinary antes de salvar (FR-010, SEC-004).
- `resolveSlug(db, slug)`: `{ storeId, canonicalSlug, redirected }` para `/loja/[slug]`; o endereço antigo vale até `expires_at`.
- `storeSummary(db, session)`: saída montada à mão para Minha loja (inclui link, código pessoal e imagens).

**`referrals/service.ts`:**
- `getOrCreateCode(db, profileId, name)`: código pessoal único (`RICARDO10`: primeiro nome sem acento, em maiúsculas, mais 2 dígitos; tenta de novo se colidir) (FR-014).
- `checkCode(db, code, applicant: { email, phone })`: `{ ok, referrerName }`, `not-found` ou `self-referral` (FR-007). Não devolve dado pessoal (SEC-005).
- `registerReferral(tx, code, storeId)`: grava a indicação com status `registered`. Fica no domínio, mas é chamada só pelo `registerStore`, dentro da mesma transação.

**Plataforma**
- `cloudinary/sign.ts`: `signUpload({ folder, publicId, allowedFormats })` gera `{ signature, timestamp, apiKey, cloudName, ... }` com SHA-256 sobre os parâmetros ordenados (o mesmo algoritmo do SDK). `verifyUpload(publicId)` consulta a Admin API (formato e bytes). `imageUrl(publicId, { w })`.
- `seo/metadata.ts`: `pageMetadata({ title, description, path, image? })` gera `Metadata` com canônica e Open Graph; `jsonLd(...)` gera o `<script type="application/ld+json">` seguro (escapa `<`).

## Mapa requisito → solução
| Requisito | Solução |
|---|---|
| STO-FR-001 | `src/ui/site-menu.tsx` (gaveta do DESIGN.md) no cabeçalho de `/` e de `/lojistas`; o servidor passa o nome e os painéis da sessão (`currentSession` + `PANEL_LABEL`) |
| STO-FR-002 | `/lojistas` [5b]: conteúdo estático no servidor, FAQ, preço lido das regras (o preço do plano é da 011; até lá, texto do PRD: R$ 100), barra fixa "Prosseguir" para `/lojistas/cadastro` |
| STO-FR-003 | `registerStoreAction`: `registerStore` → `signIn` (cookies) → `redirect('/lojistas/pagamento')`. Login posterior: `landingFor` já manda `registered` para o pagamento (001) |
| STO-FR-004 | `stores/schemas.ts` `registerStoreSchema` (zod, `.strict()`): nome 2–60, cidade válida da lista do IBGE, telefones BR (10–11 dígitos), e-mail, senha ≥ 8, `terms: true` |
| STO-FR-005 | `suggestSlug` no navegador (função pura compartilhada) + `checkSlugAction` com debounce; a unicidade final é a restrição `unique` do banco (corrida → 409 "Indisponível") |
| STO-FR-006 | Insert com `status: 'registered'` (padrão do banco) e `slug_reserved_until = now + 7 dias` (usado pela 011) |
| STO-FR-007 | `checkCodeAction` ao vivo + `registerReferral` na transação; `?codigo=` preenche o campo; autoindicação compara e-mail e celular normalizados de quem indicou e de quem se cadastra |
| STO-FR-008 | `updateStore` com `storeUpdateSchema` (sobre ≤ 2.000; Instagram `@usuario` ou URL normalizada; CEP 8 dígitos; WhatsApp BR) |
| STO-FR-009 | `hours.ts`: `{ mon…sun: { closed } \| { ranges: [{ from: "08:00", to: "18:00" }] } }`, validado (fim > início, até 3 intervalos por dia, sem sobreposição) |
| STO-FR-010 | Campo de imagem: `storeImageUploadAction` (assinatura) → upload direto ao Cloudinary → `setStoreImageAction(publicId)` → `verifyUpload` → salva `logo_public_id`/`cover_public_id` |
| STO-FR-011 | `storeUrl(slug)` (função única, ADR 0009) em `src/platform/http/urls.ts`; "Copiar link" (Clipboard API), "Baixar QR code" (`qrcode` → PNG, **D1**), "Compartilhar" (Web Share, com "copiar" como alternativa), "Ver como cliente" (`/loja/{slug}`) |
| STO-FR-012 | `share_by_default` em `updateStore` (já existe a coluna) |
| STO-FR-013 | `changeSlug`: confere o formato e a disponibilidade, e o limite `slug_changed_at + 30 dias`; insere `store_slug_redirects(old_slug, store_id, expires_at = now + 90 dias)`, atualiza o slug, numa transação; `/loja/[slug]` com endereço antigo e válido → `permanentRedirect` para o novo |
| STO-FR-014 | `getOrCreateCode` no `registerStore` (para quem ganha o papel de lojista); `/i/[codigo]` → `redirect('/lojistas/cadastro?codigo=CODIGO')` (a landing [8c] completa é da 010) |
| STO-FR-015 | Sem sessão e com e-mail existente → erro no campo e-mail "Se você já tem conta, entre para continuar" com link `/entrar?next=/lojistas/cadastro`. Com sessão, o formulário esconde os dados de conta; `registerStore` recusa equipe (AUT-SEC-009 via `grantRole`) e quem já tem loja |
| STO-FR-016 | `/termos` estático com abas (Termos e Privacidade), texto do rascunho do PRD [12i] e o aviso "Versão inicial, em revisão" |
| STO-NFR-001 | `pageMetadata` + JSON-LD (`Organization` + `Service`/`Offer` do plano) + Open Graph em `/lojistas`; `sitemap.ts` e `robots.ts` (bloqueando `/painel`, `/admin`, `/rede`, `/indica` menos os cadastros, `/entrar`, `/conta`, `/nova-senha`, `/lojistas/pagamento`); e2e do SEO.md §5 (título, descrição, canônica, JSON-LD no HTML) |
| STO-NFR-002 | e2e com `audit()` em `/`, `/lojistas`, `/lojistas/cadastro`, `/painel/loja`, `/termos` |
| STO-SEC-001 | `storeId` sempre da sessão (`authorizeStore`); as actions não recebem id de loja |
| STO-SEC-002 | `HoneypotField` + `consumeRateLimit` (`publicForm` 5/min e `publicFormDaily` 30/dia por IP com hash) no cadastro e nas checagens ao vivo; `grantRole(..., 'public-signup')` só aceita lojista |
| STO-SEC-003 | `authorizeTo('store.edit')` em `updateStore`, `changeSlug` e imagens (o usuário da loja recebe 403); a página usa `requireStorePage(..., 'store.edit')` |
| STO-SEC-004 | Assinatura com `folder = stores/{storeId}`, `public_id` do servidor e `allowed_formats=jpg,png,webp,heic`; o navegador recusa > 15 MB antes de enviar; `setStoreImage` recusa `publicId` fora da pasta e confere formato e bytes ≤ 15 MB na Admin API; a entrega é sem metadados (padrão do Cloudinary) |
| STO-SEC-005 | `checkCode` devolve só o nome de quem indicou; a comparação de e-mail e celular fica no servidor; nada de indicação aparece em página pública |

## Modelo de dados (migration `0006`)
```ts
// stores: + colunas
addressStreet: text("address_street"), addressNumber: text("address_number"),
addressComplement: text("address_complement"), addressDistrict: text("address_district"),
addressZip: text("address_zip"),                      // 8 dígitos
slugChangedAt: timestamp("slug_changed_at", { withTimezone: true }),
slugReservedUntil: timestamp("slug_reserved_until", { withTimezone: true }),

export const storeSlugRedirects = pgTable("store_slug_redirects", {
  oldSlug: text("old_slug").primaryKey(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}).enableRLS();

export const referralStatus = pgEnum("referral_status",
  ["invited", "registered", "active", "paused", "ended"]);

export const referralCodes = pgTable("referral_codes", {
  code: text("code").primaryKey(),                      // maiúsculas, [A-Z0-9]
  profileId: uuid("profile_id").references(() => profiles.id).unique(),
  campaignName: text("campaign_name"),                  // links de campanha (010)
  active: boolean("active").notNull().default(true),
  ...timestamps,
}).enableRLS();

export const referrals = pgTable("referrals", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  code: text("code").notNull().references(() => referralCodes.code),
  referrerId: uuid("referrer_id").references(() => profiles.id),
  referredStoreId: uuid("referred_store_id").notNull().references(() => stores.id).unique(),
  status: referralStatus("status").notNull().default("registered"),
  monthsPaid: integer("months_paid").notNull().default(0),   // usado na 010
  ...timestamps,
}, (t) => [index("referrals_referrer_status").on(t.referrerId, t.status)]).enableRLS();
```
Índices: `referrals(referrer_id, status)` (ARCHITECTURE §4); `store_slug_redirects` pela PK; `stores.slug` já é `unique`.

## Estratégia de testes
| Nível | O que cobre |
|---|---|
| Unitário | `suggestSlug` e as regras do endereço (FR-005); horário (FR-009); geração do código (FR-014); `signUpload` (assinatura conhecida do Cloudinary); `pageMetadata`/`jsonLd` (NFR-001); busca de cidades sem acento |
| Integração (PGlite + provedor falso + Cloudinary falso) | `registerStore`: visitante, conectado, equipe recusada, e-mail existente, honeypot, limite por rede, transação desfeita se falhar (FR-003, 004, 006, 007, 014, 015; SEC-002); `checkCode` (inexistente, autoindicação por e-mail ou celular, SEC-005); `updateStore` e loja B (SEC-001); usuário da loja (SEC-003); `changeSlug` (limite de 30 dias, redirecionamento de 90 dias); `setStoreImage` (pasta de outra loja, formato, tamanho; SEC-004); `resolveSlug` |
| e2e (staging, 390 px) | menu deslogado e logado (FR-001); landing → cadastro (FR-002); cadastro completo → pagamento, com o código vindo do link `/i/...` (FR-003, 007, 014); "Indisponível" ao vivo (FR-005); conta existente (FR-015); Minha loja: salvar, horário, copiar link, QR (FR-008, 009, 011, 012); troca de endereço e redirecionamento (FR-013); termos (FR-016); SEO no HTML de `/lojistas` (NFR-001); acessibilidade (NFR-002). O e2e de logo e capa usa uma imagem pequena enviada ao Cloudinary de staging (pasta `staging/`) |

O `pnpm e2e:seed` passa a apagar as lojas criadas pelos testes de cadastro (e-mails `e2e-cadastro-*@cajugo.test`) e as contas delas, para cada rodada começar do zero.

## Riscos e alternativas descartadas
- **SDK do Cloudinary** → descartado: a assinatura é um SHA-256 de poucos parâmetros, e o SDK pesa e traz recursos que não usamos. Risco: errar o algoritmo. Mitigação: teste com um vetor conhecido e e2e real no staging.
- **Lista de cidades por API externa a cada busca** → descartado: depende de rede e de cota. A lista do IBGE é estática (~5.570 cidades, ~150 KB), fica versionada e é atualizada à mão quando preciso (**D3**).
- **Validar a cidade só no navegador** → descartado: o servidor valida contra a mesma lista.
- **E-mail existente:** a mensagem "Se você já tem conta, entre para continuar" ainda deixa inferir que a conta existe. O limite por rede reduz a enumeração em massa (decisão da spec, STO-FR-015).
- **Conta criada no Auth e transação do banco falhando** deixaria uma conta órfã. Mitigação: `adminDeleteUser` ao falhar, e o e2e cobre o caminho feliz.
- **Gerar o QR code no servidor** (rota que devolve PNG) → descartado: a rota seria pública e consumiria cota; no navegador não custa nada.
- **Redirecionar endereço antigo no `proxy.ts`** → descartado: o proxy roda em toda requisição e passaria a consultar o banco; na página `/loja/[slug]`, a consulta só acontece para quem abre uma loja.

## Decisões (aprovadas pelo dono em 2026-11-08)
- **D1.** Dependência `qrcode`, só no navegador, para o QR code em PNG.
- **D2.** Migration `0006` remove `stores.address` (vazia em staging e prod) e cria os campos separados.
- **D3.** Lista de cidades do IBGE versionada em `src/platform/geo/`.
- **D4.** `/loja/[slug]` redireciona endereço antigo e mostra uma página mínima até o catálogo da 005.
- **D5.** `referral_codes` e `referrals` antecipadas da 010 (decisão do `/clarify`).

## Conformidade (SDD §6.3)
- [x] Todo requisito da spec aparece no mapa (16 FR, 2 NFR, 5 SEC)
- [x] Actions seguem o `API.md` §2: schemas `.strict()` com limites; sessão; `storeId` da sessão; saída montada à mão (`storeSummary`, `checkCode`); transação no cadastro e na troca de endereço; `activity_log` em `store.registered` e `store.slug_changed`
- [x] Toda action com id checa a posse: não recebe id de loja (vem da sessão); `publicId` da imagem é conferido contra a pasta da loja
- [x] Schemas sem campos privilegiados: `status`, `storeId`, `roles`, `slug_reserved_until` e indicação vêm do servidor
- [x] Dados pessoais novos na tabela do `SECURITY.md` §8: e-mail e celular de quem se cadastra (checagem de autoindicação) incluídos; o endereço da loja é público por escolha do lojista
- [x] Formulário público com honeypot e limite por rede (cadastro e checagens ao vivo)
- [x] Consultas novas têm índice: `referrals(referrer_id, status)`, PKs e `unique` em `stores.slug` e `referrals.referred_store_id`
- [x] Migrations aditivas, exceto D2 (remove `stores.address`, vazia), aprovada pelo dono
- [x] Nada do Supabase além de Postgres e Auth
