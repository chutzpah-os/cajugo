---
id: 006
slug: showcase
title: Vitrine, catálogo da loja e página do veículo
status: in-progress
owner: dono do produto
created: 2026-11-09
---

# 006 · Vitrine, catálogo da loja e página do veículo

## Contexto
É aqui que o comprador chega, e é pela busca do Google que ele chega: o SEO é o principal ativo do CajuGo (`docs/SEO.md`). A vitrine [1a] reúne os veículos que as lojas escolheram divulgar; o catálogo da loja usa o mesmo layout, só com o estoque daquela loja; a página do veículo [1b] convence e leva ao WhatsApp. O mesmo veículo aparece nos dois lugares e sai de ambos em segundos ao ser vendido (PRD §5.5).
Sucesso: as páginas de veículo e de loja são encontradas no Google com título, preço e foto corretos, e o comprador vai da busca ao WhatsApp da loja em poucos toques, no celular.

## Atores
- **Visitante/comprador** (não conectado): busca, filtra, vê veículos e chama a loja.
- **Lojista** e **usuário da loja**: veem a lista de Meus veículos [1c], agora paginada.
- **Mecanismos de busca**: leem o conteúdo, os dados estruturados e o sitemap.

## Fora de escopo
- Formulário de mensagem à loja, lead ao clicar no WhatsApp e denúncia [14d] (spec 007). Aqui o botão WhatsApp só abre a conversa.
- Comissão e atribuição de venda ao vendedor (specs 008/009).
- Ocultar veículo pelo admin (spec 007).
- Domínio próprio (decisão do dono: ainda não).

- Páginas de descoberta por marca, modelo e cidade e links internos entre elas (spec **006b**, logo depois desta).
- Simulador [14b], favoritos [14a], "Avisar quando chegar" [12a] e banner Caju Indica [9a] (spec **006c**, depois da 006b).

## Requisitos funcionais
- **SHW-FR-001** A vitrine [1a] mostra o título "Carros usados e seminovos à venda", o contador "X anúncios de Y lojas" e os veículos publicados e divulgados de lojas no ar, cada um com "Anunciado por {loja}"; sem nenhum veículo, mostra "Os primeiros veículos estão chegando" com um convite para lojistas e fica fora do Google até ter pelo menos 1 veículo.
- **SHW-FR-002** O catálogo da loja usa o mesmo layout, com o cabeçalho da loja (logo ou sigla, nome e cidade), o título "Estoque {loja}", o contador "X veículos disponíveis" e todos os veículos publicados da loja, divulgados ou não.
- **SHW-FR-003** O card do veículo mostra a capa com o contador de fotos, marca e modelo, versão, ano de fabricação/modelo, km, cidade (UF), preço, "a partir de R$ X/mês*" (só se o lojista ativou; entrada, prazo e taxa vêm das regras editáveis em [4c], 20%, 48x e 1,79% a.m. no início) e "Ver detalhes"; mostra um selo por card, na ordem Abaixo da FIPE (só quando o preço é menor que a referência), Único dono, Aceita troca e Garantia de fábrica.
- **SHW-FR-004** A busca encontra veículos por marca, modelo ou versão, sem diferenciar maiúsculas nem acentos.
- **SHW-FR-005** Os filtros [6d] (marca múltipla, preço de/até, ano de/até, km até, câmbio e combustível) mostram quantos estão ativos, têm "Limpar" e "Ver N veículos" com a contagem ao vivo, e ficam no endereço da página para compartilhar.
- **SHW-FR-006** A ordenação oferece Mais relevantes (padrão: publicação recente e anúncio completo), Menor preço, Maior preço, Mais recentes, Menor km e Ano mais novo.
- **SHW-FR-007** Vitrine, catálogo da loja e Meus veículos [1c] carregam de 20 em 20, com "Carregar mais veículos".
- **SHW-FR-008** Todo veículo publicado, divulgado ou não, tem um único endereço (`/v/{id}-marca-modelo-ano-cidade-uf`), e a página [1b] mostra galeria com contador, todos os selos que se aplicam, marca, modelo e versão, preço, parcela estimada (se ativada), ficha técnica com o final de placa, condições marcadas, "Sobre este carro", itens, card da loja com "Ver estoque da loja" e a barra fixa com WhatsApp, que abre a conversa no contato do anúncio com mensagem citando o veículo e o link.
- **SHW-FR-009** A página do veículo pode ser compartilhada (compartilhamento do aparelho ou copiar link), e o código de um link de vendedor (`?ref=`) é guardado por 30 dias, valendo o último link aberto, para a spec 007 ligar o contato ao vendedor.
- **SHW-FR-010** Veículo vendido ou excluído aberto por link direto mostra "Este veículo já foi vendido" [12d] com veículos parecidos.
- **SHW-FR-011** O catálogo de loja suspensa mostra "Catálogo temporariamente indisponível" [12g], sem expor o motivo; o link direto de um veículo dessa loja mostra o mesmo aviso.
- **SHW-FR-012** Busca sem resultado [12a] sugere limpar filtros ou buscar só a marca; erro de carregamento [12b] mostra "Tentar de novo"; o carregamento [12c] mostra o esqueleto no formato do conteúdo.
- **SHW-FR-013** Cada página de vitrine, loja e veículo tem título e descrição únicos, endereço amigável, canônica sem filtros nem `?ref=`, dados estruturados do tipo da página, prévia de link com foto e `alt` nas imagens, conforme `docs/SEO.md`.
- **SHW-FR-014** Endereço antigo de loja ou de veículo, com texto desatualizado ou no formato `/loja/{slug}/v/{id}`, responde redirecionamento permanente de verdade (status 301/308) e endereço inexistente responde 404 de verdade, antes de qualquer conteúdo.
- **SHW-FR-015** O sitemap lista a vitrine, as lojas no ar e os veículos publicados, e deixa de listar veículo vendido ou loja fora do ar assim que isso acontece.

## Requisitos não funcionais
- **SHW-NFR-001** Todas as telas funcionam em 390 px, com alvos de toque de pelo menos 44 px e campos com rótulo; em 1280 px a vitrine tem filtros laterais e grade de 3 colunas [15a].
- **SHW-NFR-002** O conteúdo principal das páginas públicas chega no HTML do servidor, sem depender de JavaScript.
- **SHW-NFR-003** As páginas públicas têm LCP abaixo de 2,5 s em 4G, CLS abaixo de 0,1 e INP abaixo de 200 ms (`docs/SEO.md`).
- **SHW-NFR-004** Um veículo vendido, despublicado ou excluído sai da vitrine e do catálogo em até 60 segundos (PRD §5.3).
- **SHW-NFR-005** As páginas públicas ficam em cache, sem estourar as cotas gratuitas.

## Requisitos de segurança e privacidade
- **SHW-SEC-001** Nenhuma página pública, dado estruturado, sitemap ou resposta traz placa completa, chassi, CPF/CNPJ ou dados de cobrança da loja.
- **SHW-SEC-002** A vitrine nunca mostra veículo não divulgado, nem o catálogo da loja A mostra veículo da loja B.
- **SHW-SEC-003** Rascunho, veículo excluído ou de loja fora do ar nunca aparece em listagem pública nem no sitemap.
- **SHW-SEC-004** Filtros, ordenação e busca só aceitam valores válidos e limitados; valor inválido na URL é ignorado, sem erro.
- **SHW-SEC-005** O código `?ref=` guardado não dá acesso a nada nem revela quem é o vendedor na página.

## Critérios de aceite
### SHW-FR-001
- **Dado** 2 lojas no ar com 3 veículos divulgados e 1 só no catálogo
- **Quando** um visitante abre a vitrine
- **Então** vê "3 anúncios de 2 lojas" e os 3 veículos, cada um com "Anunciado por {loja}"
- **E** sem nenhum veículo no ar, vê "Os primeiros veículos estão chegando" e o convite para lojistas, e a página não é indexada
- **E** quando o primeiro veículo é publicado, a página passa a ser indexável sem ajuste manual

### SHW-FR-002
- **Dado** a loja "Silva Autocar" com 2 veículos divulgados e 1 só no catálogo
- **Quando** um visitante abre `/loja/silvautocar`
- **Então** vê "Estoque Silva Autocar", "3 veículos disponíveis" e os 3 veículos, sem linha de loja no card

### SHW-FR-003
- **Dado** um veículo de R$ 76.320 com referência FIPE de R$ 80.000 e a parcela ativada
- **Quando** aparece na vitrine
- **Então** o card mostra "Abaixo da FIPE" e "a partir de R$ X/mês*"
- **E** um veículo acima da referência não mostra o selo, e um sem parcela ativada não mostra a parcela
- **E** quando o admin muda a entrada ou o prazo em [4c], a parcela mostrada acompanha
- **E** um veículo único dono que também aceita troca e está acima da referência mostra só "Único dono"

### SHW-FR-004
- **Dado** um "Citroën C3" publicado
- **Quando** o visitante busca "citroen"
- **Então** o veículo aparece

### SHW-FR-005
- **Dado** o visitante com os filtros abertos
- **Quando** escolhe a marca BMW e câmbio Automático
- **Então** o botão mostra "Ver N veículos" com a contagem certa, o chip mostra 2 filtros ativos e o endereço fica com `?marca=bmw&cambio=automatico`
- **E** abrir esse endereço em outro aparelho mostra o mesmo resultado

### SHW-FR-006
- **Dado** veículos de preços diferentes
- **Quando** o visitante escolhe Menor preço
- **Então** a lista vem do mais barato para o mais caro

### SHW-FR-007
- **Dado** 45 veículos
- **Quando** o visitante abre a lista e toca duas vezes em "Carregar mais veículos"
- **Então** vê 20, depois 40, depois 45, e o botão some, sem veículo repetido

### SHW-FR-008
- **Dado** um veículo publicado com placa ABC1D23 e contato (79) 99999-0000
- **Quando** o visitante abre a página
- **Então** vê galeria, preço, ficha com final de placa "3", itens e o card da loja
- **E** o WhatsApp abre a conversa com (79) 99999-0000 e uma mensagem com o veículo e o link
- **E** um veículo não divulgado abre no mesmo formato de endereço, com a loja no cabeçalho

### SHW-FR-009
- **Dado** um link de veículo com `?ref=ANA10`
- **Quando** o visitante abre e navega para outro veículo
- **Então** o código continua guardado por 30 dias
- **E** ao abrir depois um link com `?ref=BIA20`, passa a valer `BIA20`
- **E** "Compartilhar" usa o compartilhamento do aparelho ou copia o link, sem o `?ref=` de quem compartilhou

### SHW-FR-010
- **Dado** um veículo vendido
- **Quando** alguém abre o link direto
- **Então** vê "Este veículo já foi vendido" e veículos parecidos, e a página não é indexada

### SHW-FR-011
- **Dado** uma loja suspensa
- **Quando** um visitante abre o catálogo ou o link de um veículo dela
- **Então** vê "Catálogo temporariamente indisponível", sem nada sobre pagamento

### SHW-FR-012
- **Dado** uma busca sem resultado com filtros
- **Quando** a lista vem vazia
- **Então** o visitante vê as sugestões de limpar filtros e buscar só a marca
- **E** essa página não é indexada

### SHW-FR-013
- **Dado** um veículo publicado e divulgado
- **Quando** um buscador lê a página
- **Então** o título segue `{Marca} {Modelo} {Versão} {Ano} – {Cidade}/{UF} | CajuGo`, há `Car` + `Offer` + `BreadcrumbList`, a prévia tem a foto de capa e a canônica não tem `?ref=`
- **E** a loja tem `AutoDealer`, e a vitrine tem `Organization`, `WebSite` e `ItemList`

### SHW-FR-014
- **Dado** uma loja que trocou de endereço
- **Quando** um buscador pede o endereço antigo
- **Então** recebe o status de redirecionamento permanente para o novo
- **E** `/loja/{slug}/v/{id}` e um endereço de veículo com o texto desatualizado redirecionam para o endereço atual
- **E** um endereço de loja ou veículo inexistente recebe status 404

### SHW-FR-015
- **Dado** um veículo publicado que entra no sitemap
- **Quando** ele é vendido
- **Então** sai do sitemap

### SHW-SEC-001
- **Dado** um veículo com placa ABC1D23 e chassi e uma loja com CNPJ
- **Quando** se lê o HTML, o JSON-LD e o sitemap da vitrine, da loja e do veículo
- **Então** nenhum desses dados aparece

### SHW-SEC-002
- **Dado** a loja A com um veículo não divulgado e a loja B com um veículo
- **Quando** se abre a vitrine e o catálogo da loja A
- **Então** a vitrine não mostra o não divulgado, e o catálogo de A não mostra o veículo de B

### SHW-SEC-003
- **Dado** um rascunho, um excluído e um veículo de loja cadastrada
- **Quando** se abre a vitrine, os catálogos e o sitemap
- **Então** nenhum deles aparece

### SHW-SEC-004
- **Dado** um endereço com `?ordem=<script>` e `?preco_ate=abc`
- **Quando** a página abre
- **Então** esses valores são ignorados e a lista aparece normalmente

### SHW-SEC-005
- **Dado** um link com `?ref=ANA10`
- **Quando** o visitante vê a página
- **Então** nada na tela ou no HTML identifica o vendedor

## Pendências
Respostas do `/clarify` (rodada 1, 2026-11-09): dividir em 006, 006b e 006c, nessa ordem; endereço único `/v/{id}-texto` para todo veículo; vitrine vazia com convite e fora do Google até ter 1 veículo; entrada e prazo da parcela como regras em [4c]; `?ref=` guardado 30 dias, vale o último. Rodada 2: um selo por card (Abaixo da FIPE, Único dono, Aceita troca, Garantia de fábrica), todos na página do veículo.

Nenhuma.
