---
id: 008b
slug: seller-statement
title: Rede Caju · extrato do vendedor
status: implemented
owner: dono do produto
created: 2026-11-23
---

# 008b · Rede Caju · extrato do vendedor

## Contexto
A 009 registra cada venda confirmada pela loja, com o vendedor, o valor final e a comissão "A receber" ou "Paga". O vendedor ainda não vê nada disso: o Extrato [7d] mostra só um aviso, e o painel [7b] não tem "a receber" nem as vendas (PRD §5.7, fluxo da Rede Caju). Esta spec mostra ao vendedor as vendas e as comissões dele, permite marcar **Recebi** quando a loja pagou por fora e avisa o vendedor quando uma venda com comissão é confirmada.

Sucesso: o vendedor sabe quanto tem a receber e de quem, e a comissão passa a "Paga" quando ele confirma que recebeu.

## Atores
- **Vendedor** ativo: vê o extrato e o painel e marca **Recebi**.
- **Vendedor** bloqueado: continua vendo o extrato (SEL-FR-002).
- **Lojista**: confirma ou desfaz a venda (009) e vê a comissão como paga depois do **Recebi**.

## Fora de escopo
- Pagamento da comissão pela plataforma, contestação e o status "Em análise" da comissão (fase 2, PRD §11; filtro tirado do MVP no `/clarify` de 2026-11-23).
- Saldo e resgate do Caju Indica [9d, 9e] (spec **010**), mesmo para o vendedor que também indica.
- Perfil do vendedor com vendas e avaliações [13b] (spec **009b**).
- Avisos por e-mail ou WhatsApp automáticos (fase 2).

## Requisitos funcionais
- **EXT-FR-001** O Extrato [7d] lista as vendas confirmadas com o vendedor e não desfeitas, da mais recente para a mais antiga, cada uma com o veículo, a loja, a data da venda, o valor final, o valor da comissão e o status da comissão (A receber ou Paga).
- **EXT-FR-002** O Extrato [7d] tem os filtros Todas · A receber · Pagas, cada um com o número de vendas, e o filtro escolhido fica no endereço da página.
- **EXT-FR-003** Em uma venda "A receber", o vendedor toca em **Recebi**, confirma, e a comissão passa a **Paga** para ele e para a loja.
- **EXT-FR-004** **Recebi** só aparece em venda "A receber"; repetir em venda já paga não muda nada.
- **EXT-FR-005** O painel do vendedor [7b] mostra o total **a receber** (soma das comissões "A receber"), as **vendas do mês** (quantidade de vendas confirmadas no mês, em São Paulo) e as **últimas vendas**, com o link para o Extrato.
- **EXT-FR-006** Quando a loja confirma uma venda com o vendedor, ele vê no painel o aviso "Venda confirmada: {veículo} na {loja} · comissão R$ X".
- **EXT-FR-007** A venda desfeita pela loja some do Extrato, do total a receber, das vendas do mês e das últimas vendas.
- **EXT-FR-009** O vendedor desfaz o **Recebi** com **Desfazer** até 24 horas depois de marcar: a comissão volta a "A receber"; depois disso, o **Desfazer** some e só a CajuGo corrige.
- **EXT-FR-010** Quando o vendedor marca **Recebi**, o lojista e os usuários da loja veem o aviso "{vendedor} confirmou o recebimento da comissão do {veículo}."; quando desfaz, veem "{vendedor} desfez o recebimento da comissão do {veículo}."
- **EXT-FR-008** Sem nenhuma venda, o Extrato mostra que as vendas aparecem ali quando a loja confirmar, e o painel mostra a receber R$ 0 e vendas do mês 0.

## Requisitos não funcionais
- **EXT-NFR-001** [7d] e [7b] funcionam em 390 px e em 1280 px, com alvos de toque de pelo menos 44 px.
- **EXT-NFR-002** O Extrato mostra 20 vendas por vez, com **Carregar mais**.

## Requisitos de segurança e privacidade
- **EXT-SEC-001** O vendedor A não vê as vendas, as comissões nem os totais do vendedor B, e não marca **Recebi** numa venda de B.
- **EXT-SEC-002** Só o vendedor da venda marca **Recebi**; lojista, usuário da loja, suporte, admin e indicador não marcam pela tela do vendedor.
- **EXT-SEC-003** O Extrato não mostra dados do comprador (nome, celular, e-mail), só o que o vendedor precisa para conferir e cobrar a comissão.
- **EXT-SEC-004** Marcar e desfazer o **Recebi** ficam no registro de atividade, com o vendedor e a venda.

## Critérios de aceite
### EXT-FR-001
- **Dado** a vendedora Ana com duas vendas confirmadas, uma na Loja A (Fiat Argo, comissão R$ 1.160, A receber) e outra na Loja B (BMW X1, R$ 800, Paga)
- **Quando** ela abre o Extrato
- **Então** vê as duas, a mais recente primeiro, com veículo, loja, data, valor final, comissão e status

### EXT-FR-002
- **Dado** o Extrato de Ana com uma venda A receber e uma Paga
- **Quando** ela escolhe **A receber**
- **Então** vê só a do Fiat Argo, o filtro mostra "A receber 1" e o endereço guarda o filtro

### EXT-FR-003
- **Dado** a venda do Fiat Argo "A receber"
- **Quando** Ana toca em **Recebi** e confirma
- **Então** a comissão fica **Paga** no Extrato dela
- **E** a Loja A vê a comissão dessa venda como paga

### EXT-FR-004
- **Dado** a venda do BMW X1 já "Paga"
- **Quando** Ana abre o Extrato
- **Então** essa venda não tem **Recebi**
- **E** um pedido repetido de **Recebi** para ela não muda nada

### EXT-FR-005
- **Dado** Ana com R$ 1.160 a receber e duas vendas confirmadas neste mês
- **Quando** ela abre o painel [7b]
- **Então** vê "A receber R$ 1.160,00", "Vendas do mês 2" e as últimas vendas com o link para o Extrato

### EXT-FR-006
- **Dado** a Loja A, parceira de Ana
- **Quando** a loja confirma a venda do Fiat Argo com Ana e comissão de R$ 1.160
- **Então** Ana vê o aviso "Venda confirmada: Fiat Argo na Loja A · comissão R$ 1.160,00"

### EXT-FR-007
- **Dado** a venda do Fiat Argo "A receber" no painel de Ana
- **Quando** a Loja A desfaz a venda
- **Então** a venda some do Extrato e das últimas vendas
- **E** o total a receber e as vendas do mês de Ana deixam de contá-la

### EXT-FR-009
- **Dado** Ana que marcou **Recebi** no Fiat Argo há 2 horas
- **Quando** ela toca em **Desfazer**
- **Então** a comissão volta a "A receber" para ela e para a Loja A
- **E** passadas 24 horas da marcação, o **Desfazer** não aparece e um pedido de desfazer é recusado

### EXT-FR-010
- **Dado** a Loja A com a venda do Fiat Argo de Ana "A receber"
- **Quando** Ana marca **Recebi**
- **Então** o lojista e o usuário da Loja A veem "Ana confirmou o recebimento da comissão do Fiat Argo."

### EXT-FR-008
- **Dado** um vendedor aprovado sem vendas
- **Quando** ele abre o Extrato e o painel
- **Então** o Extrato diz que as vendas aparecem ali quando a loja confirmar
- **E** o painel mostra a receber R$ 0,00 e vendas do mês 0

### EXT-SEC-001
- **Dado** as vendedoras Ana e Bia, cada uma com vendas
- **Quando** Bia abre o Extrato ou tenta marcar **Recebi** numa venda de Ana
- **Então** Bia vê só as dela e recebe "não encontrado" para a de Ana, sem mudar nada

### EXT-SEC-002
- **Dado** o lojista da Loja A, o suporte e o admin logados
- **Quando** tentam marcar **Recebi** numa venda de Ana
- **Então** veem "Sem permissão" ou "não encontrado" e a comissão continua A receber

### EXT-SEC-003
- **Dado** uma venda de Ana que veio de um lead com nome e celular do comprador
- **Quando** Ana abre o Extrato
- **Então** não vê o nome nem o celular do comprador

### EXT-SEC-004
- **Dado** Ana que marcou **Recebi** na venda do Fiat Argo
- **Quando** se consulta o registro de atividade
- **Então** há o registro com Ana e a venda
- **E** desfazer gera outro registro

## Pendências
Nenhuma. Resolvidas no `/clarify` de 2026-11-23: filtro "Em análise" fora do MVP; **Desfazer** o Recebi por 24 horas; venda desfeita some do Extrato; aviso à loja no Recebi (e no desfazer); valor final visível para o vendedor.
