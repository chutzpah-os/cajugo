---
spec: 014
status: draft
---

# Plano · 014 Tipos de veículo e o que a loja vende

## Resumo técnico
O tipo vira dado: enum `vehicle_type` em `vehicles.type` (padrão `carro`) e `stores.vehicle_types` (padrão `{carro}`). A ficha de cada tipo ganha colunas próprias, todas anuláveis, validadas por um schema por tipo no domínio `vehicles`. A FIPE passa a ter três tabelas de origem (carros, motos, caminhões) na mesma cópia sob demanda (ADR 0012), com o tipo da FIPE no id. Os tipos sem FIPE usam a lista da CajuGo no código. A vitrine troca o `sql\`false\`` provisório (só carro) pelo filtro real e ganha os filtros de cada tipo. Parte da 014 já está no ar (faixa de tipos, páginas `/motos` etc., Buscar · Vender, título); este plano cobre o que falta.

## Impacto
| Camada | Mudança |
|---|---|
| Dados | Migration `0028`: enum `vehicle_type` (12 valores, slugs de `VEHICLE_TYPES`); `vehicles.type` not null default `carro`; colunas da ficha (abaixo); `stores.vehicle_types vehicle_type[]` not null default `{carro}`; índice `vehicles_status_type_rank (status, type, rank_score desc, id)` |
| `src/platform/fipe/client.ts` | `createFipeClient(kind)`: `cars`, `motorcycles`, `trucks` (fipe.api.br v2 tem os três; mesmo formato) |
| `src/domains/fipe` | `brands/models/years/reference` recebem `kind`; ids guardados com prefixo para moto e caminhão (`m:80`, `t:102`), carros sem prefixo (o que já existe não muda) |
| `src/domains/vehicles` | `type-specs.ts`: mapa tipo → campos da ficha, campo principal (TIP-FR-015), fonte de marca (FIPE do tipo ou lista CajuGo), filtros; `catalog-brands.ts` com as marcas e modelos sem FIPE e a ordem das mais procuradas (anexos da spec); `saveDraft`/`publish` validam o tipo da loja e os campos do tipo; `searchText` com o rótulo do tipo e os campos novos; `CONDITIONS` ganha os itens do Histórico que não são da 019 |
| `src/domains/stores` | "O que você vende" em Minha loja [3b]: action com `store.edit`; `storeId` da sessão |
| `src/domains/showcase` | filtro real por `type`; filtros por tipo (`?cc=`, `?horas=`, `?tracao=`); contagem por tipo na lista Tipo; card e página com a ficha do tipo; sitemap só com tipo que tem veículo; catálogo da loja com o filtro Tipo só se a loja vende mais de um (TIP-FR-011) |
| Web | `vehicle-form.tsx`: Tipo como 1º campo e a ficha que muda na hora (estado no cliente, sem recarregar); `store-form` com as caixas dos tipos |
| Jobs | nenhum |

### Colunas novas em `vehicles` (todas anuláveis, exceto `type`)
| Coluna | Tipo | Tipos que usam |
|---|---|---|
| `type` | `vehicle_type` | todos |
| `displacement_cc` | smallint | moto, scooter, quadriciclo |
| `starter` | text (`electric`, `kick`, `both`) | moto, scooter, quadriciclo |
| `axles` | smallint | caminhão, ônibus, implemento |
| `traction` | text (`4x2`, `4x4`, `6x2`, `6x4`…) | caminhão, ônibus, trator, máquinas |
| `load_capacity_kg` | integer | caminhão, implemento |
| `passengers` | smallint | ônibus |
| `hours_used` | integer | trator, máquinas (no lugar de `mileage_km`) |
| `power_hp` | smallint | trator, máquinas |
| `machine_category` | text (lista fechada) | máquinas |
| `seats` | smallint | van, motorhome |
| `beds` | smallint | motorhome |
| `body_make` | text | ônibus (marca da carroceria, TIP-FR-019) |

Colunas em vez de `jsonb`: os filtros (cilindrada, horas, tração) viram `where` simples com índice, e o Drizzle tipa. Os valores de lista fechada são validados no domínio, como `transmission` e `fuel` hoje.

## Mapa requisito → solução
| Requisito | Solução |
|---|---|
| TIP-FR-001 | enum `vehicle_type` com os 12 slugs; rótulos de `VEHICLE_TYPES` (já existe) |
| TIP-FR-002 | `stores.vehicle_types` default `{carro}` (lojas atuais = Carro); `updateStoreTypes` em Minha loja, mínimo 1 tipo |
| TIP-FR-003 | Tipo é o 1º campo do formulário, só com os tipos da loja; marcado quando é um só; trocar no rascunho limpa marca, modelo, versão e campos do tipo (cliente e servidor); `saveDraft` recusa trocar o tipo de veículo já publicado |
| TIP-FR-004 | `TYPE_SPECS[type].fields` decide os campos da ficha na tela e no schema (`z.discriminatedUnion("type", …)`) |
| TIP-FR-005 | `TYPE_SPECS[type].brandSource`: `fipe:cars` (carro, picape, van), `fipe:motorcycles` (moto, scooter), `fipe:trucks` (caminhão, chassi do ônibus), `catalog` (os outros e a carroceria do ônibus) com "Outro" escrito; sem FIPE, nada de `fipe_*` nem selo Abaixo da FIPE |
| TIP-FR-006 | `specLines(vehicle)` monta a ficha do tipo para a página [1b]; o card usa horas no lugar de km quando `TYPE_SPECS[type].usesHours` |
| TIP-FR-007 | `where type = ?` no lugar do `sql\`false\``; facetas de marca filtradas pelo tipo; `TYPE_SPECS[type].filters` decide os chips e as seções da folha e da lateral; `typeCounts` para a lista Tipo |
| TIP-FR-008 | já feito (título por tipo); teste mantido |
| TIP-FR-009 | `searchText` inclui o rótulo do tipo sem acento ("moto", "caminhao") e "160 cc", "2400 h" |
| TIP-FR-011 | catálogo da loja passa `types` só quando `store.vehicleTypes.length > 1` |
| TIP-FR-015 | `publishRules`: campo principal do tipo obrigatório (cilindrada, eixos, horas no lugar do km, lugares) com a mensagem "Informe a cilindrada" etc. |
| TIP-FR-016 | regras de fotos e aprovação não olham o tipo; teste com moto |
| TIP-FR-017 | leilão, sinistro e GNV ficam com a 019 (substitui TIP-FR-018); os demais itens Sim/Não (recuperado de financiamento, ex-táxi/frota/locadora, laudo cautelar aprovado, chave reserva, manual e nota fiscal) entram em `CONDITIONS`, no mesmo `jsonb` de hoje |
| TIP-FR-018 | substituído pela 019 (PRO-FR-005, PRO-FR-006, PRO-FR-009) |
| TIP-FR-019 | `catalog-brands.ts`: `POPULAR_BRANDS[type]` na ordem do anexo, antes das outras; ônibus pede chassi (FIPE de caminhões) e `body_make` (lista CajuGo) |
| TIP-FR-020 | já feito (Buscar · Vender na página inicial e na vitrine) |
| TIP-FR-021 | páginas de tipo já existem; com o tipo real, `noindex` e fora do sitemap quando o tipo não tem veículo na vitrine |
| TIP-NFR-001 | e2e em 390 e 1280 px de Minha loja, cadastro de moto e vitrine filtrada; `pnpm design:shots` |
| TIP-NFR-002 | troca de tipo só no estado do formulário (client component), sem navegação |
| TIP-NFR-003 | páginas de tipo seguem SEO.md §6 (já com título, canônica e trilha); JSON-LD `ItemList` com os veículos do tipo |
| TIP-SEC-001 | `storeId` da sessão; veículo de outra loja → 404 (padrão de `saveDraft`) |
| TIP-SEC-002 | `updateStoreTypes` exige `store.edit` (só `store_owner`) |
| TIP-SEC-003 | schema estrito por tipo (campo de outro tipo → erro no campo); tipo fora de `store.vehicleTypes` → erro no campo `type` |

## Modelo de dados
```sql
CREATE TYPE vehicle_type AS ENUM ('carro','moto','scooter','picape','van','onibus',
  'caminhao','trator','quadriciclo','maquinas','motorhome','implemento');
ALTER TABLE vehicles ADD COLUMN type vehicle_type NOT NULL DEFAULT 'carro',
  ADD COLUMN displacement_cc smallint, ADD COLUMN starter text, ADD COLUMN axles smallint,
  ADD COLUMN traction text, ADD COLUMN load_capacity_kg integer, ADD COLUMN passengers smallint,
  ADD COLUMN hours_used integer, ADD COLUMN power_hp smallint, ADD COLUMN machine_category text,
  ADD COLUMN seats smallint, ADD COLUMN beds smallint, ADD COLUMN body_make text;
ALTER TABLE stores ADD COLUMN vehicle_types vehicle_type[] NOT NULL DEFAULT '{carro}';
CREATE INDEX vehicles_status_type_rank ON vehicles (status, type, rank_score DESC, id);
```
Só aditiva: todo veículo e toda loja existentes viram Carro, como diz TIP-FR-002.

## Estratégia de testes
- **Unitário:** `TYPE_SPECS` (campos, campo principal, fonte da marca), `POPULAR_BRANDS` na ordem, `specLines`, `searchText` com tipo e cilindrada.
- **Integração (PGlite):** `saveDraft`/`publish` por tipo (moto sem cilindrada recusa; trator sem horas recusa; carro com horas recusa; tipo que a loja não vende recusa; loja B → 404); `updateStoreTypes` (dono salva, usuário da loja 403); vitrine filtrada por tipo com facetas e contagem; FIPE de motos com o client falso e ids com prefixo.
- **e2e:** lojista marca Moto em Minha loja, cadastra e publica uma moto; comprador filtra Moto e acha; 390 e 1280 px.

## Riscos e alternativas descartadas
- **`jsonb` para a ficha:** descartado; filtrar por cilindrada e horas ficaria sem índice simples e sem tipagem.
- **Uma tabela FIPE por tipo:** descartado; prefixo no id mantém as 4 tabelas e não mexe nos carros já gravados.
- **Cota da FIPE (500/dia):** motos e caminhões dividem a cota com carros; a cópia sob demanda e a validade de 30 dias continuam valendo. Se a cota apertar, o formulário mostra "Escreva a marca e o modelo" (já existe para FIPE fora do ar).
- **Spec grande:** a 014b já levou descoberta, alertas, admin e landing. Aqui ficam ~16 tasks.

## Conformidade
- [x] Todo requisito da spec aparece no mapa
- [x] Actions seguem o API.md §2 (schema estrito por tipo, sessão, posse, saída explícita)
- [x] Toda action com id checa a posse (veículo e loja pela sessão)
- [x] Schemas não aceitam campo privilegiado (`storeId`, `status` fora)
- [x] Sem dado pessoal novo
- [x] Sem formulário público novo
- [x] Índice previsto para a vitrine por tipo
- [x] Migration aditiva
- [x] Nada do Supabase além de Postgres e Auth
