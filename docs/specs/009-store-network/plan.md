---
spec: 009
status: approved
---

# Plano · 009 Rede Caju · lojista e venda

## Resumo técnico
Tudo continua no domínio `sellers` (Rede Caju), que passa a usar o serviço de `vehicles` para vender e desfazer a venda dentro da mesma transação.
- **Loja na Rede Caju [7e] e [7f]:**
  - `stores.accepts_sellers`;
  - comissão padrão (já existe desde a 008);
  - ajuste da comissão por veículo (colunas novas em `vehicles`, escritas pelo serviço de `vehicles`);
  - pedidos e parceiros.
- **Parceria que vale:** vendedor ativo, parceria `active` **e** loja aceitando vendedores. Essa regra fica escondida num lugar só e vale para "Você ganha", para o lead marcado e para o vendedor sugerido. Desligar "Aceitar vendedores" não muda a parceria: só deixa de valer (RCL-FR-001).
- **Venda [7g]:**
  - a tabela `sales` guarda o valor final, a atribuição, o vendedor, a comissão (calculada no servidor), a taxa CajuGo (pontos-base das regras, guardados na venda) e o status da comissão;
  - o veículo fica com `sale_id`, e o serviço de `vehicles` recusa o desfazer simples quando existe venda (D3);
  - desfazer pela venda cancela a venda, a comissão e a taxa, e reabre o veículo, desde que a comissão não esteja paga.
- **Telas:** sem import de componente entre domínios.
  - A página [6e] monta os botões da venda com componentes de `sellers` e os entrega ao `VehicleActions` por *slots* (D2).
  - Em [1c], "Vendido" de loja que aceita vendedores leva a `[6e]?vender=1`, que abre [7g].

## Impacto
| Camada | Mudança |
|---|---|
| Dados (migration `0019`, aditiva) | `stores.accepts_sellers` (padrão `false`, D1). `vehicles.commission_override_type`, `commission_override_value`, `sale_id`. Enums `sale_attribution` (link, other_partner, store) e `commission_status` (to_receive, paid). Tabela `sales`. |
| `src/domains/sellers/` | Comissão da loja e do veículo ([7e]); pedidos, aprovar, recusar, encerrar e parceiros ([7f]); `saleTerms`, `confirmSale`, `undoSale`, `saleOf` ([7g]); regra da parceria que vale (`effectivePartner`) usada por `sellerShowcase`, `sellerForLead` e `requestPartnership`; `networkSummary` para o bloco da Conta. Componentes `CommissionForm`, `VehicleOverrides`, `PartnerRequests`, `PartnersList`, `ConfirmSaleSheet`, `UndoSaleButton`, `NetworkBlock`. |
| `src/domains/vehicles/` | `setCommissionOverride` (`sellers.manage`). `sellInTx` e `reopenInTx` (transições com dono e status, dentro da transação de `sellers`). `undoSold` recusa com `sale_id` (409: "Desfaça pela venda"). O resumo [6e] e a lista [1c] trazem `acceptsSellers` e `hasSale`. `VehicleActions` aceita os slots `sellAction` e `undoAction`. |
| `src/app/` | `/painel/rede/comissao` [7e], `/painel/rede/vendedores` [7f]; bloco Rede Caju na `/painel/conta`; `/painel/veiculos/[id]` monta [7g] e o desfazer pela venda. |
| Jobs | Nenhum (a taxa vai para a fatura na 011) |

## Interfaces dos serviços (módulos profundos)
```ts
// domains/sellers/service.ts (novas)
storeNetwork(db, session): Promise<StoreNetwork>          // RCL-FR-001..007, SEC-001, 002, 004
//  { acceptsSellers, commission: { type, value } | null, overrides: { vehicleId, title, type, value }[],
//    pending: { partnershipId, sellerName, city, requestedAt }[],
//    partners: { partnershipId, sellerName, city, phone, pixKey, sales, blocked }[] }
setNetworkRules(db, session, raw: { acceptsSellers, commissionType, commissionValue }) // RCL-FR-001, 002
decidePartnership(db, session, raw: { partnershipId, decision: "approve" | "decline" | "end" })  // RCL-FR-004..006
networkSummary(db, session): Promise<{ acceptsSellers; pending: number }>   // RCL-FR-014
saleTerms(db, session, raw: { vehicleId; finalPriceCents?; sellerId? }): Promise<SaleTerms>  // RCL-FR-009, 010, 013
//  { suggested: { sellerId; name } | null, partners: { sellerId; name }[],
//    commissionCents | null, feeCents | null, feeBps }
confirmSale(deps, session, raw: { vehicleId; finalPriceCents; attribution; sellerId?; commissionPaid }) // RCL-FR-011, 012
undoSale(deps, session, raw: { vehicleId }): Promise<void>                  // RCL-FR-015
saleOf(db, session, vehicleId): Promise<{ commissionPaid: boolean } | null>

// domains/vehicles/service.ts (novas)
setCommissionOverride(deps, session, raw: { vehicleId; type | null; value | null })   // RCL-FR-003
sellInTx(tx, session, vehicleId, saleId, now) / reopenInTx(tx, session, vehicleId, now)
```
Regras que ficam escondidas:
- **`effectivePartner(sellerId, storeId)`:** vale com vendedor `active`, parceria `active` e `stores.accepts_sellers`. É usada pelo lead (`sellerForLead`), por "Você ganha", pelo vendedor sugerido e pelo "outro parceiro".
- **Regra da comissão:** o ajuste do veículo vale no lugar da padrão da loja. O valor é `commissionFor(regra, valor final)`. Na venda da loja, não há comissão nem taxa. A taxa é `round(valor final × cajugo_fee_bps / 10000)`.
- **Atribuição:**
  - `link`: o vendedor é o sugerido, ou seja, o do lead mais recente do veículo com vendedor parceiro que vale;
  - `other_partner`: tem que ser parceiro que vale da loja (`RCL-SEC-003`);
  - `store`: sem vendedor.

## Mapa requisito → solução
| Requisito | Solução |
|---|---|
| RCL-FR-001 | [7e]: toggle → `setNetworkRules` grava `stores.accepts_sellers`. Desligado: `requestPartnership` recusa (409, "Esta loja não aceita vendedores"); `sellerShowcase` devolve o estado `closed` (botão desabilitado, D da 008) e esconde "Você ganha"; `effectivePartner` deixa de valer, então o lead não é marcado. As parcerias não mudam: religar devolve tudo. |
| RCL-FR-002 | [7e]: tipo (% ou fixo) e valor (`networkRulesSchema`: até 1.000 bps e até 1.000.000 centavos); a prévia usa `commissionFor` e `cajugo_fee_bps` sobre R$ 60.000, calculada no cliente com os mesmos números que vêm do servidor (só exibição). |
| RCL-FR-003 | [7e] "Ajuste por veículo": lista dos ajustes e "Adicionar ajuste" (veículo publicado da loja, tipo, valor) → `vehicles.setCommissionOverride`; "Remover" grava nulo. `sellerShowcase` e `saleTerms` usam o ajuste. |
| RCL-FR-004 | [7f] pendentes: `partnerships pending` da loja, com vendedor `active`, ordenadas por `created_at`. |
| RCL-FR-005 | `decidePartnership(approve)`: `pending → active`; `decline`: `pending → declined` (libera um pedido novo pelo índice único das abertas). |
| RCL-FR-006 | Parceiros: `active` da loja com nome, cidade, celular, chave Pix e número de vendas confirmadas com a loja; **Encerrar** (ConfirmSheet) → `active → ended`, `ended_at`. |
| RCL-FR-007 | Pendentes só com vendedor `active`; parceiro `blocked` aparece com o selo "Bloqueado pela CajuGo" (e `effectivePartner` já não vale). |
| RCL-FR-008 | [6e]: com `acceptsSellers`, o slot `sellAction` é o `ConfirmSaleSheet` de `sellers`; senão, o diálogo de [6f] de sempre. [1c]: "Vendido" vira link para `/painel/veiculos/{id}?vender=1`, que abre [7g] direto. |
| RCL-FR-009 | `ConfirmSaleSheet`: valor final (`MoneyField`, obrigatório: "Informe o valor final"), rádio "quem vendeu" (sugerido / outro parceiro com a lista / venda da loja). |
| RCL-FR-010 | A cada mudança de valor ou escolha, `saleTermsAction` devolve a comissão e a taxa calculadas no servidor; toggle **Já paguei a comissão**. |
| RCL-FR-011 | `confirmSale` numa transação: `sales` (link ou outro parceiro: `commission_status` `to_receive`/`paid`, `fee_cents`, `fee_bps`) + `vehicles.sellInTx` (status `sold`, `sale_id`, mesma regra do vendido: divulgação guardada) + `logActivity`; depois, `updateTag(VEHICLES_TAG)`. |
| RCL-FR-012 | `attribution: store`: venda sem vendedor, comissão e taxa nulas. |
| RCL-FR-013 | `saleTerms.suggested`: lead mais recente do veículo com `seller_id` e `effectivePartner`; sem lead assim, a escolha inicial é "venda da loja". |
| RCL-FR-014 | `/painel/conta`: o bloco Rede Caju (`networkSummary`) com links Comissão e Vendedores (com o número de pendentes); o resto da página segue provisório até a 011. |
| RCL-FR-015 | [6e] com venda: slot `undoAction` = `UndoSaleButton` → `undoSale`. Com comissão `paid`: 409 "A comissão já foi paga. Para desfazer, fale com a CajuGo."; senão, na transação: `sales.canceled_at` + `vehicles.reopenInTx` (mesma regra dos 7 dias) + `logActivity`; `updateTag`. `vehicles.undoSold` direto com `sale_id` → 409. |
| RCL-NFR-001 | Componentes base; e2e 390 e 1280 px com `audit()` |
| RCL-NFR-002 | `updateTag(VEHICLES_TAG)` na action de confirmar venda |
| RCL-SEC-001 | Toda leitura e escrita com `store_id` da sessão no `where`; venda de veículo de outra loja → 404 (`sellInTx` confere o dono). |
| RCL-SEC-002 | [7e], [7f] e decisões: `sellers.manage` (só lojista). Venda: `sales.confirm` (lojista e usuário da loja). |
| RCL-SEC-003 | `confirmSaleSchema.strict()` só com `vehicleId`, `finalPriceCents`, `attribution`, `sellerId` e `commissionPaid`; comissão, taxa e status saem do servidor; "outro parceiro" passa por `effectivePartner` (senão 422 no campo). |
| RCL-SEC-004 | Celular e chave Pix do vendedor só em `storeNetwork.partners` (parceria `active` da loja da sessão); CPF nunca é lido. |
| RCL-SEC-005 | `logActivity`: `partnership.approved/declined/ended`, `store.network_rules`, `vehicle.commission_override`, `sale.confirmed` (valor final, comissão, taxa, atribuição), `sale.canceled`; sem CPF nem Pix. |

## Modelo de dados
```ts
// stores
acceptsSellers: boolean("accepts_sellers").notNull().default(false),
// vehicles
commissionOverrideType: commissionType("commission_override_type"),
commissionOverrideValue: integer("commission_override_value"),
saleId: uuid("sale_id"),                       // venda ativa (sem FK para não amarrar a ordem de exclusão do e2e)

export const saleAttribution = pgEnum("sale_attribution", ["link", "other_partner", "store"]);
export const commissionStatus = pgEnum("commission_status", ["to_receive", "paid"]);

export const sales = pgTable("sales", {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  vehicleId: uuid("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  finalPriceCents: integer("final_price_cents").notNull(),
  attribution: saleAttribution("attribution").notNull(),
  sellerId: uuid("seller_id").references(() => sellers.profileId),
  commissionCents: integer("commission_cents"),
  commissionStatus: commissionStatus("commission_status"),
  feeBps: integer("fee_bps"), feeCents: integer("fee_cents"),
  invoiceId: uuid("invoice_id"),                // preenchido pela fatura (011)
  confirmedBy: uuid("confirmed_by").notNull().references(() => profiles.id),
  ...timestamps, canceledAt: timestamp("canceled_at", { withTimezone: true }),
}, (t) => [
  uniqueIndex("sales_vehicle_active").on(t.vehicleId).where(sql`${t.canceledAt} is null`),
  index("sales_store_created").on(t.storeId, t.createdAt),
  index("sales_seller_created").on(t.sellerId, t.createdAt),
]).enableRLS();
```
A migration é aditiva. O índice único parcial garante uma venda ativa por veículo, e confirmar duas vezes não duplica (409).

## Estratégia de testes
| Requisito | Unitário | Integração (PGlite) | e2e (staging) |
|---|---|---|---|
| RCL-FR-001 | — | desligar: pedido recusado, "Você ganha" some, lead não marca; religar volta | toggle em [7e] |
| RCL-FR-002 | schema (10%, R$ 10.000) | grava a regra | prévia em [7e] |
| RCL-FR-003 | — | ajuste vale no lugar da padrão | "Você ganha" com o ajuste |
| RCL-FR-004/005 | — | ordem, aprovar, recusar e pedir de novo | aprovar em [7f] |
| RCL-FR-006/007 | — | parceiros com Pix e vendas; encerrar; bloqueado | encerrar |
| RCL-FR-008 | — | — | Vendido abre [7g] |
| RCL-FR-009/010 | — | `saleTerms` (comissão e taxa) | valores em [7g] |
| RCL-FR-011/012 | — | venda com vendedor (a receber e paga) e venda da loja; veículo vendido | confirmar |
| RCL-FR-013 | — | sugestão pelo lead mais recente | — |
| RCL-FR-014 | — | `networkSummary` | bloco na Conta |
| RCL-FR-015 | — | desfazer cancela; paga → 409; `undoSold` direto → 409 | desfazer |
| RCL-NFR-001/002 | — | — | `audit()`; vitrine sem o vendido |
| RCL-SEC-001 | — | loja B → 404 em tudo | — |
| RCL-SEC-002 | — | usuário da loja → 403 em [7e]/[7f], vende | — |
| RCL-SEC-003 | schema sem campos de servidor | "outro parceiro" sem parceria → 422 | — |
| RCL-SEC-004 | — | Pix só na loja parceira | — |
| RCL-SEC-005 | — | `activity_log` sem CPF nem Pix | — |

## Riscos e alternativas descartadas
- **Mudança no lado do vendedor (008):** `sellerForLead`, `sellerShowcase` e `requestPartnership` passam a exigir a loja aceitando vendedores. Os testes da 008 que criam parceria usam lojas com `accepts_sellers` ligado (fixture); o seed do e2e liga a loja da vitrine.
- **Desfazer pelo caminho antigo:** `undoSold` direto com venda ativa é recusado pelo `sale_id`, para a comissão não ficar órfã.
- **Descartado: domínio `sales` separado.** Ele dependeria de `vehicles` e de `sellers`, e o desfazer do veículo voltaria a depender dele (ciclo). A venda é da Rede Caju; o veículo só guarda o `sale_id`.
- **Descartado: componente de `sellers` dentro de `vehicles`.** Os slots montados na página evitam uma nova exceção de tela.
- **Descartado: uma venda para todo vendido.** Loja sem Rede Caju segue com o vendido simples (RCL-FR-008); a fatura (011) só precisa das vendas com taxa.

## Ajustes do `/implement` e do `/verify` (2026-11-17)
- **Ajuste por veículo:** a permissão e os limites ficam em `sellers.setVehicleCommission`; `vehicles.writeCommissionOverride` só grava na loja dada (validar em `vehicles` com os schemas da Rede Caju criaria um ciclo `vehicles` → `sellers`).
- **"Vendido" simples recusado no servidor** quando a loja aceita vendedores (`vehicles.markSold` → 409 "Confirme a venda pela Rede Caju."), não só escondido na tela (RCL-FR-008).
- **Confirmar venda:** parceria e vendedor sugerido conferidos dentro da transação; sem regra de comissão, a comissão é R$ 0 na tela e na venda (a loja pode aceitar vendedores sem definir comissão).
- **Parceiro bloqueado pela CajuGo:** aparece em [7f] com o selo, sem celular nem chave Pix (RCL-SEC-004).
- Conta mostra o bloco Rede Caju só para quem tem `sellers.manage`; `storeAcceptsSellers` (lojista e usuário da loja) decide o caminho do "Vendido".
- Fica como está: "Desfazer venda" também vale para a venda da loja; sugestão de vendedor ignora leads de ex-parceiros; `vehicles.sellInTx`/`reopenInTx`/`writeCommissionOverride` sem autorização própria (quem chama confere, documentado).

## Decisões (aprovadas em 2026-11-17)
- **D1. `accepts_sellers` começa desligado** em todas as lojas, inclusive as que já existem. **Recomendo:** é a leitura do PRD ([7e] é um toggle que a loja liga). Muda o comportamento que a 008 tinha (toda loja aceitava pedidos). No prod ainda não há vendedores ativos.
- **D2. Slots no `VehicleActions`:** a página [6e] entrega os botões de vender e de desfazer da Rede Caju, e [1c] leva a `[6e]?vender=1`. **Recomendo:** evita que `vehicles` importe componentes de `sellers`.
- **D3. `vehicles.sale_id`** marca o veículo vendido por uma venda; o desfazer simples é recusado com ela. **Recomendo:** `vehicles` não precisa conhecer a tabela de vendas.
- **D4. Taxa guardada na venda** (`fee_bps` e `fee_cents` no momento da confirmação). **Recomendo:** mudar a taxa nas regras não altera vendas já feitas.

## Ajustes de documento (na T001, com as decisões)
- **PRD (aguarda o seu OK, do `/clarify`):** §5.7 (comissão só "A receber" e "Paga"; desfazer venda com vendedor), [7e] (limites de 10% e R$ 10.000), PLAN.md (009 sem [13a], [13b], [13d]; seção 009b).
- **ARCHITECTURE §4:** `stores.accepts_sellers`, os campos de comissão e o `sale_id` em `vehicles`, e `sales` com `fee_bps`, `canceled_at` e sem `in_review`.
- **API.md §5:** actions de [7e], [7f] e [7g] e as rotas `/painel/rede/*`.
- **GLOSSARY:** Parceria que vale (vendedor ativo, parceria ativa, loja aceitando vendedores); status da comissão (A receber, Paga).

## Conformidade
- [x] Todo requisito da spec aparece no mapa requisito → solução (15 FR, 2 NFR, 5 SEC)
- [x] Actions seguem o `API.md` §2:
  - schemas `.strict()` com limites;
  - permissão em cada action;
  - `activity_log` nas decisões e na venda;
  - idempotência pela venda ativa única e pelas transições a partir do status esperado.
- [x] Toda action com id confere a posse (`store_id` da sessão; outra loja → 404)
- [x] Schemas sem campo privilegiado (comissão, taxa, status, `store_id`)
- [x] Dado pessoal: celular e Pix do vendedor só para a loja parceira; CPF nunca
- [x] Consultas novas com índice (venda ativa por veículo, vendas por loja e por vendedor, parceria por loja e status já existe)
- [x] Migration aditiva; nenhuma dependência nova; nada do Supabase além de Postgres e Auth
- [x] D1–D4 aprovadas em 2026-11-17
- [ ] Ajuste do PRD e do PLAN do `/clarify` aguarda o seu OK
