---
id: 014
slug: vehicle-types
title: Tipos de veículo e o que a loja vende
status: planned
owner: dono do produto
created: 2026-11-24
---

# 014 · Tipos de veículo e o que a loja vende

## Contexto
Hoje a CajuGo só anuncia carros:
- o cadastro [2a] parte da lista FIPE de carros;
- a vitrine [1a] se chama "Carros usados e seminovos";
- as páginas de descoberta ficam em `/carros/...`.

Lojas de motos, caminhões, ônibus, utilitários e máquinas agrícolas não conseguem anunciar, e o comprador desses veículos não acha nada. Esta spec abre a plataforma para todos os tipos de veículo. O lojista diz o que vende, e cada veículo tem o seu tipo, com a ficha certa. A vitrine filtra por tipo, e cada tipo tem os seus endereços próprios para o Google.

Sucesso: uma loja de motos se cadastra, publica uma moto com a ficha de moto, e o comprador a encontra filtrando "Moto" na vitrine e pela busca "motos usadas em Aracaju".

## Atores
- **Lojista**: diz o que vende e cadastra veículos de qualquer tipo.
- **Usuário da loja**: cadastra veículos dos tipos da loja.
- **Visitante/comprador**: filtra e encontra os veículos por tipo.
- **Admin**: vê o tipo nas filas de aprovação e denúncia.

## Fora de escopo
- Máquinas de construção (retroescavadeira, empilhadeira), náutica (lancha, jet ski), aeronaves e bicicletas.
- Preço da mensalidade, taxa CajuGo e regras da Rede Caju diferentes por tipo (continuam iguais para todos).
- Leilão, consórcio e financiamento diferentes por tipo (o simulador continua o mesmo).
- Páginas de descoberta por tipo, alertas de busca por tipo, tipo nas filas do admin, landing e cadastro da loja com o tipo: ficam na **014b**.
- Lista de marcas dos tipos sem FIPE editável pelo admin (fase 2; no MVP a lista é da CajuGo).
- Tipo no endereço da página do veículo (`/v/...` continua igual: mudar quebraria links e SEO).

## Requisitos funcionais
- **TIP-FR-001** A CajuGo trabalha com estes **tipos de veículo**:
  - Carro;
  - Moto;
  - Scooter;
  - Picape;
  - Van e furgão;
  - Ônibus e micro-ônibus;
  - Caminhão;
  - Trator;
  - Quadriciclo e UTV;
  - Motorhome e trailer;
  - Implemento (reboque, carreta, semirreboque);
  - Máquinas pesadas (retroescavadeira, pá carregadeira, escavadeira, empilhadeira, colheitadeira, motoniveladora), incluída a pedido do dono do produto em 2026-11-25.
- **TIP-FR-002** Em Minha loja [3b], o lojista marca **o que a loja vende** (um ou mais tipos). Para as lojas que já existem, vale **Carro**.
- **TIP-FR-003** No cadastro do veículo [2a], o **tipo** é o primeiro campo, com os tipos da loja, e já vem marcado quando a loja vende um só. Trocar o tipo de um rascunho limpa a marca, o modelo e a versão. O tipo não muda depois de publicado.
- **TIP-FR-004** A **ficha técnica** [2a] mostra só os campos do tipo:
  - **carro e picape:** os de hoje;
  - **moto, scooter e quadriciclo:** cilindrada e partida, sem portas nem carroceria;
  - **caminhão, ônibus e implemento:** eixos, tração, capacidade de carga ou de passageiros e, no ônibus, carroceria;
  - **trator e máquinas pesadas:** horas de uso no lugar da quilometragem, potência e tração; nas máquinas, também a **categoria** (retroescavadeira, pá carregadeira, escavadeira, empilhadeira, colheitadeira, motoniveladora, outra);
  - **van, motorhome e trailer:** lugares e, no motorhome, camas.
- **TIP-FR-005** Marca, modelo e versão vêm da lista FIPE do tipo quando ela existe:
  - carros, também para picape e van (o lojista escolhe o tipo; a FIPE não decide);
  - motos, também para scooter;
  - caminhões, também para ônibus.

  Nos outros tipos (trator, máquinas pesadas, quadriciclo, motorhome, implemento) e na carroceria do ônibus, o lojista escolhe a marca e o **modelo** de uma **lista da CajuGo** (anexo "Modelos sem FIPE") ou escreve o modelo em "Outro"; a versão é escrita. Para esses tipos não há referência FIPE nem o selo "Abaixo da FIPE".
- **TIP-FR-006** O tipo e os campos dele aparecem:
  - na página do veículo [1b], na ficha (ex.: "Cilindrada 160 cc", "Horas de uso 2.400 h");
  - no card [1a], no lugar de ano · km quando o tipo usa horas.
- **TIP-FR-007** A vitrine [1a]/[15a] tem o filtro **Tipo** no topo da árvore de filtros: **Tipo → Marca → Modelo**. Marcar um tipo mostra só as marcas dele, com a contagem. Além disso:
  - sem tipo escolhido, o lugar da barra de filtros (abaixo da busca) mostra a **faixa de tipos**: um cartão por tipo, com uma ilustração vetorial (SVG) de um veículo só, fornecida pelo dono do produto, e o nome embaixo, na ordem de TIP-FR-001 (Carro, Moto, Scooter, Picape, Van e furgão, Ônibus e micro-ônibus, Caminhão, Trator, Quadriciclo e UTV, Máquinas pesadas, Motorhome e trailer, Implementos), rolando na horizontal;
  - tocar num cartão filtra pelo tipo, e a faixa dá lugar à barra de filtros daquele tipo: **Filtros**, o chip **Tipo** com o tipo escolhido (para trocar ou tirar; sem tipo, a faixa volta) e os filtros do tipo;
  - na folha de **Filtros** e no filtro lateral do desktop [15a], a primeira seção é **Tipo de veículo**, com todos os tipos e a contagem, antes de Marca;
  - escolhido um tipo, aparecem os filtros dele (ex.: Km e Câmbio para carro e picape; Km e Cilindrada para moto e scooter; Horas de uso e Tração para trator e máquinas pesadas), tanto nos chips quanto na folha de **Filtros**.
- **TIP-FR-021** (pedido do dono do produto, 2026-11-25, pelo SEO) Cada tipo tem a sua página: `/carros`, `/motos`, `/scooters`, `/picapes`, `/vans`, `/onibus`, `/caminhoes`, `/tratores`, `/quadriciclos`, `/maquinas`, `/motorhomes` e `/implementos`, com título, canônica e trilha próprias; os outros filtros ficam na URL (`/motos?marca=honda`, fora do Google). A página do tipo só entra no Google e no sitemap com veículo na vitrine; `/veiculos?tipo=moto` responde 308 para `/motos`. `/carros` deixa de ser o índice de marcas e cidades (DSC-FR-013); `/carros/{marca}` e `/carros/{cidade}` continuam.
- **TIP-FR-008** A vitrine sem filtro mostra todos os tipos. O título passa a "Veículos novos e usados à venda" e, com um tipo só, vira o do tipo ("Motos novas e usadas à venda").
- **TIP-FR-009** A busca por texto [1a] também acha pelo tipo ("moto", "caminhão", "trator") e pelos campos novos (ex.: "160 cc").
- ~~**TIP-FR-010**~~ Movido para a 014b (páginas de descoberta por tipo), no `/clarify` de 2026-11-24.
- **TIP-FR-011** O catálogo da loja [1a modo Lojista] mostra o filtro Tipo só quando a loja vende mais de um tipo.
- ~~**TIP-FR-012**~~ Movido para a 014b (alerta de busca por tipo), no `/clarify` de 2026-11-24.
- ~~**TIP-FR-013**~~ Movido para a 014b (tipo nas filas do admin), no `/clarify` de 2026-11-24.
- ~~**TIP-FR-014**~~ Movido para a 014b (landing e cadastro da loja com o tipo), no `/clarify` de 2026-11-24.

- **TIP-FR-015** Para publicar, além do que já é obrigatório hoje, cada tipo exige o seu campo principal:
  - cilindrada: moto, scooter, quadriciclo;
  - eixos: caminhão, ônibus, implemento;
  - horas de uso, no lugar da quilometragem: trator e máquinas pesadas;
  - lugares: van, motorhome.
- **TIP-FR-016** As regras de fotos mínimas e de aprovação prévia (002) valem iguais para todos os tipos.
- **TIP-FR-017** (pedido do dono do produto, 2026-11-24) O cadastro [2a] ganha a seção **Histórico do veículo**, para todos os tipos, com Sim/Não:
  - passagem por leilão;
  - recuperado de financiamento (veio de financeira);
  - kit GNV instalado (e se ainda está no veículo);
  - ex-táxi, ex-frota ou ex-locadora;
  - laudo cautelar aprovado;
  - chave reserva;
  - manual e nota fiscal.

  Tem também **Sinistro com indenização**: Nenhum, Pequena monta, Média monta ou Grande monta.
- **TIP-FR-018** (substituído pela spec 019, procedência e situação, em 2026-11-25) A página do veículo [1b] mostra o Histórico do veículo, com o que o lojista informou e "Não informado" no resto. A vitrine [1a] tem o filtro **Sem passagem por leilão** e **Sem sinistro**.

- **TIP-FR-020** (pedido do dono do produto, 2026-11-25) O topo da vitrine [1a]/[15a] abre com a apresentação da CajuGo em duas colunas no desktop (à esquerda, "Compre, venda e cuide do seu veículo num só lugar" e o texto do que dá para fazer na CajuGo; à direita, a ilustração; na página inicial, spec 017), e logo abaixo um quadro com duas abas, **Buscar** e **Vender**. A faixa de tipos rola sem barra de rolagem aparente (no desktop, setas nas pontas):
  - **Buscar** (aberta ao chegar): a busca por texto e, logo abaixo, a faixa de tipos (TIP-FR-007), com **uma ilustração por tipo, um veículo só em cada uma**;
  - **Vender**: "Venda seus veículos na CajuGo", um texto curto, a lista de vantagens do Catálogo (catálogo próprio, vitrine CajuGo, contato no WhatsApp, R$ 100/mês sem comissão sobre a venda) e o botão **Quero anunciar**, que leva para a página do lojista [`/lojistas`], com **Saiba mais** ao lado.
- **TIP-FR-019** (pedido do dono do produto, 2026-11-24) Em cada tipo, a lista de marcas começa pelas **mais procuradas no Brasil**, nesta ordem, e depois traz todas as outras (anexo "Marcas por tipo"). No ônibus, o cadastro pede a **marca do chassi** e a **marca da carroceria**.

## Requisitos não funcionais
- **TIP-NFR-001** As telas novas e as mudadas ([3b], [2a], filtros, [1b]) funcionam em 390 px e em 1280 px, com alvos de toque de pelo menos 44 px, e seguem o design (012).
- **TIP-NFR-002** Trocar o tipo no cadastro [2a] mostra os campos dele na hora, sem recarregar a página.
- **TIP-NFR-003** As páginas novas de descoberta seguem o `SEO.md` (§6): HTML do servidor, título, canônica, JSON-LD do tipo e fora do Google quando vazias.

## Requisitos de segurança e privacidade
- **TIP-SEC-001** A loja B não muda o que a loja A vende nem o tipo dos veículos da loja A.
- **TIP-SEC-002** Só o lojista muda o que a loja vende; o usuário da loja não.
- **TIP-SEC-003** O cadastro recusa um tipo que a loja não vende e um campo que não é do tipo, mesmo enviado por fora da tela.

## Critérios de aceite
### TIP-FR-001
- **Dado** a lista de tipos da CajuGo
- **Quando** o lojista abre Minha loja ou o cadastro de um veículo
- **Então** vê os 11 tipos, com o nome em português

### TIP-FR-002
- **Dado** a Loja A que já existia antes desta mudança
- **Quando** o lojista abre Minha loja
- **Então** vê "O que você vende" com Carro marcado
- **E** ao marcar Moto e salvar, a loja passa a vender Carro e Moto

### TIP-FR-003
- **Dado** a Loja A, que vende Carro e Moto
- **Quando** o lojista abre Novo veículo
- **Então** o primeiro campo é Tipo, com Carro e Moto
- **E** ao trocar de Carro para Moto no rascunho, a marca e o modelo são limpos

### TIP-FR-004
- **Dado** um rascunho do tipo Moto
- **Quando** o lojista vê a ficha técnica
- **Então** aparecem cilindrada e partida, e não aparecem portas nem carroceria
- **E** no tipo Trator aparece "Horas de uso" no lugar da quilometragem

### TIP-FR-005
- **Dado** um veículo do tipo Trator
- **Quando** o lojista escolhe a marca
- **Então** a lista é a da CajuGo, o modelo e a versão são escritos à mão e não aparece a referência FIPE
- **E** num veículo do tipo Moto, marca, modelo, versão e FIPE vêm da tabela de motos

### TIP-FR-006
- **Dado** uma moto de 160 cc e um trator com 2.400 horas, publicados
- **Quando** o visitante abre a página e o card de cada um
- **Então** a moto mostra "Cilindrada 160 cc" e o trator, "2.400 h" no lugar da quilometragem

### TIP-FR-007
- **Dado** a vitrine com carros, motos e um caminhão
- **Quando** o visitante marca o tipo Moto
- **Então** a lista mostra só motos e a árvore mostra só as marcas de moto, com a contagem
- **E** sem tipo, no lugar da barra de filtros aparece a faixa de tipos (cartão com ilustração e nome); tocar em Moto troca a faixa pela barra Filtros · Tipo: Moto · Marca · Cidade · Preço · Ano · Km · Cilindrada, sem Câmbio

### TIP-FR-008
- **Dado** a vitrine
- **Quando** o visitante abre sem filtro e depois filtra só Caminhão
- **Então** o título é "Veículos novos e usados à venda" e depois "Caminhões novos e usados à venda"

### TIP-FR-009
- **Dado** uma moto Honda CG 160 publicada
- **Quando** o visitante busca "moto 160"
- **Então** a moto aparece no resultado

### TIP-FR-010
- Ver 014b.
### TIP-FR-011
- **Dado** a Loja A, que vende só Moto, e a Loja B, que vende Carro e Caminhão
- **Quando** o visitante abre o catálogo de cada uma
- **Então** a Loja A não mostra o filtro Tipo, e a Loja B mostra

### TIP-FR-012
- Ver 014b.
### TIP-FR-013
- Ver 014b.
### TIP-FR-014
- Ver 014b.
### TIP-FR-015
- **Dado** um rascunho de moto sem a cilindrada
- **Quando** o lojista toca em Publicar
- **Então** vê o erro "Informe a cilindrada" e o veículo não é publicado
- **E** num trator, "Horas de uso" é exigida no lugar da quilometragem

### TIP-FR-016
- **Dado** a regra de 3 fotos mínimas e a aprovação prévia ligada
- **Quando** o lojista publica uma moto com 2 fotos e depois com 3
- **Então** com 2 fotos é recusado como num carro; com 3, vai para a aprovação como num carro

### TIP-FR-017
- **Dado** o cadastro de um carro
- **Quando** o lojista marca "Passagem por leilão: Sim" e "Sinistro: Média monta" e publica
- **Então** o veículo fica com esse histórico salvo

### TIP-FR-018
- **Dado** um carro com passagem por leilão e média monta, e outro sem histórico informado
- **Quando** o visitante abre as páginas e filtra "Sem passagem por leilão"
- **Então** o primeiro mostra "Passagem por leilão: Sim" e "Sinistro: média monta", o segundo "Não informado", e o filtro esconde o primeiro

### TIP-SEC-001
- **Dado** o lojista B logado
- **Quando** tenta mudar o que a loja A vende ou o tipo de um veículo da loja A
- **Então** recebe "não encontrado" e nada muda

### TIP-SEC-002
- **Dado** o usuário da loja A logado
- **Quando** tenta mudar o que a loja vende
- **Então** vê "Sem permissão" e nada muda

### TIP-SEC-003
- **Dado** a Loja A, que vende só Carro
- **Quando** alguém envia um veículo do tipo Trator, ou um carro com "Horas de uso", por fora da tela
- **Então** o cadastro recusa com o erro no campo e nada é salvo

### TIP-FR-020
- **Dado** a vitrine
- **Quando** o visitante toca na aba Vender
- **Então** vê a chamada para vender, as vantagens e **Quero anunciar**, que abre `/lojistas`; voltando para Buscar, aparecem a busca e a faixa de tipos

### TIP-FR-019
- **Dado** o cadastro de uma moto
- **Quando** o lojista abre a lista de marcas
- **Então** as primeiras são Honda, Yamaha, Shineray e Dafra, e as outras vêm depois
- **E** num ônibus, aparecem os campos marca do chassi (ex.: Mercedes-Benz) e marca da carroceria (ex.: Marcopolo)

## Anexo · Marcas por tipo (mais procuradas, nesta ordem)
- **Carro** (FIPE): Fiat, Volkswagen, Chevrolet, Toyota, Hyundai, Renault, Honda, Nissan, Jeep, Caoa Chery, Ford, Peugeot, Citroën, BMW, Mercedes-Benz, Audi, Volvo, Kia, BYD, GWM, Gurgel. _Já em uso no cadastro (012)._
- **Moto e scooter** (FIPE de motos): Honda, Yamaha, Shineray, Dafra, Haojue, Bajaj, BMW Motorrad, Kawasaki, Suzuki, Triumph, Ducati, Harley-Davidson, Royal Enfield, KTM, Zontes, Kymco, Hisun.
- **Ônibus · chassi** (FIPE de caminhões): Mercedes-Benz, Volkswagen Caminhões e Ônibus, Volvo, Scania, Iveco, Agrale.
- **Ônibus · carroceria** (lista da CajuGo): Marcopolo, Caio, Comil, Busscar, Mascarello, Neobus, Induscar.
- **Caminhão** (FIPE de caminhões): Mercedes-Benz, Volkswagen Caminhões e Ônibus, Volvo, Scania, Iveco, DAF, Ford Trucks, Agrale, Foton, Shacman.
- **Máquinas pesadas** (lista da CajuGo): Caterpillar, JCB, Case Construction, New Holland Construction, Komatsu, Volvo CE, John Deere, XCMG, LiuGong, SANY, Randon, Hyster, Toyota Material Handling, Still, Clark.
- **Trator** (lista da CajuGo): John Deere, New Holland Agriculture, Massey Ferguson, Valtra, Case IH, Fendt, Agrale, LS Tractor, Mahindra, Kubota, Yanmar, Landini, Solis.

## Anexo · Modelos sem FIPE (lista inicial da CajuGo)
Carro, moto, caminhão e chassi de ônibus têm todos os modelos pela FIPE.
- **Trator**
  - John Deere: 5075E, 5078E, 5090E, 6110J, 6125J, 6155J, 6175J, 7200J, 7230J, 8R 340.
  - New Holland Agriculture: TL75E, TL95E, T6.110, T6.130, T7.190, T7.245, T8.385, TT4030.
  - Massey Ferguson: 4275, 4283, 4292, 4707, 4709, 6713, 6715, 7415, 8737.
  - Valtra: A750, A850, A950, A114, BH180, BH194, BH224, T250.
  - Case IH: Farmall 80, Farmall 110A, Puma 185, Puma 230, Magnum 340.
  - Fendt: 724 Vario, 828 Vario, 942 Vario.
  - Agrale: 4100, 4230, 5075, 6150.
  - LS Tractor: U60, Plus 80, Plus 90, R65.
  - Mahindra: 4025, 6075, 7590.
  - Kubota: L4028, L4508, M7040, M9540.
  - Yanmar: 1155, 1175, 1145.
  - Landini: Rex 80, Rex 100, Landpower 125.
  - Solis: 26, 50, 75, 90.
- **Ônibus · carroceria**
  - Marcopolo: Paradiso G8 1050, Paradiso G8 1200, Paradiso G8 1350, Paradiso G8 1600 LD, Paradiso G8 1800 DD, Viaggio G8 900, Viaggio G8 1050, Torino, Senior, Volare V8, Volare W9, Volare Fly 10.
  - Caio: Apache Vip, Millennium, Foz Super, Giro 3600, Solar.
  - Comil: Campione, Invictus, Svelto, Versatile, Piá.
  - Busscar: Vissta Buss 340, Vissta Buss 360, Vissta Buss 400, El Buss 340, Urbanuss.
  - Mascarello: Roma 350, Roma 370, Gran Via, Gran Micro.
  - Neobus: New Road N10, New Road N12, Mega, Thunder.
  - Induscar: Apache, Millennium.
- **Máquinas pesadas**
  - Caterpillar: 416F2, 420F2, 924K, 320 GC, 140K.
  - JCB: 3CX, 4CX, 422ZX, JS200.
  - Case Construction: 580N, 580SN, 621G, CX220C, 845C.
  - New Holland Construction: B95B, B110B, W130, E215C.
  - Komatsu: WB146, PC200, WA200, GD555.
  - Volvo CE: BL60, L60H, EC220D.
  - Randon: RD406, RK406.
  - Hyster, Toyota Material Handling, Still, Clark: modelo escrito (empilhadeiras).
- **Quadriciclo, motorhome e implemento:** marca e modelo escritos no MVP (lista na fase 2).

## Pendências
Nenhuma. Resolvidas no `/clarify` de 2026-11-24 com as opções recomendadas (instrução do dono do produto de seguir sem parar):
- dividir: esta spec fica com tipos, cadastro, ficha, vitrine e filtro; **014b** com descoberta por tipo, alertas, admin, landing e cadastro da loja;
- tipos sem FIPE: marca de uma lista da CajuGo (no código), modelo e versão escritos; edição pelo admin na fase 2;
- picape e van: tabela de carros da FIPE, com o tipo escolhido pelo lojista;
- endereços: `/carros/...` continua; os outros tipos ganham os seus na 014b; `/v/...` não muda;
- campo principal obrigatório por tipo (TIP-FR-015);
- fotos mínimas e aprovação iguais para todos (TIP-FR-016).
