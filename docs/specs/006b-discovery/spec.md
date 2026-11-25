---
id: 006b
slug: discovery
title: Páginas de descoberta por marca, modelo e cidade
status: implemented
owner: dono do produto
created: 2026-11-15
---

# 006b · Páginas de descoberta por marca, modelo e cidade

## Contexto
O SEO é o principal ativo da CajuGo (`SEO.md` §1): boa parte das buscas é por marca, modelo ou cidade ("fiat 500 usado", "carros usados em campinas", "fiat usado campinas"), e nem a vitrine [1a] nem uma página de veículo [1b] respondem bem a essas buscas. As páginas de descoberta dão a cada marca, modelo e cidade com estoque uma página própria, indexável e ligada às páginas de veículo e de loja. Sucesso: as páginas de descoberta passam a aparecer no Search Console com impressões e cliques próprios, e nenhuma página vazia é indexada.

## Atores
- **Visitante** (comprador, não autenticado)
- **Buscador** (Google e outros), que lê o HTML e o sitemap

## Fora de escopo
- Textos editoriais escritos à mão por marca ou cidade.
- Modelo dentro da cidade (`/carros/campinas-sp/fiat/argo`) e páginas por versão, ano, faixa de preço ou carroceria.
- Favoritos, simulador, "Avisar quando chegar" e banner Caju Indica (spec 006c).
- Domínio próprio e troca de endereço (spec 013).

## Requisitos funcionais
- **DSC-FR-001** Cada marca com pelo menos 1 veículo na vitrine CajuGo tem uma página que lista esses veículos.
- **DSC-FR-002** Cada modelo com pelo menos 1 veículo na vitrine tem uma página, dentro da página da marca, que lista esses veículos.
- **DSC-FR-003** Cada cidade com pelo menos 1 veículo na vitrine tem uma página que lista os veículos das lojas daquela cidade, e cada marca com veículo nessa cidade tem uma página dentro da página da cidade.
- **DSC-FR-004** A página de descoberta usa a lista da vitrine [1a] (mesmo card, contador, "Carregar mais veículos" de 20 em 20, estados [12a], [12b], [12c]) com busca, filtros [6d] e ordenação, sempre com a marca, o modelo ou a cidade da página já fixos; os filtros ficam no endereço da página.
- **DSC-FR-005** Quando uma página de descoberta fica sem veículos, o endereço continua respondendo com "Nenhum {Marca Modelo} à venda agora" e veículos da página acima (do modelo para a marca, da marca na cidade para a cidade, da marca ou da cidade para a vitrine), fora do Google, e volta a ser indexável sozinha com o 1º veículo.
- **DSC-FR-006** Cada página de descoberta tem título e descrição únicos no formato do `SEO.md` (`{Marca} {Modelo} usados à venda {em Cidade} | CajuGo`) e um parágrafo gerado com o número de veículos, de cidades ou lojas e a faixa de preço.
- **DSC-FR-007** Cada página de descoberta mostra o caminho de navegação (Início › Carros › Marca › Modelo; Início › Carros › Cidade › Marca).
- **DSC-FR-008** A página do veículo [1b] leva às páginas da marca, do modelo e da cidade do veículo, quando elas têm veículos.
- **DSC-FR-009** O catálogo da loja [1a] leva à página da cidade da loja, quando ela tem veículos.
- **DSC-FR-010** As páginas de descoberta com veículos entram no sitemap, num arquivo próprio listado no `robots.txt`, e saem dele quando ficam sem veículos.
- **DSC-FR-011** O nome da marca na página e no endereço é o nome que o comprador conhece, por uma lista de correções dos nomes da tabela FIPE ("GM - Chevrolet" → "Chevrolet", "VW - VolksWagen" → "Volkswagen", "ASTON MARTIN" → "Aston Martin"); o nome do modelo fica como na FIPE.
- **DSC-FR-012** Os endereços são `/carros/{marca}`, `/carros/{marca}/{modelo}`, `/carros/{cidade}-{uf}` e `/carros/{cidade}-{uf}/{marca}`, em minúsculas, sem acento e com hífen; a cidade sempre termina com uma das 27 UFs, e nenhuma marca tem esse formato.
- **DSC-FR-013** ~~A página `/carros` lista todas as marcas e cidades…~~ Substituído em 2026-11-25 (pedido do dono, specs 014/017): `/carros` passou a ser a vitrine de carros, como `/motos` e as outras páginas de tipo; o índice de marcas e cidades saiu. As páginas `/carros/{marca}` e `/carros/{cidade}` continuam.

## Requisitos não funcionais
- **DSC-NFR-001** As páginas funcionam em 390 px e em 1280 px no mesmo layout da vitrine [15a].
- **DSC-NFR-002** O conteúdo principal chega no HTML do servidor, sem depender de JavaScript.
- **DSC-NFR-003** LCP abaixo de 2,5 s em 4G, CLS abaixo de 0,1 e INP abaixo de 200 ms (`SEO.md`).
- **DSC-NFR-004** Um veículo publicado, vendido ou despublicado aparece ou some das páginas de descoberta em até 60 segundos (PRD §5.3).
- **DSC-NFR-005** As páginas ficam em cache, sem estourar as cotas gratuitas, mesmo com centenas de marcas, modelos e cidades.

## Requisitos de segurança e privacidade
- **DSC-SEC-001** As páginas de descoberta e o índice só mostram e contam veículos que aparecem na vitrine CajuGo: publicados, divulgados na CajuGo e de loja no ar.
- **DSC-SEC-002** Um veículo que a loja A não divulga na CajuGo nunca aparece nas páginas de descoberta nem pesa na contagem, na faixa de preço, no índice ou no sitemap.
- **DSC-SEC-003** Nenhuma página de descoberta mostra placa inteira, chassi nem documento, nem no HTML, nos dados estruturados ou no sitemap.
- **DSC-SEC-004** Endereço de descoberta inventado, com marca, modelo ou cidade que nunca teve veículo, ou com texto inválido, não chega ao banco como texto livre e responde 404.

## Critérios de aceite
### DSC-FR-001
- **Dado** 3 veículos Fiat divulgados na vitrine, de 2 lojas
- **Quando** o visitante abre `/carros/fiat`
- **Então** vê os 3 veículos e o contador "3 anúncios de 2 lojas"

### DSC-FR-002
- **Dado** 2 Fiat Argo e 1 Fiat Mobi na vitrine
- **Quando** o visitante abre `/carros/fiat/argo`
- **Então** vê só os 2 Argo

### DSC-FR-003
- **Dado** uma loja em Campinas/SP com 3 Fiat e 1 BMW na vitrine, e uma loja em Sumaré/SP com 1 Fiat
- **Quando** o visitante abre `/carros/campinas-sp` e depois `/carros/campinas-sp/fiat`
- **Então** vê os 4 veículos de Campinas e depois só os 3 Fiat de Campinas

### DSC-FR-004
- **Dado** 45 veículos Fiat na vitrine, 7 com câmbio automático
- **Quando** o visitante abre `/carros/fiat`, toca duas vezes em "Carregar mais veículos" e depois filtra por Automático
- **Então** vê 20, depois 40, depois 45, sem repetir, e depois só os 7 automáticos, com o endereço `/carros/fiat?cambio=automatico`
- **E** a canônica dessa página filtrada é `/carros/fiat`, e os filtros não oferecem trocar a marca

### DSC-FR-005
- **Dado** `/carros/fiat/mobi` com 1 veículo e outros Fiat na vitrine
- **Quando** o Mobi é vendido
- **Então** em até 60 segundos o endereço mostra "Nenhum Fiat Mobi à venda agora" e veículos Fiat, e a página fica fora do Google
- **E** quando um Mobi é publicado de novo, a página volta a listar e a ser indexável sem ajuste manual

### DSC-FR-006
- **Dado** 3 Fiat Argo na vitrine, de 2 cidades, de R$ 50.000 a R$ 70.000
- **Quando** o buscador lê `/carros/fiat/argo`
- **Então** o título é "Fiat Argo usados à venda | CajuGo", a descrição cita os 3 veículos e a faixa de preço
- **E** a página tem o parágrafo "3 Fiat Argo usados à venda em 2 cidades, de R$ 50.000 a R$ 70.000" (ou equivalente)

### DSC-FR-007
- **Dado** a página `/carros/fiat/argo`
- **Quando** o visitante a abre
- **Então** vê o caminho Início › Carros › Fiat › Argo, com os anteriores clicáveis
- **E** o buscador lê o mesmo caminho nos dados estruturados

### DSC-FR-008
- **Dado** um Fiat Argo de uma loja de Campinas/SP, e as páginas da Fiat, do Argo e de Campinas/SP têm veículos
- **Quando** o visitante abre a página do veículo
- **Então** encontra links para as três páginas
- **E** um link para uma página sem veículos não aparece

### DSC-FR-009
- **Dado** uma loja de Campinas/SP e a página de Campinas/SP tem veículos
- **Quando** o visitante abre o catálogo da loja
- **Então** encontra um link para "Carros usados em Campinas/SP"

### DSC-FR-010
- **Dado** as páginas da Fiat, do Argo, de Campinas/SP e da Fiat em Campinas/SP têm veículos
- **Quando** o buscador lê o sitemap
- **Então** as quatro estão no arquivo de descoberta, listado no `robots.txt`, junto com `/carros`
- **E** depois que o último Argo é vendido, a página do Argo sai do sitemap

### DSC-FR-011
- **Dado** um veículo da marca "GM - Chevrolet" na tabela FIPE
- **Quando** o visitante abre a página da marca
- **Então** o endereço é `/carros/chevrolet` e o título e o caminho mostram "Chevrolet"

### DSC-FR-012
- **Dado** a marca Citroën e a cidade de São José do Rio Preto/SP com veículos
- **Quando** o visitante copia os endereços
- **Então** eles são `/carros/citroen` e `/carros/sao-jose-do-rio-preto-sp`, e um nunca é lido como o outro

### DSC-FR-013
- **Dado** veículos de Fiat e BMW, em Campinas/SP e Sumaré/SP
- **Quando** o visitante abre `/carros`
- **Então** vê as duas marcas e as duas cidades com a contagem de cada uma, com links para as páginas
- **E** a vitrine [1a] tem os links "Buscar por marca" e "Buscar por cidade" para `/carros`

### DSC-SEC-001
- **Dado** um Fiat publicado de uma loja suspensa e um Fiat em rascunho
- **Quando** o visitante abre `/carros/fiat` e `/carros`
- **Então** nenhum dos dois aparece nem entra nas contagens

### DSC-SEC-002
- **Dado** a loja A com o único Fiat Mobi, não divulgado na CajuGo
- **Quando** o visitante abre `/carros/fiat/mobi`
- **Então** a página mostra "Nenhum Fiat Mobi à venda agora", fora do Google, e o Mobi não aparece em nenhuma página de descoberta, no índice nem no sitemap

### DSC-SEC-003
- **Dado** um veículo com placa ABC1D23 na página de Campinas/SP
- **Quando** o buscador lê o HTML, os dados estruturados e o sitemap
- **Então** "ABC1D23" e o chassi não aparecem em nenhum deles

### DSC-SEC-004
- **Dado** os endereços `/carros/marca-que-nao-existe`, `/carros/fiat/<script>` e `/carros/cidade-xx`
- **Quando** alguém os abre
- **Então** recebe 404 com a página não encontrada, sem erro

## Pendências
Nenhuma. Resolvidas no `/clarify` de 2026-11-15:
- Endereço: `/carros/{marca}`, `/carros/{marca}/{modelo}`, `/carros/{cidade}-{uf}`, `/carros/{cidade}-{uf}/{marca}` (DSC-FR-003, DSC-FR-012).
- Página sem veículos: 200 com alternativas e fora do Google; 404 só para o que nunca existiu (DSC-FR-005, DSC-SEC-004).
- Nome da marca: lista de correções; modelo como na FIPE (DSC-FR-011).
- Filtros: os da vitrine, com a dimensão da página fixa (DSC-FR-004).
- Índice `/carros` com link na vitrine e parágrafo gerado em cada página (DSC-FR-006, DSC-FR-013).
