---
spec: 012b
status: approved
---

# Plano · 012b Admin · painel, lojas, usuários e detalhe da loja

## Resumo técnico
A 012b é quase toda **leitura**: as decisões (confirmar Pix, aprovar, ocultar, suspender, senha temporária) já existem nas specs 004, 005, 007b, 008, 011 e 001 e são reaproveitadas. O trabalho novo:

1. **Domínio novo `admin`** (`src/domains/admin/`): orquestração só de leitura. Monta o painel [4a]/[15c] e os logs de atividade a partir dos `service.ts` dos outros domínios, sem tabela própria nem regra de negócio. Assim a página continua fina (ARCHITECTURE §3) e nenhum domínio de negócio passa a conhecer a tela do admin.
2. **`stores`:**
   - lista de lojas [1d] e detalhe [6g];
   - Nova loja pelo admin (a conta do dono com senha temporária, reaproveitando o `setTemporaryPassword` da 001);
   - Editar dados da loja (o mesmo schema de Minha loja, menos endereço e dono).
3. **`auth`:** a lista de usuários [1d] e a Equipe CajuGo [4c] (Convidar e Remover).
4. **Telas** sobre a base visual da 012:
   - `LightHeader` com as abas;
   - `StoreCard`, `KeyValue`, `Kpi`;
   - filas inline do [15c] com os componentes de decisão que já existem.

## Impacto
| Camada | Mudança |
|---|---|
| Dados (migration `0024`, só acrescenta) | Índices em `activity_log`: `(created_at desc)` e `(entity_id, created_at desc)`, para os Logs e o Histórico da loja (20 por vez, filtros). Nenhuma coluna nova |
| `src/domains/admin/` (novo) | `adminDashboard`, `activityLogView`, `storeHistory`; componentes do painel e dos logs |
| `src/domains/stores/` | `storesAdmin`, `storeDetail`, `createStoreByAdmin`, `updateStoreByAdmin` |
| `src/domains/auth/` | `usersAdmin`, `teamView`, `inviteTeamMember`, `removeTeamMember` (encerra as sessões com o `adminSignOutAll`) |
| `src/domains/billing/` | Leitura para o painel: `billingSnapshot(db, now)` (MRR, mensalidades pagas no período e no mesmo período do mês anterior, comprovantes a conferir, vencimentos em 3 dias, atrasadas, cadastradas sem pagamento) e `storeBilling(db, storeId)` para o card Assinatura de [6g] |
| `src/domains/leads/`, `vehicles/`, `sellers/`, `moderation/`, `buyers/` | Contagens para o painel: `leadsSnapshot` (mês, mês anterior no mesmo período, origem, top lojas); `vehiclesSnapshot` (na vitrine, publicados no mês, aguardando aprovação, primeiros da loja); `sellersInReview`; `openReportsCount` (já existe); `cachedPendingAlerts` (já existe) |
| `src/app/admin/` | `/admin` ([4a]/[15c]); `/admin/lojas?aba=lojas\|veiculos\|usuarios` ([1d]); `/admin/lojas/nova`; `/admin/lojas/[id]` ([6g]); `/admin/lojas/[id]/editar`; `/admin/conta` com Equipe; `/admin/log` (item Log: regras, logs de atividade e histórico por loja, 012). Já saiu a página provisória `/admin/senha-temporaria`: a busca ficou no Painel admin e depois vai para [6g] e Usuários |
| Navegação | `AREA_NAV.admin` no celular: Painel · Lojas · Assinaturas · Conta · Mais (já é assim); contadores da sidebar: Pagamentos Pix, Veículos (aprovação), Rede Caju (em análise), Assinaturas (atrasadas) |
| Documentos | ARCHITECTURE §3 (domínio `admin`, só leitura); API.md §5 (rotas e actions novas); GLOSSARY (Equipe CajuGo) |

## Interfaces dos serviços
```ts
// domains/admin/service.ts — só leitura, sem tabela própria
adminDashboard(deps, session, now): Promise<{
  greeting: { firstName: string; date: Date };
  kpis: { activeStores; newStoresThisMonth; mrrCents; paidThisMonthCents; paidPrevCents;
          vehiclesOnShowcase; publishedThisMonth; leadsThisMonth; leadsPrevPeriod; lateCount };
  attention: { key: AttentionKey; count: number; detail: string; href: string }[]; // só count > 0
  leadOrigin: { cajugo: number; catalogs: number };
  topStores: { storeId; name; leads }[];      // até 10
  queues?: { receipts: ReceiptRow[]; approvals: ApprovalRow[] };  // [15c], 3 de cada
}>
activityLogView(deps, session, raw: { tipo?; de?; ate?; cursor? })   // [4c] Logs (ADM-FR-015)
storeHistory(deps, session, storeId, cursor?)                       // [6g] (ADM-FR-011)

// domains/stores/service.ts
storesAdmin(deps, session, raw: { q?; filtro?; cursor? })   // [1d] Lojas (ADM-FR-004)
storeDetail(deps, session, storeId)                          // [6g] (ADM-FR-008, SEC-004/005)
createStoreByAdmin(deps, session, raw) → { storeId; temporaryPassword }   // ADM-FR-005
updateStoreByAdmin(deps, session, storeId, raw)              // ADM-FR-010

// domains/auth/service.ts
usersAdmin(deps, session, raw: { q?; cursor? })              // [1d] Usuários (ADM-FR-007)
teamView(deps, session)                                      // [4c] Equipe
inviteTeamMember(deps, session, raw) → { temporaryPassword } // ADM-FR-012
removeTeamMember(deps, session, raw: { profileId })          // ADM-FR-012
```

**Regras escondidas nos serviços:**
- Permissões: tudo com `admin.view` (admin e suporte). Nova loja, editar, convidar e remover só com `stores.manage`/`team.manage` (só admin). Confirmar, recusar, aprovar e ocultar mantêm as permissões das specs de origem.
- O CPF/CNPJ sai inteiro só quando `can(session, "stores.manage")`; senão, mascarado (`maskTaxId`, ADM-SEC-004).
- A senha temporária sai só no retorno da action, uma vez; o registro guarda `temporary_password_set`, sem a senha (ADM-SEC-003).
- `removeTeamMember` recusa a si mesmo e o último admin (409); tira o papel e encerra as sessões.
- Variação: o mesmo período do mês anterior (do dia 1 até o mesmo instante, em São Paulo). Sem dado no mês anterior, `null`.

## Mapa requisito → solução
| Requisito | Solução |
|---|---|
| ADM-FR-001 | `adminDashboard.kpis`: `stores` (ativas e ativadas no mês), `billing.billingSnapshot` (MRR e mensalidades pagas no período × período anterior), `vehicles` (na vitrine e publicados no mês), `leads` (mês × mesmo período). `LightHeader` com a saudação; 4 `Kpi` |
| ADM-FR-002 | `attention`: comprovantes em análise, vencimentos em 3 dias, atrasadas, vendedores em análise, veículos a aprovar, denúncias abertas, alertas a avisar, cadastradas sem pagamento; cada um com o `href` filtrado (`/admin/assinaturas?filtro=atrasadas` etc.); some com 0 |
| ADM-FR-003 | `leadsSnapshot`: origem (`cajugo` × `store_catalog`/`seller`) e top 10 lojas no mês |
| ADM-FR-004 | `/admin/lojas` com `LightHeader` + abas; `storesAdmin` (busca por nome, endereço ou e-mail do dono; filtros por situação; 20 por vez); `StoreCard` |
| ADM-FR-005 | `/admin/lojas/nova`: formulário (loja e dono) → `createStoreByAdmin` (`registerStore` sem o aceite público, status `registered`, `auth.adminCreateUser` + senha temporária); tela com a senha uma vez e **Copiar** |
| ADM-FR-006 | Aba Veículos CajuGo: `vehicles` publicados e divulgados (20 por vez) com os filtros **Denunciados** (de `moderation`) e **Aguardando aprovação** (de `vehicles`); **Ocultar** abre o `HideSheet` da 007b |
| ADM-FR-007 | Aba Usuários: `usersAdmin` (sigla, nome, loja/info, selos de papel; busca por nome ou e-mail); toque → `/admin/lojas/{storeId}` ou `/admin/vendedores?q=` |
| ADM-FR-008 | `/admin/lojas/[id]`: `storeDetail` + `billing.storeBilling` + `sellers.networkSummaryFor(storeId)` + `vehicles` (primeiros 3); `BackHeader` "← Lojas", `Kpi`, `KeyValue` |
| ADM-FR-009 | Lista de ações (`SettingsList` + botões): Editar, Ver catálogo, **Definir senha temporária** (action da 001 com o id do dono), Histórico, **Suspender/Reativar** (actions da 011) em `caju-deep` por último |
| ADM-FR-010 | `/admin/lojas/[id]/editar`: o schema de Minha loja sem `slug`, com `storeId` na entrada e a posse conferida (admin) |
| ADM-FR-011 | `storeHistory`: `activity_log` com `entity_id = storeId` (e `data->>'storeId'`), 20 por vez, ação em texto (mapa de rótulos) e o nome de quem fez |
| ADM-FR-012 | `/admin/conta`: bloco Equipe (`teamView`), **Convidar** (`inviteTeamMember`: conta nova ou existente sem papel de cliente, papel Admin ou Suporte, senha temporária uma vez) e **Remover** (`removeTeamMember`) |
| ADM-FR-013 | `/admin` ≥ 1024 px: os 4 KPIs do [15c] e as filas Comprovantes Pix e Veículos aguardando aprovação (3 de cada), com os componentes de decisão de [10b] e [14c] inline e **Ver todos** |
| ADM-FR-014 | `AREA_NAV.admin` (já tem "Mais"); a gaveta com Pagamentos Pix, Veículos, Alertas, Rede Caju e Caju Indica |
| ADM-FR-015 | `/admin/log` (filtro por loja atende ADM-FR-011): `activityLogView` com filtro por tipo (prefixo da ação: `store.`, `subscription.`, `auth.`, `team.`, `payment.`…) e período, 20 por vez |
| ADM-NFR-001 | Base da 012; comparação em `comparacao.md`; `audit()` em 390 e 1280 |
| ADM-NFR-002 | Contagens em consultas agregadas (sem N+1), com os índices que já existem e os novos de `activity_log`; teste de integração com 500 lojas mede o tempo; os números podem ter até 60 s de atraso (`'use cache'` com `cacheLife` de 60 s, só para o painel) |
| ADM-NFR-003 | Cursor por `(created_at, id)` nas listas; `LoadMoreButton` |
| ADM-SEC-001 | `requireArea("admin")` + `authorizeTo(session, "admin.view")` em cada serviço |
| ADM-SEC-002 | Botões só com `can(...)`; as actions conferem de novo; teste do suporte (403) em cada action nova |
| ADM-SEC-003 | Senha só no retorno da action; registros `store.created_by_admin`, `store.updated_by_admin`, `auth.temporary_password_set`, `team.invited`, `team.removed`, `vehicle.hidden` sem dado pessoal; teste que procura a senha no banco |
| ADM-SEC-004 | `maskTaxId` para quem não tem `stores.manage` |
| ADM-SEC-005 | `z.uuid()` no id; loja inexistente → 404 (`notFound()`); `storeHistory` filtra pela loja |

## Modelo de dados
```ts
// activity_log + índices (migration 0024, só acrescenta)
(t) => [
  index("activity_log_created").on(t.createdAt.desc()),
  index("activity_log_entity_created").on(t.entityId, t.createdAt.desc()),
]
```
Sem coluna nova: "cliente desde" é `stores.activated_at`; "total pago" é a soma de `payments` confirmados; a equipe são os `profiles` com papel `admin`/`support`.

## Estratégia de testes
| Requisito | Unitário | Integração (PGlite) | e2e |
|---|---|---|---|
| ADM-FR-001..003 | variação (mesmo período), rótulos | `adminDashboard` com lojas, faturas, leads e veículos em datas controladas; itens com 0 somem | [4a] em 390 e [15c] em 1280 |
| ADM-FR-004, 007 | — | busca, filtros, cursor; selos de papel | busca de loja e Gerenciar |
| ADM-FR-005 | — | loja `registered`, conta com senha temporária; e-mail repetido → 422 | criar loja e ver a senha uma vez |
| ADM-FR-006 | — | filtros Denunciados e Aguardando | ocultar com motivo |
| ADM-FR-008..011 | — | detalhe, ações, histórico, editar com as validações | [6g] com senha temporária e suspender |
| ADM-FR-012, 015 | — | convidar, remover, último admin, a si mesmo; logs com filtros | convidar e remover suporte |
| ADM-FR-013 | — | filas com 3 itens | confirmar inline e o contador cair |
| ADM-SEC-001..005 | — | lojista 403/redirect; suporte sem botões e 403 nas actions; senha fora do banco; CPF mascarado ao suporte; id inválido 404 | lojista em `/admin/lojas` |
| ADM-NFR-002 | — | 500 lojas abaixo de 1 s | — |

## Riscos e alternativas descartadas
- **Risco: o painel ficar caro em consultas** (cota gratuita). Contagens agregadas em poucas consultas, cache de 60 s (aceito pela spec) e índices.
- **Risco: `activity_log` grande.** Os índices novos cobrem os dois usos; a paginação é por cursor.
- **Descartado: cada domínio montar a sua parte do painel.** Espalharia a tela do admin por 8 domínios; o `admin` só de leitura concentra a composição sem regra.
- **Descartado: tabela de equipe/convites.** O MVP não manda e-mail; o convite é a conta com senha temporária, como a recuperação de senha da 001.
- **Descartado: guardar KPIs mensais.** Sem histórico de MRR, a variação da Receita usa as mensalidades pagas no período (decidido no `/clarify`).

## Decisões (aprovadas em 2026-11-24)
- **D1.** Domínio novo `admin`, só leitura, que compõe os serviços dos outros (atualiza a ARCHITECTURE §3).
- **D2.** Migration `0024` só com os índices de `activity_log`.
- **D3.** Painel com cache de 60 s (`'use cache'` + `cacheLife`), invalidado pelas actions que mudam as filas (as `updateTag` que já existem).
- **D4.** Sai a página provisória `/admin/senha-temporaria`: a ação fica em [6g] e na busca de Usuários.
- **D5.** Permissões no mapa da `auth`: `stores.manage` (nova, só admin), `team.manage` (já existia, só admin) e, para ver, a `admin.read` que já existia (admin e suporte), no lugar de uma `admin.view` nova (ajuste na implementação, 2026-11-25).

## Conformidade
- [x] Todos os requisitos estão no mapa (15 FR, 3 NFR, 5 SEC)
- [x] Actions seguem o `API.md` §2: schema `.strict()`, permissão em cada uma, posse conferida, registro sem dado pessoal
- [x] SECURITY: senha temporária uma vez e fora de log; CPF/CNPJ mascarado ao suporte; isolamento por loja no histórico
- [x] Migration só acrescenta índices; nenhuma dependência nova
- [x] D1–D5 aprovadas em 2026-11-24 (instrução do dono do produto: seguir com as opções recomendadas)
