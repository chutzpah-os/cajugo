---
spec: 005
status: approved
---

# Plano · 005 Veículos do lojista

## Resumo técnico
Novos domínios **`vehicles`** (veículo, fotos, estados, histórico de preço) e **`fipe`** (tabela FIPE guardada no nosso banco). As telas do painel ficam em `/painel/veiculos`:
- a lista [1c];
- `novo` e `[id]/editar` para o formulário [2a];
- `[id]` para o resumo [6e].

O catálogo `/loja/{slug}` passa a listar os veículos publicados.

Como funciona:
- **Formulário:** salva sozinho, com uma action de rascunho chamada depois de uma pausa na digitação.
- **Fotos:** upload público assinado no Cloudinary, com transformação de entrada que reduz a 1.600 px e regrava o arquivo sem metadados. O navegador também reduz a foto antes de enviar.
- **Estados:** cada mudança é condicional ao status de origem, como no billing.
- **Cache das páginas públicas:** a tag `vehicles` é renovada a cada mudança visível.

## Impacto
| Camada | Mudança |
|---|---|
| Dados (migration `0010`, aditiva) | enum `vehicle_status`; tabelas `vehicles`, `vehicle_photos`, `vehicle_history`, `fipe_brands`, `fipe_models`, `fipe_years`, `fipe_prices` |
| `src/platform/` | `fipe/client.ts` (API pública, só leitura, com prazo de resposta); `cloudinary`: `signUpload` com `transformation` (entrada) e conferência de dimensões; `br/plate.ts` (placa Mercosul/antiga → final) |
| `src/domains/fipe/` | `service.ts`: `brands`, `models(brandId)`, `years(modelId)`, `reference(yearId)`; cópia sob demanda com validade (listas 30 dias, preço do mês) e uso do que já está guardado se a API falhar |
| `src/domains/vehicles/` | `service.ts`, `actions.ts`, `schemas.ts`, `lists.ts` (câmbio, combustível, carroceria, itens, condições), `components/` ([1c], [2a], [6e], [6f], fotos) |
| `src/domains/stores/` | `onboardingStatus` recebe `firstVehicle` de quem chama (a página junta `vehicles` e `stores`, sem ciclo entre domínios); `publicStore` + lista de veículos no catálogo |
| `src/domains/billing/` | `subscriptionCard(session)` para o card de [1c] (plano, valor, status, próxima cobrança) |
| `src/app/` | `/painel/veiculos` ([1c] + onboarding), `/painel/veiculos/novo` e `/painel/veiculos/[id]/editar` ([2a]), `/painel/veiculos/[id]` ([6e]); `/loja/[slug]` lista os publicados; texto de [10a] ajustado ao PRD novo |
| Jobs | nenhum (a FIPE é atualizada no uso; apagar excluídos depois de 90 dias é rotina da 011) |

## Interfaces dos serviços (módulos profundos)
`vehicles/service.ts`. O `storeId` vem sempre da sessão, e o veículo de outra loja responde 404.
```ts
listVehicles(db, session, { status?, q? }): Promise<VehicleList>     // [1c]: itens, KPIs, contagem por filtro
saveDraft(deps, session, input: { vehicleId?, ...campos parciais }): Promise<{ vehicleId, savedAt }>  // autosave; cria na 1ª vez
vehicleForm(db, session, vehicleId): Promise<VehicleFormView>        // [2a] preenchido
vehicleSummary(db, session, vehicleId): Promise<VehicleSummary>      // [6e]: resumo, Dias no ar, divulgação
publish(deps, session, vehicleId): Promise<void>                     // VEH-FR-009 (erros por seção)
setShare(deps, session, vehicleId, on): Promise<void>                // VEH-FR-010
markSold / undoSold / unpublish / remove (deps, session, vehicleId)  // VEH-FR-013/014
photoUpload(deps, session, vehicleId): Promise<SignedUpload>         // limite de 20 conferido aqui
addPhoto / removePhoto / reorderPhotos (deps, session, vehicleId, …) // VEH-FR-004
publicVehicles(db, storeId): Promise<PublicVehicleCard[]>             // catálogo: só publicado de loja no ar; sem placa
hasPublishedVehicle(db, storeId): Promise<boolean>                   // VEH-FR-015
```
`fipe/service.ts`:
```ts
brands(deps) · models(deps, brandId) · years(deps, modelId) · reference(deps, yearId): Promise<{ fipeCode, priceCents, month } | null>
```

## Mapa requisito → solução
| Requisito | Solução |
|---|---|
| VEH-FR-001 | `listVehicles`: contagens por status em uma consulta (`count(*) filter`), "Na CajuGo" = publicado e divulgado, vendidos no mês em São Paulo (`saoPauloMonthStart`, já existe); busca por `make/model/version` (`ilike`) ou final/placa (só do dono); card de assinatura por `billing.subscriptionCard` |
| VEH-FR-002 | `VehicleCard` com legenda por estado (mapa único status → legenda) e estado vazio (já existe em [1c]) |
| VEH-FR-003 | `saveDraft` parcial (todos os campos opcionais, `.strict()`), criado no 1º salvamento; o cliente salva 1 s depois da última alteração e mostra "Rascunho salvo"; reabrir carrega `vehicleForm` |
| VEH-FR-004 | `photoUpload` assina a pasta `vehicles/{vehicleId}` com `public_id` `photo-{uuid}` e recusa a 21ª; `addPhoto` confere o nome exato (regex, como em 003/004), formato, 15 MB e dimensões; posição pela ordem; `reorderPhotos` recebe a lista de ids da própria foto; o navegador reduz para 1.600 px (canvas → WebP/JPEG) com barra de progresso |
| VEH-FR-005 | `fipe.brands/models/years` alimentam os selects dependentes; o veículo guarda os ids e os nomes da FIPE (nome fica mesmo se a FIPE mudar); `yearModel ∈ [yearManufacture, yearManufacture+1]`; `parsePlate` aceita `AAA9A99` e `AAA9999`, guarda maiúsculas sem hífen e deriva `plate_end` |
| VEH-FR-006 | listas fechadas em `vehicles/lists.ts` (câmbio, combustível, carroceria, portas, itens, condições) validadas por `z.enum`; descrição até 2.000 com contador |
| VEH-FR-007 | `fipe.reference(yearId)` grava `fipe_code` e `fipe_price_cents` no veículo; diferença `((price − fipe) / fipe)` arredondada a 1 casa ("4,6% abaixo"); sem referência, nada aparece |
| VEH-FR-008 | novo veículo copia `stores.shareByDefault` e `stores.whatsapp`; contato por veículo validado como o WhatsApp da loja (`brPhoneSchema`) |
| VEH-FR-009 | `publish` valida o veículo inteiro com `publishSchema` e devolve erros por campo e seção; transição `draft → published` condicional; `published_at` |
| VEH-FR-010 | visível = `status = published` e loja no ar (`isStoreLive`, 004); loja não ativada pode publicar e passa a aparecer na ativação sem nada a fazer (a consulta pública já filtra a loja); toggle só em publicado; legenda extra "Aparece quando a loja for ativada" para loja não ativada |
| VEH-FR-011 | `vehicleSummary` com "Dias no ar" = dias desde `published_at` (São Paulo); `saveDraft` também edita publicado (mesmos limites) e renova a tag `vehicles` |
| VEH-FR-012 | em `saveDraft`/edição de veículo publicado, preço diferente grava `vehicle_history` (anterior, novo, quando, quem) na mesma transação |
| VEH-FR-013 | `markSold`: `published → sold`, `sold_at`, guarda `share_before_sale` e desliga a divulgação; `undoSold`: só até 7 dias de `sold_at`, volta `published` com a divulgação de antes; diálogo [6f] (`ConfirmSheet` em `src/ui`) |
| VEH-FR-014 | `unpublish`: `published → draft`; `remove`: qualquer estado → `deleted` com `deleted_at` (some de tudo; o admin recupera na 012; apagar após 90 dias é da 011) |
| VEH-FR-015 | `hasPublishedVehicle`; a página `/painel/veiculos` passa `firstVehicle` para `onboardingStatus` |
| VEH-NFR-001 | componentes de `src/ui` (alvos ≥ 44 px, rótulos); `audit()` no e2e de [1c], [2a], [6e] e diálogo |
| VEH-NFR-002 | 1.600 px no navegador **e** na transformação de entrada do Cloudinary (vale mesmo se o navegador falhar); entrega por `imageUrl` com larguras fixas (thumb 320, card 640, full 1600) |
| VEH-NFR-003 | `updateTag("vehicles")` em toda mudança visível; catálogo com `cacheTag("vehicles")` + `cacheLife` curto |
| VEH-NFR-004 | `fipe` lê sempre do banco; busca na API só o que falta ou venceu (30 dias listas, mês do preço), com prazo de 5 s; falhou → usa o guardado; nada guardado e API fora → o select avisa "Lista indisponível agora, tente em instantes" |
| VEH-SEC-001 | toda ação recebe `vehicleId` e filtra `and(id, store_id = sessão)` no próprio `where` (SECURITY §4); fotos: pasta da loja via veículo + regex do nome; outra loja → 404 |
| VEH-SEC-002 | `PublicVehicleCard` montado à mão, sem `plate`/`chassis`; teste procura a placa no HTML do catálogo |
| VEH-SEC-003 | transformação de entrada (`c_limit,w_1600,h_1600`) regrava a imagem sem EXIF/GPS; o navegador também regrava; prova no staging lendo os metadados pela Admin API; recusado → `destroy` (como na 004) |
| VEH-SEC-004 | `publicVehicles` filtra `status = published` e `isStoreLive`; teste com cada status e com loja suspensa/cadastrada |
| VEH-SEC-005 | `activity_log` em `vehicle.published`, `unpublished`, `sold`, `sale_undone`, `deleted`, `price_changed` (valores, sem placa) |

## Modelo de dados (migration `0010`, aditiva)
```ts
export const vehicleStatus = pgEnum("vehicle_status", ["draft", "pending_approval", "published", "hidden", "sold", "deleted"]);

export const vehicles = pgTable("vehicles", {
  id, storeId (fk), status (default draft),
  fipeBrandId, fipeModelId, fipeYearId (text, ids da FIPE), make, model, version (nomes guardados),
  yearManufacture, yearModel (smallint), mileageKm (integer),
  transmission, fuel, body, color, doors, engine (text, listas de lists.ts),
  plate (privada), plateEnd, chassis (privado),
  priceCents, fipeCode, fipePriceCents, fipeMonth, showInstallment (bool),
  conditions (jsonb: { acceptsTrade, singleOwner, ipvaPaid, licensed, dealerServiced, factoryWarranty, armored }),
  features (text[]), description, contactWhatsapp, shareOnCajugo, shareBeforeSale,
  publishedAt, soldAt, deletedAt, createdAt, updatedAt,
}, (t) => [index("vehicles_store_status").on(t.storeId, t.status), index("vehicles_status_share").on(t.status, t.shareOnCajugo)]);

export const vehiclePhotos = pgTable("vehicle_photos", {
  id, vehicleId (fk), publicId, position (smallint), width, height, createdAt,
}, (t) => [uniqueIndex("vehicle_photos_position").on(t.vehicleId, t.position)]);

export const vehiclePriceHistory = pgTable("vehicle_history", {
  id, vehicleId (fk), oldCents, newCents, changedBy, changedAt,
}, (t) => [index("vehicle_history_vehicle").on(t.vehicleId, t.changedAt)]);

// FIPE guardada (só leitura para o app; escrita só pelo domínio fipe)
fipe_brands (id pk, name, synced_at) · fipe_models (id pk, brand_id, name, synced_at)
fipe_years (id pk = "{modelId}:{codigo}", model_id, label, synced_at)
fipe_prices (year_id pk, fipe_code, price_cents, month, fetched_at)
```
No ARCHITECTURE §4, `vehicles` ganha `fipe_*_id`, `fipe_month`, `share_before_sale` e `deleted_at`; `conditions` vira jsonb no lugar de 7 colunas booleanas, porque é uma lista fechada que muda junto com o PRD. As tabelas `fipe_*` e `vehicle_history` também entram. "Histórico de preço" e "Referência FIPE" vão para o GLOSSARY.

## Testes
- **Unitários:**
  - `parsePlate` (Mercosul, antiga, inválidas, final);
  - legenda por estado;
  - diferença percentual da FIPE;
  - `firstDueDate` (já existe);
  - cliente FIPE com `fetch` falso (prazo, erro, formato).
- **Integração (PGlite)**, cada um com o ID no nome:
  - FR-001 a FR-015 pelos serviços;
  - SEC-001 (loja B × A em cada ação e nas fotos);
  - SEC-002 (cartão público sem placa);
  - SEC-004 (cada status e loja fora do ar);
  - SEC-005;
  - NFR-004: FIPE com `fetch` falso fora do ar devolve o guardado.

  O Cloudinary é o falso, que já tem tipo, `destroy` e leitura.
- **Prova no staging (task de fundação):**
  - foto com GPS enviada com a transformação de entrada;
  - a Admin API não mostra metadados de localização;
  - a dimensão máxima é 1.600.
- **Ponta a ponta (staging, 390 px):**
  - [2a] completo com 2 fotos reais e FIPE real;
  - autosave ao fechar e voltar;
  - publicar com erro e depois certo;
  - [1c] com KPIs e filtros;
  - [6e]: preço muda e o histórico grava;
  - vendido → some do catálogo → desfazer;
  - excluir;
  - loja B sem acesso;
  - `audit()`;
  - o seed apaga os veículos e as fotos dos testes, como na 004.

## Riscos e alternativas descartadas
- **Copiar a tabela FIPE inteira por mês:** descartado. A API gratuita aceita **500 consultas por dia**, conferido no cabeçalho `x-ratelimit-limit`, e a tabela tem dezenas de milhares de versões. A cópia sob demanda guarda o que as lojas usam de verdade e cabe na cota. Risco: a API fica fora do ar ou muda de formato. O que já foi guardado continua valendo (VEH-NFR-004), e o cliente valida o formato da resposta.
- **Só a redução no navegador para tirar o EXIF:** descartado. O navegador pode falhar ou ser contornado; a transformação de entrada no Cloudinary garante no servidor. As duas ficam.
- **Sete colunas booleanas para as condições:** descartado em favor de jsonb validado, porque a lista é fechada e vem do PRD. As buscas da vitrine (006) não filtram por condição.
- **`onboardingStatus` chamando `vehicles`:** descartado, porque criaria um ciclo `stores ↔ vehicles`. A página junta os dois.
- **Risco: autosave concorrente** (duas abas). A última gravação vence por campo enviado, e `updated_at` mostra "Alterado há N min". Não há perda silenciosa de campos, porque cada salvamento envia só o que mudou.

## Decisões (aprovadas)
- **D1. FIPE sob demanda, não sincronizada inteira.** O `/clarify` disse "listas sincronizadas". Com a cota de 500 consultas por dia, a forma que funciona é copiar no primeiro uso e renovar depois de 30 dias (preço: uma vez por mês). Do ponto de vista do lojista dá no mesmo. Recomendo aprovar.
- **D2. Limites fixos no código:** 20 fotos, 2.000 caracteres, 7 dias para desfazer a venda. O PRD §5.14 não os lista como regras editáveis; são limites do produto, como o tamanho de foto. Recomendo deixar fixos. A alternativa é criar três regras novas em [4c].
- **D3. "Aparece quando a loja for ativada":** uma legenda extra no toggle de veículo publicado de loja ainda não ativada, para o lojista não achar que o veículo sumiu. Recomendo incluir; muda só o texto.

## Conformidade
- [x] Todo requisito da spec aparece no mapa requisito → solução (15 FR, 4 NFR, 5 SEC)
- [x] Actions seguem o `API.md` §2: schemas `.strict()` com limites; sessão; `storeId` da sessão; posse no `where`; saída montada à mão (`VehicleList`, `VehicleFormView`, `VehicleSummary`, `PublicVehicleCard`); transições condicionais (idempotentes)
- [x] Toda action com id checa a posse (`SECURITY.md` §4): `vehicleId` e `photoId` filtrados pela loja da sessão; outra loja → 404
- [x] Schemas de entrada não aceitam campos privilegiados (`storeId`, `status`, `publishedAt`, `fipePriceCents` vêm do servidor)
- [x] Dados pessoais novos estão na tabela do `SECURITY.md` §8: placa (nunca; só o final) e chassi já estão; fotos sem metadados (§5)
- [x] Formulário público tem honeypot + rate limit: não há formulário público novo
- [x] Consultas novas têm índice previsto: `vehicles(store_id, status)`, `vehicles(status, share_on_cajugo)`, fotos por veículo, histórico por veículo, FIPE por pk
- [x] Migrations aditivas: só `CREATE` e enum novo
- [x] Nada do Supabase além de Postgres e Auth
- [x] D1–D3 aprovadas nas opções recomendadas (2026-11-08, "comite e continue")
