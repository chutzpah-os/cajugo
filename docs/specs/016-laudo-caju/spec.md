---
id: 016
slug: laudo-caju
title: LaudoCaju · consulta veicular por Pix
status: in-progress
owner: dono do produto
created: 2026-11-25
---

# 016 · LaudoCaju · consulta veicular por Pix

## Contexto
O **LaudoCaju** é um produto da CajuGo: a **consulta veicular** de um veículo (estrutura, indício de sinistro, funilaria, interior, débitos e restrições) por **R$ 70**. Quem quer comprar um veículo pede a consulta, paga por Pix, e a equipe da CajuGo confere o pagamento, pesquisa e manda o laudo à mão, pelo WhatsApp ou e-mail. Bem simples: sem integração com vistoriadora nem com banco.

A página do veículo [1b] mostra o LaudoCaju como o "Vistoriado" da Webmotors (capturas de 2026-11-25): uma faixa escura acima do título com **Mais detalhes**, que desce até o bloco do LaudoCaju, com os itens e **Obter laudo**. O produto tem a sua página de vendas, **/laudocaju**, no formato de `/lojistas`.

Sucesso: o comprador pede a consulta em menos de 1 minuto, e o admin vê na hora quem pagou e para quem falta mandar.

## Atores
- **Visitante** (comprador, sem conta): pede a consulta e paga.
- **Admin**: confere o Pix, marca **Recebi** e, depois de mandar o laudo, **Enviei**.
- **Suporte**: vê os pedidos, sem marcar.

## Fora de escopo
- A consulta em si: a equipe pesquisa fora da CajuGo e manda o resultado.
- Pagamento automático (gateway) e comprovante anexado: o admin confere no banco.
- Selo no card da vitrine.

## Requisitos funcionais
- **LAU-FR-001** A página do veículo [1b] mostra, acima do título, a faixa escura com o selo **LaudoCaju** e **Mais detalhes**, que desce até o bloco do LaudoCaju.
- **LAU-FR-002** O bloco do LaudoCaju mostra:
  - "Confiança e tranquilidade na compra do seu seminovo aqui na CajuGo";
  - **Diversos itens inspecionados**, com a marca de conferido: Estrutura, Indício de sinistro, Funilaria, Interior, Débitos e Restrições;
  - "Você mais seguro na hora de fechar o negócio!";
  - **Obter laudo · R$ 70**;
  - "Ainda com dúvidas sobre o LaudoCaju? **Saiba mais**", que leva a `/laudocaju`;
  - o aviso: "A CajuGo não possui qualquer ingerência ou responsabilidade em relação ao laudo cautelar, atuando meramente como um classificado de anúncios de veículos com atribuição do selo LaudoCaju, sendo as vistoriadoras as únicas responsáveis pelo laudo cautelar emitido, assim como os itens vistoriados."
- **LAU-FR-003** **Obter laudo** abre o pedido, em `/laudocaju/pedir` (com o veículo, quando vem da página dele):
  - **Seus dados**: nome, WhatsApp e e-mail;
  - **Veículo**: placa (obrigatória), marca e modelo, ano; vindo da página do veículo, marca, modelo e ano já vêm preenchidos e a placa é pedida;
  - o aceite: "Concordo em receber o laudo pelo WhatsApp ou e-mail informados".
- **LAU-FR-004** Enviado o pedido, a tela mostra o **Pix** de R$ 70: QR code, chave, copia e cola com **Copiar** e o favorecido, com o código do pedido (ex.: "LC-4F7K") para pôr na descrição do Pix, e o texto "Assim que confirmarmos o Pix, pesquisamos e mandamos o laudo pelo WhatsApp ou e-mail, em até 1 dia útil".
- **LAU-FR-005** O admin vê os pedidos no menu **LaudoCaju** (com o contador dos que aguardam), do mais novo ao mais antigo, com os filtros Aguardando Pix, Pagos (a enviar) e Enviados:
  - código, quando, nome, WhatsApp (com `wa.me`), e-mail, placa e veículo;
  - **Recebi** (o Pix caiu) e, depois, **Enviei** (laudo mandado);
  - o suporte vê sem os botões.
- **LAU-FR-006** A página de vendas **/laudocaju**, no formato de `/lojistas`, abre com o título **"Conheça o passado do veículo antes de fechar negócio"** e o subtítulo "Débitos, multas, restrições e sinais de batida que o anúncio não mostra" (texto próprio da CajuGo, sem copiar concorrente). Depois: o que é, os 6 itens inspecionados, como funciona em 3 passos (peça, pague o Pix, receba), o preço R$ 70, perguntas frequentes e **Obter laudo**. Pública, com SEO (SEO.md).
- **LAU-FR-007** O preço da consulta (R$ 70) é uma regra da plataforma, editável pelo admin na Conta [4c], no grupo LaudoCaju (vale para os pedidos novos).

## Requisitos não funcionais
- **LAU-NFR-001** Pedido, Pix, página de vendas e a fila do admin funcionam em 390 e 1280 px, com alvos ≥ 44 px e sem rolagem horizontal.

## Requisitos de segurança e privacidade
- **LAU-SEC-001** O formulário público tem campo isca e limite por rede (SECURITY.md §6); a placa e os contatos só aparecem para a equipe.
- **LAU-SEC-002** Os dados do pedido (nome, contatos e placa) são apagados 2 anos depois do pedido, como os leads; a finalidade é dita no formulário.
- **LAU-SEC-003** Só admin marca Recebi e Enviei; cada marca vai para o registro de atividade, sem dado pessoal.

## Critérios de aceite
### LAU-FR-001
- **Dado** a página de um veículo
- **Quando** o comprador toca em Mais detalhes, na faixa LaudoCaju
- **Então** a página desce até o bloco do LaudoCaju

### LAU-FR-002
- **Dado** o bloco do LaudoCaju
- **Quando** o comprador o lê
- **Então** vê os 6 itens, Obter laudo · R$ 70, Saiba mais e o aviso de responsabilidade

### LAU-FR-003
- **Dado** o comprador na página de um Corolla 2025
- **Quando** toca em Obter laudo
- **Então** o pedido já vem com Toyota Corolla 2025 e pede nome, WhatsApp, e-mail e a placa; sem placa, mostra o erro no campo

### LAU-FR-004
- **Dado** o pedido enviado
- **Quando** a tela do Pix aparece
- **Então** mostra R$ 70, o QR, a chave, o copia e cola com Copiar e o código do pedido

### LAU-FR-005
- **Dado** um pedido aguardando Pix
- **Quando** o admin marca Recebi e depois Enviei
- **Então** o pedido passa para Pagos e depois para Enviados; o suporte vê o pedido sem os botões

### LAU-FR-006
- **Dado** a página /laudocaju
- **Quando** o visitante a abre
- **Então** vê o título "Conheça o passado do veículo antes de fechar negócio", o que é, os itens, os 3 passos, R$ 70, as perguntas e Obter laudo

### LAU-FR-007
- **Dado** o admin muda o preço para R$ 80
- **Quando** alguém faz um pedido novo
- **Então** o Pix é de R$ 80; os pedidos antigos continuam com o valor da época

### LAU-SEC-001
- **Dado** o formulário de pedido
- **Quando** um robô preenche o campo isca, ou a mesma rede passa do limite
- **Então** o pedido não é criado

### LAU-SEC-002
- **Dado** um pedido de 2 anos e 1 dia atrás
- **Quando** o job diário roda
- **Então** nome, contatos e placa do pedido são apagados

### LAU-SEC-003
- **Dado** o suporte na fila do LaudoCaju
- **Quando** tenta marcar Recebi
- **Então** é recusado (403), e as marcas do admin ficam no registro sem dado pessoal

## Pendências
Nenhuma: decisões do dono do produto em 2026-11-25 ("bem simples": contato, veículo e Pix; o admin confere, pesquisa e manda à mão; R$ 70; página de vendas no formato de /lojistas). Recomendadas por mim e adotadas: placa obrigatória; código do pedido na descrição do Pix; dados apagados em 2 anos; prazo "até 1 dia útil" no texto.
