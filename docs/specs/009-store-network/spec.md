---
id: 009
slug: store-network
title: Rede Caju · lojista e venda
status: in-progress
owner: dono do produto
created: 2026-11-17
---

# 009 · Rede Caju · lojista e venda

## Contexto
A 008 deixou o vendedor pronto: cadastro, curadoria, vitrine com o link e o "Pedir parceria". Falta o lado da loja (PRD §5.7):
- decidir se aceita vendedores e quanto paga de comissão [7e];
- aprovar ou recusar os pedidos de parceria e encerrar parcerias [7f];
- ao vender, confirmar quem vendeu e o valor final [7g].

A **venda** confirmada registra a comissão do vendedor e a **taxa CajuGo** para a próxima fatura.

Sucesso: uma loja aprova um vendedor e confirma uma venda feita pelo link dele. A comissão fica "A receber" e a taxa fica registrada para a fatura.

## Atores
- **Lojista** (dono): comissão, aceitar vendedores, parcerias e confirmar venda.
- **Usuário da loja**: confirma venda e quem vendeu (PRD §2.1), sem mexer em comissão nem parcerias.
- **Vendedor** ativo: vê o resultado (parceria aprovada, recusada ou encerrada; "Você ganha R$ X").
- **Admin** e **suporte**: só consultam (o painel da loja [6g] é da spec 012).

## Fora de escopo
- Extrato do vendedor [7d] e **Recebi** (spec **008b**, que lê as vendas registradas aqui).
- Lançar a taxa na fatura mensal [10c] e cobrar (spec **011**). Aqui a taxa só fica registrada para a próxima fatura.
- Leads abertos virarem "Perdido" ao vender, com a escolha do comprador (PRD [6f]): fica para a revisão do fluxo de venda, que vale também para o "Vendido" simples.
- Pagamento da comissão pela plataforma (PRD §11, fase 2): o lojista paga o vendedor por fora.
- Vendedores disponíveis e **Convidar** [13a], perfil do vendedor e **Avaliar** [13b], **Denunciar vendedor** [13d] e a fila de denúncias de vendedor em [7h] (spec **009b**, dividida no `/clarify` de 2026-11-17).
- Comissão "Em análise" (PRD §5.7): no MVP a comissão nasce "A receber" ou "Paga"; a análise de contestação é da fase 2.

## Requisitos funcionais
- **RCL-FR-001** Em [7e], o lojista liga ou desliga **Aceitar vendedores independentes**; com ele desligado, os vendedores veem "Pedir parceria" desabilitado com "Esta loja não aceita vendedores" e não conseguem pedir, e as parcerias ativas ficam suspensas (sem "Você ganha" e sem marcar contatos), voltando como estavam ao religar.
- **RCL-FR-002** Em [7e], o lojista define a comissão padrão da loja (% do preço, até 10%, ou valor fixo, até R$ 10.000) e vê a prévia do cálculo num exemplo: comissão do vendedor e taxa CajuGo (das regras), com o informativo da taxa.
- **RCL-FR-003** Em [7e], o lojista ajusta a comissão de um veículo (% ou fixo, nos mesmos limites), que vale no lugar da padrão para aquele veículo, em "Você ganha R$ X" e na venda.
- **RCL-FR-004** A tela Vendedores [7f] mostra os pedidos de parceria pendentes, do mais antigo, com o nome, a cidade e a data do pedido, e **Aprovar** e **Recusar** em cada um.
- **RCL-FR-005** **Aprovar** torna o vendedor parceiro da loja: ele passa a ver "Parceiro" e "Você ganha R$ X" nos veículos da loja, e os contatos pelo link dele passam a ser marcados com ele; **Recusar** fecha o pedido e o vendedor pode pedir de novo depois.
- **RCL-FR-006** [7f] lista os parceiros ativos com nome, cidade, chave Pix (para pagar a comissão) e vendas confirmadas com a loja; **Encerrar parceria** (com confirmação) tira a parceria e os novos contatos pelo link dele deixam de ser marcados.
- **RCL-FR-007** Pedidos de vendedores bloqueados não aparecem em [7f], e o parceiro bloqueado aparece como "Bloqueado pela CajuGo", sem link que gere contato marcado.
- **RCL-FR-008** Com a loja aceitando vendedores, **Marcar como vendido** em [1c] e [6e] abre **Confirmar venda** [7g] no lugar do diálogo simples de [6f].
- **RCL-FR-009** [7g] pede o valor final (obrigatório) e **quem vendeu**: o vendedor sugerido pelo link, outro parceiro ativo da loja ou venda da loja.
- **RCL-FR-010** [7g] mostra, para a escolha feita, a comissão do vendedor (pela regra do veículo ou da loja, sobre o valor final) e a taxa CajuGo (% das regras sobre o valor final), e o toggle **Já paguei a comissão**.
- **RCL-FR-011** Ao confirmar com vendedor, a venda fica registrada com o valor final, o vendedor, a comissão ("A receber", ou "Paga" com o toggle ligado) e a taxa CajuGo para a próxima fatura; o veículo sai de todos os lugares, como no vendido.
- **RCL-FR-012** Ao confirmar como venda da loja, a venda fica registrada com o valor final, sem comissão nem taxa CajuGo.
- **RCL-FR-013** O vendedor sugerido em [7g] é o do lead mais recente daquele veículo marcado com um vendedor parceiro; sem lead assim, a sugestão é "venda da loja".
- **RCL-FR-015** **Desfazer venda** (até 7 dias) de uma venda com vendedor cancela a venda, a comissão e a taxa CajuGo; com a comissão já "Paga", a venda não é desfeita e a tela mostra "A comissão já foi paga. Para desfazer, fale com a CajuGo."
- **RCL-FR-014** O lojista chega a [7e] e [7f] pelo bloco **Rede Caju** da Conta [3c] (Comissão e Vendedores, com o número de pedidos pendentes); o resto da Conta segue na spec 011.

## Requisitos não funcionais
- **RCL-NFR-001** [7e], [7f] e [7g] funcionam em 390 px e em 1280 px ([15b]), com alvos de toque de pelo menos 44 px.
- **RCL-NFR-002** O veículo confirmado como vendido sai da vitrine, do catálogo e dos links de vendedor em até 60 segundos.

## Requisitos de segurança e privacidade
- **RCL-SEC-001** A loja B não vê nem altera a comissão, os pedidos, as parcerias ou as vendas da loja A, e não confirma venda de veículo da loja A.
- **RCL-SEC-002** Só o lojista muda a comissão, "Aceitar vendedores" e as parcerias; o usuário da loja só confirma venda; vendedor, indicador, admin e suporte não fazem nada disso.
- **RCL-SEC-003** Comissão, taxa CajuGo e status da venda são calculados no servidor; o valor final é o único número que vem da tela, e "outro parceiro" só aceita parceiro ativo da própria loja.
- **RCL-SEC-004** A chave Pix e o celular do vendedor aparecem só para as lojas de que ele é parceiro ativo; o CPF nunca aparece para a loja.
- **RCL-SEC-005** Aprovar, recusar e encerrar parceria, mudar a comissão e confirmar venda ficam no registro de atividade com quem fez, sem CPF nem chave Pix.

## Critérios de aceite
### RCL-FR-001
- **Dado** a loja A com "Aceitar vendedores" desligado
- **Quando** a vendedora Ana abre um veículo da loja A em [7c]
- **Então** vê "Pedir parceria" desabilitado com "Esta loja não aceita vendedores"
- **E** ligando de novo, a Ana consegue pedir

### RCL-FR-001 (parcerias ativas)
- **Dado** a Ana parceira da loja A
- **Quando** o lojista desliga "Aceitar vendedores"
- **Então** a Ana não vê "Você ganha" nos carros da loja A e um contato pelo link dela não fica marcado
- **E** ao religar, a Ana volta a ser parceira sem pedir de novo

### RCL-FR-002
- **Dado** o lojista A em [7e]
- **Quando** escolhe "% do preço" e 2%
- **Então** a prévia de um carro de R$ 60.000 mostra comissão de R$ 1.200 e taxa CajuGo de R$ 600 (1%)
- **E** 12% ou R$ 12.000 fixo são recusados com "Use até 10%" e "Use até R$ 10.000"

### RCL-FR-003
- **Dado** a comissão padrão de 2% da loja A e o Argo de R$ 60.000 com ajuste de R$ 1.500 fixo
- **Quando** a parceira Ana abre [7c]
- **Então** o Argo mostra "Você ganha R$ 1.500" e os outros carros da loja A seguem com 2%

### RCL-FR-004
- **Dado** os pedidos da Ana (ontem) e do Beto (hoje) para a loja A
- **Quando** o lojista A abre [7f]
- **Então** vê a Ana primeiro e depois o Beto, cada um com **Aprovar** e **Recusar**

### RCL-FR-005
- **Dado** o pedido pendente da Ana para a loja A
- **Quando** o lojista aprova
- **Então** a Ana vê a loja A como "Parceiro" e "Você ganha" nos carros dela
- **E** se o lojista recusar, a Ana vê o "Pedir parceria" de novo

### RCL-FR-006
- **Dado** a Ana parceira da loja A
- **Quando** o lojista encerra a parceria e confirma
- **Então** a Ana sai dos parceiros da loja A
- **E** um contato depois pelo link da Ana não fica marcado com ela

### RCL-FR-007
- **Dado** o Beto bloqueado pela CajuGo, com pedido pendente na loja A, e a Ana parceira e depois bloqueada
- **Quando** o lojista A abre [7f]
- **Então** não vê o pedido do Beto e vê a Ana com "Bloqueado pela CajuGo"

### RCL-FR-008
- **Dado** a loja A aceitando vendedores
- **Quando** o lojista toca em **Marcar como vendido** no Argo
- **Então** abre **Confirmar venda** [7g]
- **E** com a loja sem aceitar vendedores, abre o diálogo simples de [6f]

### RCL-FR-009
- **Dado** [7g] aberto para o Argo
- **Quando** o lojista confirma sem valor final
- **Então** vê "Informe o valor final" e a venda não é registrada

### RCL-FR-010
- **Dado** o Argo com comissão de 2% e taxa CajuGo de 1%
- **Quando** o lojista informa R$ 58.000 e escolhe a Ana
- **Então** [7g] mostra comissão de R$ 1.160 e taxa CajuGo de R$ 580

### RCL-FR-011
- **Dado** o lojista que confirma o Argo por R$ 58.000 com a Ana, sem "Já paguei"
- **Quando** confirma
- **Então** a venda fica com comissão de R$ 1.160 "A receber" e taxa de R$ 580 para a próxima fatura
- **E** o Argo sai da vitrine, do catálogo e dos links
- **E** com "Já paguei" ligado, a comissão fica "Paga"

### RCL-FR-012
- **Dado** o Argo vendido pela própria loja
- **Quando** o lojista confirma "venda da loja" por R$ 58.000
- **Então** a venda fica registrada sem comissão e sem taxa CajuGo

### RCL-FR-013
- **Dado** o Argo com um lead pelo link da Ana (parceira) ontem e um lead pela vitrine hoje
- **Quando** o lojista abre [7g]
- **Então** a sugestão é a Ana
- **E** sem lead marcado com vendedor, a sugestão é "venda da loja"

### RCL-FR-015
- **Dado** o Argo vendido com a Ana, comissão "A receber", há 2 dias
- **Quando** o lojista desfaz a venda
- **Então** o Argo volta a publicado e a venda, a comissão e a taxa são canceladas
- **E** com a comissão "Paga", a venda não é desfeita e aparece "A comissão já foi paga. Para desfazer, fale com a CajuGo."

### RCL-FR-014
- **Dado** o lojista A no painel
- **Quando** abre a Conta com 2 pedidos pendentes
- **Então** vê o bloco **Rede Caju** com Comissão e Vendedores (2), que levam a [7e] e [7f]

### RCL-SEC-001
- **Dado** o lojista B logado
- **Quando** tenta mudar a comissão, aprovar um pedido, encerrar uma parceria ou confirmar a venda de um veículo da loja A
- **Então** recebe "não encontrado" e nada muda na loja A

### RCL-SEC-002
- **Dado** um usuário da loja A
- **Quando** abre [7e] ou [7f], ou tenta aprovar um pedido
- **Então** vê "Sem permissão"
- **E** consegue confirmar a venda do Argo em [7g]

### RCL-SEC-003
- **Dado** o lojista A em [7g]
- **Quando** envia uma comissão, uma taxa ou um status junto, ou escolhe como "outro parceiro" um vendedor sem parceria com a loja A
- **Então** os valores enviados são ignorados ou o envio é recusado, e a venda usa só o cálculo do servidor

### RCL-SEC-004
- **Dado** a Ana parceira da loja A e sem parceria com a loja B
- **Quando** os lojistas A e B abrem [7f]
- **Então** só o lojista A vê a chave Pix e o celular da Ana, e nenhum dos dois vê o CPF

### RCL-SEC-005
- **Dado** o lojista que aprova a Ana e confirma a venda do Argo com ela
- **Quando** se consulta o registro de atividade
- **Então** há registros com o lojista, a parceria aprovada e a venda (valor final, comissão e taxa), sem CPF nem chave Pix

## Pendências
Nenhuma. Resolvidas no `/clarify` de 2026-11-17: divisão com a 009b (disponíveis, perfil, avaliação e denúncia de vendedor), comissão só "A receber" e "Paga", desfazer venda cancela tudo se a comissão não foi paga, desligar "Aceitar vendedores" suspende as parcerias, bloco Rede Caju na Conta, leads ao vender ficam para depois, limites de 10% e R$ 10.000.
