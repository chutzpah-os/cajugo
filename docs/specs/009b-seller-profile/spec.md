---
id: 009b
slug: seller-profile
title: Rede Caju · convite, perfil, avaliação e denúncia de vendedor
status: draft
owner: dono do produto
created: 2026-11-24
---

# 009b · Rede Caju · convite, perfil, avaliação e denúncia de vendedor

## Contexto
Na 009, a parceria só nasce do pedido do vendedor [7c], e o lojista só aprova ou recusa [7f]. O PRD prevê também o caminho inverso: o lojista encontra vendedores aprovados e os convida [13a], vê o perfil de cada um com vendas e avaliações [13b], avalia quem vendeu para ele e denuncia quem agiu mal [13d], com análise do admin em até 2 dias úteis (PRD §5.7, fluxo §4.4). Esta spec fecha a Rede Caju do lado do lojista.

Sucesso: o lojista convida um vendedor bem avaliado da cidade dele, o vendedor aceita, e uma denúncia chega ao admin, que decide e avisa o lojista.

## Atores
- **Lojista**: encontra vendedores [13a], convida, vê o perfil [13b], avalia e denuncia [13d].
- **Vendedor** ativo: recebe o convite e aceita ou recusa.
- **Admin**: analisa as denúncias de vendedor em [7h] e pode bloquear o vendedor (008); o **Suporte** só consulta.

## Fora de escopo
- Vendedor avaliar a loja.
- Mensagens entre lojista e vendedor dentro da plataforma (o contato é pelo celular do parceiro, 009).
- Contestação da avaliação pelo vendedor (fase 2).

## Requisitos funcionais
- **VND-FR-001** O lojista vê em [13a] os vendedores ativos que ainda não são parceiros da loja, com nome, cidade, vendas confirmadas na CajuGo e nota média, e os filtros **Perto** (mesma cidade da loja), **Mais vendas** e **Melhor avaliados**.
- **VND-FR-002** Em [13a], **Convidar** cria um convite para o vendedor; o vendedor que já tem pedido ou convite aberto com a loja mostra "Pendente" em vez do botão; a loja que não aceita vendedores não convida (o botão leva a [7e]).
- **VND-FR-003** O vendedor vê os convites recebidos no painel [7b], com o nome da loja e a comissão dela, e responde **Aceitar** (a parceria fica Ativa) ou **Recusar**; recusar permite à loja convidar de novo depois.
- **VND-FR-004** Em [7f], os convites enviados aparecem como "Convite enviado" até o vendedor responder, e o lojista pode cancelar o convite.
- **VND-FR-005** O perfil do vendedor [13b] mostra o selo **Verificado pela CajuGo**, a cidade, quando entrou, as vendas confirmadas na CajuGo, o número de lojas parceiras, a nota média com o número de avaliações, as vendas dele para esta loja com o status da comissão e as avaliações (nota, texto, loja e data).
- **VND-FR-006** Em [13b], o lojista com pelo menos uma venda confirmada com o vendedor dá uma **avaliação** de 1 a 5 estrelas com um texto opcional; cada loja tem uma avaliação por vendedor, que ela pode editar.
- **VND-FR-007** Em [13b], o lojista **Encerra a parceria** (como em [7f]) e abre **Denunciar** [13d].
- **VND-FR-008** Em [13d], o lojista escolhe o motivo (cobrou por fora, informação falsa, comportamento inadequado, uso indevido do nome da loja, outro), escreve a descrição e envia; a denúncia fica **Em análise** e ele vê "Recebemos sua denúncia. A CajuGo analisa em até 2 dias úteis."
- **VND-FR-009** O admin vê em [7h] as denúncias de vendedor em análise, da mais antiga, com o vendedor, a loja, o motivo, a descrição e há quanto tempo esperam, e decide **Procedente** (com a opção de bloquear o vendedor com o motivo) ou **Improcedente**, com uma nota.
- **VND-FR-010** O lojista que denunciou vê no painel o aviso quando a denúncia é analisada ("Sua denúncia sobre {vendedor} foi analisada: procedente" ou "improcedente").

## Requisitos não funcionais
- **VND-NFR-001** [13a], [13b] e [13d] funcionam em 390 px e em 1280 px, com alvos de toque de pelo menos 44 px.
- **VND-NFR-002** [13a] mostra 20 vendedores por vez, com **Carregar mais**.

## Requisitos de segurança e privacidade
- **VND-SEC-001** A loja B não vê as avaliações nem as denúncias da loja A como sendo dela, não edita a avaliação de A e não vê as vendas de A com o vendedor.
- **VND-SEC-002** [13a] e [13b] não mostram CPF, chave Pix, celular nem e-mail do vendedor que não é parceiro; o celular e o Pix continuam só para o parceiro (009).
- **VND-SEC-003** A denúncia não é mostrada ao vendedor denunciado nem a outras lojas; só o admin e o suporte a veem, e só o admin decide.
- **VND-SEC-004** Só o dono da loja convida, avalia e denuncia; o usuário da loja não; convite, avaliação, denúncia e decisão ficam no registro de atividade.
- **VND-SEC-005** A avaliação e a denúncia têm limite de envio por loja (anti-spam) e texto com tamanho máximo.

## Critérios de aceite
### VND-FR-001
- **Dado** a Loja A em Aracaju e os vendedores Ana (Aracaju, 5 vendas, nota 4,8), Bia (Recife, 12 vendas) e Caio (parceiro da loja)
- **Quando** o lojista abre [13a] e escolhe **Perto**
- **Então** vê só Ana; em **Mais vendas**, vê Bia antes de Ana; Caio não aparece

### VND-FR-002
- **Dado** a Loja A aceitando vendedores
- **Quando** o lojista toca em **Convidar** na Ana
- **Então** a Ana passa a mostrar "Pendente"
- **E** com a loja sem aceitar vendedores, **Convidar** leva a [7e]

### VND-FR-003
- **Dado** o convite da Loja A para a Ana
- **Quando** a Ana abre o painel e toca em **Aceitar**
- **Então** a parceria fica Ativa e a Loja A aparece como Parceiro
- **E** se ela recusar, a loja pode convidar de novo

### VND-FR-004
- **Dado** o convite enviado à Ana
- **Quando** o lojista abre [7f]
- **Então** vê "Convite enviado" com **Cancelar convite**

### VND-FR-005
- **Dado** a Ana com 5 vendas na CajuGo, 2 lojas parceiras, nota 4,8 em 4 avaliações e 1 venda para a Loja A "A receber"
- **Quando** o lojista da Loja A abre o perfil dela
- **Então** vê Verificado, a cidade, as estatísticas, a venda para a loja com "A receber" e as avaliações

### VND-FR-006
- **Dado** a Loja A com uma venda confirmada da Ana
- **Quando** o lojista avalia com 5 estrelas e "Ótima vendedora"
- **Então** a avaliação aparece no perfil e entra na nota média
- **E** avaliar de novo troca a avaliação anterior
- **E** sem venda confirmada com ela, **Avaliar** não aparece

### VND-FR-007
- **Dado** a Ana parceira da Loja A
- **Quando** o lojista toca em **Encerrar parceria** no perfil e confirma
- **Então** a parceria fica Encerrada, como em [7f]

### VND-FR-008
- **Dado** o lojista no perfil da Ana
- **Quando** denuncia com "Cobrou por fora" e uma descrição
- **Então** a denúncia fica Em análise e ele vê "Recebemos sua denúncia. A CajuGo analisa em até 2 dias úteis."

### VND-FR-009
- **Dado** a denúncia da Loja A sobre a Ana há 1 dia
- **Quando** o admin a marca **Procedente** e escolhe bloquear com o motivo "Cobrança por fora"
- **Então** a denúncia sai da fila e a Ana fica Bloqueada (008)

### VND-FR-010
- **Dado** a denúncia da Loja A analisada como improcedente
- **Quando** o lojista abre o painel
- **Então** vê "Sua denúncia sobre Ana foi analisada: improcedente."

### VND-SEC-001
- **Dado** a avaliação da Loja A sobre a Ana
- **Quando** o lojista da Loja B abre o perfil da Ana ou tenta editar aquela avaliação
- **Então** vê a avaliação como de outra loja, sem poder editar, e não vê as vendas da Loja A

### VND-SEC-002
- **Dado** a Ana, não parceira da Loja B
- **Quando** o lojista da Loja B abre [13a] e o perfil dela
- **Então** não vê CPF, chave Pix, celular nem e-mail dela

### VND-SEC-003
- **Dado** a denúncia da Loja A sobre a Ana
- **Quando** a Ana, a Loja B ou o suporte (para decidir) tentam vê-la ou decidi-la
- **Então** a Ana e a Loja B não a veem, e o suporte vê sem poder decidir

### VND-SEC-004
- **Dado** o usuário da Loja A
- **Quando** tenta convidar, avaliar ou denunciar
- **Então** vê "Sem permissão" e nada muda

### VND-SEC-005
- **Dado** a Loja A que já enviou várias denúncias no mesmo dia
- **Quando** tenta enviar mais uma além do limite
- **Então** vê "Muitas tentativas. Aguarde e tente de novo."

## Pendências
- [PENDENTE] **Aceite do convite:** o convite precisa do aceite do vendedor (VND-FR-003) ou a parceria já nasce Ativa?
- [PENDENTE] **Quem pode avaliar:** só com venda confirmada com o vendedor (VND-FR-006), ou qualquer loja parceira?
- [PENDENTE] **Avaliações visíveis para quem:** o perfil e a nota aparecem para todas as lojas, inclusive as não parceiras, e para o próprio vendedor?
- [PENDENTE] **Denúncia e bloqueio automático:** várias denúncias procedentes bloqueiam o vendedor sozinhas ou a decisão é sempre do admin?
- [PENDENTE] **Limites anti-spam (VND-SEC-005):** quantas denúncias e avaliações por loja por dia?
