---
spec: 014
---

# Tasks · 014 Tipos de veículo e o que a loja vende

Já no ar antes deste plano: faixa de tipos, páginas `/motos` etc., Buscar · Vender, título por tipo (TIP-FR-007 em parte, TIP-FR-008, TIP-FR-020, TIP-FR-021 em parte).

## Fundação
- [ ] **T001** Migration `0028`: enum `vehicle_type`, `vehicles.type` e colunas da ficha, `stores.vehicle_types`, índice `vehicles_status_type_rank`; teste de migration (lojas e veículos existentes viram Carro). · _TIP-FR-001, TIP-FR-002_
- [ ] **T002** `type-specs.ts`: campos, campo principal, fonte da marca, uso de horas e filtros por tipo; testes unitários. · _TIP-FR-004, TIP-FR-005, TIP-FR-015_
- [ ] **T003** `catalog-brands.ts`: marcas e modelos sem FIPE e `POPULAR_BRANDS` por tipo, na ordem dos anexos; testes. · _TIP-FR-005, TIP-FR-019_

## Loja
- [ ] **T004** "O que você vende" em Minha loja [3b]: `updateStoreTypes` (`store.edit`, mínimo 1), caixas na tela; loja B e usuário da loja recusados. · _TIP-FR-002, TIP-SEC-001, TIP-SEC-002_

## Cadastro do veículo
- [ ] **T005** `saveDraft` com `type` (só os da loja; troca no rascunho limpa marca, modelo, versão e ficha; publicado não troca) e schema estrito por tipo. · _TIP-FR-003, TIP-SEC-003_
- [ ] **T006** FIPE de motos e caminhões: client por `kind`, ids com prefixo, `brands/models/years/reference` por tipo; client falso nos testes. · _TIP-FR-005_
- [ ] **T007** Tela [2a]: Tipo como 1º campo, ficha que muda na hora, marca da FIPE do tipo ou da lista CajuGo com "Outro", chassi e carroceria no ônibus. · _TIP-FR-003, TIP-FR-004, TIP-FR-019, TIP-NFR-002_
- [ ] **T008** Publicar: campo principal do tipo obrigatório; fotos e aprovação iguais para todos (teste com moto). · _TIP-FR-015, TIP-FR-016_
- [ ] **T009** Histórico do veículo: itens Sim/Não que não são da 019 em `CONDITIONS`. · _TIP-FR-017_

## Vitrine e página
- [ ] **T010** Filtro real por tipo (sai o `sql\`false\``), marcas e contagem por tipo, `typeCounts` na lista Tipo. · _TIP-FR-007_
- [ ] **T011** Filtros de cada tipo (cilindrada, horas, tração) na URL, nos chips, na folha e na lateral. · _TIP-FR-007_
- [ ] **T012** Ficha do tipo na página [1b] e horas no lugar de km no card. · _TIP-FR-006_
- [ ] **T013** `searchText` com o tipo e os campos novos ("moto 160"). · _TIP-FR-009_
- [ ] **T014** Catálogo da loja: filtro Tipo só com mais de um tipo. · _TIP-FR-011_
- [ ] **T015** Páginas de tipo: `noindex` e fora do sitemap sem veículo; JSON-LD `ItemList`. · _TIP-FR-021, TIP-NFR-003_

## Fechamento
- [ ] **T016** e2e (Minha loja com Moto, cadastrar e publicar moto, filtrar Moto) em 390 e 1280 px; comparação com o design. · _TIP-NFR-001_
- [ ] **T017** `/verify`: rastreabilidade, status `implemented`, PLAN.md. · _—_
