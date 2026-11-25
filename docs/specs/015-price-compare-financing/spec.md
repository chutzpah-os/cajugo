---
id: 015
slug: price-compare-financing
title: Compare os preços (FIPE) e financiamento na página do veículo
status: clarified
owner: dono do produto
created: 2026-11-25
---

# 015 · Compare os preços (FIPE) e financiamento na página do veículo

## Contexto
Na página do veículo [1b], o comprador quer saber se o preço é bom e como pagar. Hoje a CajuGo mostra uma parcela **estimada** (conta Price com taxa da CajuGo) no card e no simulador [14b], o que o dono do produto chamou de "simulação imaginária": não vem de banco nenhum. E a referência FIPE, que o lojista já vê no cadastro (spec 005), não aparece para o comprador.

Esta spec, pedida pelo dono do produto em 2026-11-25 com as referências visuais da Webmotors, faz três coisas:
- mostra o bloco **Compare os preços**: o valor anunciado, a média da CajuGo e a Tabela FIPE;
- troca a fonte da FIPE para a API gratuita **fipe.api.br** (v2);
- tira toda parcela estimada e mostra o bloco **Veja as parcelas desse veículo** com o aviso de que as simulações ainda não estão abertas, enquanto a integração com os bancos não fica pronta.

Sucesso: o comprador compara o preço com a FIPE sem sair da página, e a CajuGo não mostra nenhuma parcela que não venha de um banco.

## Atores
- **Comprador** (visitante): vê o bloco Compare os preços e o de financiamento.
- **Lojista**: deixa de ver o toggle "Exibir parcela estimada" no cadastro do veículo.
- **Admin**: deixa de ver as regras da parcela estimada na Conta [4c].

## Fora de escopo
- Integração com bancos ou financeiras, e qualquer coleta de dados para simulação (vem numa spec própria, quando houver parceiro).
- FIPE dos tipos novos (moto, caminhão): entra com a spec 014, pela mesma API.
- A média da Webmotors (a CajuGo mostra a sua própria média).

## Requisitos funcionais
- **PRC-FR-001** A página do veículo [1b] mostra o bloco escuro **Compare os preços**, depois da ficha:
  - **Valor anunciado**: o preço do veículo;
  - **Média CajuGo**: a média dos preços dos veículos iguais (mesma versão FIPE e ano modelo) na vitrine CajuGo, com "Valor médio de veículos iguais anunciados na CajuGo". Só aparece com pelo menos 3 outros anúncios iguais;
  - **Tabela FIPE**: o valor de referência da versão e ano, com "Valor deste veículo na Tabela FIPE" e o mês de referência.

  Sem FIPE e sem média, o bloco não aparece. Abaixo dos valores, a frase "X% abaixo da Tabela FIPE" ou "X% acima da Tabela FIPE" quando há FIPE.
- **PRC-FR-002** A referência FIPE vem da API gratuita **fipe.api.br** (v2), sem chave, respeitando a cota gratuita (500 consultas por dia): as listas e os preços continuam copiados para o banco da CajuGo sob demanda (ADR 0012), e o formulário e a página não dependem da API no ar.
- **PRC-FR-003** Nenhuma tela mostra parcela estimada:
  - sai o "ou R$ X/mês*" do card [1a] e o "a partir de R$ X/mês*" da página [1b];
  - sai o simulador [14b] e o rodapé "*Parcela estimada…";
  - sai o toggle **Exibir parcela estimada** do cadastro do veículo [2a];
  - saem as regras da parcela (taxa, entrada e prazo) da Conta admin [4c].
- **PRC-FR-004** A página do veículo [1b] mostra o bloco **Veja as parcelas desse veículo**, depois do Compare os preços:
  - "Tudo sem compromisso, vamos começar com alguns dados :)";
  - os campos Nome completo, Data de nascimento, E-mail, CPF, Celular e Estado, desabilitados;
  - o aviso: "No momento não estamos recebendo simulações: estamos fazendo a integração com os bancos para buscar as melhores condições para você.";
  - o botão **Ver parcelas** desabilitado.
- **PRC-FR-005** Ao lado do preço há o botão **Ver parcelas**, que leva ao bloco de financiamento:
  - no celular, junto do preço, no topo da página;
  - no desktop, na coluna da direita (como a Webmotors): preço, **Ver parcelas** e o formulário "Envie uma mensagem à loja", que acompanha a rolagem.

## Requisitos não funcionais
- **PRC-NFR-001** Os blocos novos funcionam em 390 e 1280 px, sem rolagem horizontal e com alvos de toque de pelo menos 44 px.
- **PRC-NFR-002** A página do veículo continua com LCP ≤ 2,5 s e CLS ≤ 0,1 em 4G (SEO.md): a FIPE e a média vêm do banco, nunca da API na hora da visita.

## Requisitos de segurança e privacidade
- **PRC-SEC-001** O bloco de financiamento não envia nem guarda nenhum dado: os campos ficam desabilitados e não há action por trás (LGPD: nada de CPF sem finalidade).
- **PRC-SEC-002** A média CajuGo usa só anúncios da vitrine (a regra pública), nunca rascunho, oculto ou de loja fora do ar.

## Critérios de aceite
### PRC-FR-001
- **Dado** um Corolla Altis 2025 a R$ 165.000 com FIPE R$ 172.082 e 3 outros iguais na vitrine, a R$ 170.000, R$ 172.000 e R$ 174.000
- **Quando** o comprador abre a página
- **Então** vê Valor anunciado R$ 165.000, Média CajuGo R$ 172.000, Tabela FIPE R$ 172.082 (novembro de 2026) e "4,1% abaixo da Tabela FIPE"
- **E** com só 2 iguais, a média não aparece

### PRC-FR-002
- **Dado** a API fipe.api.br
- **Quando** o lojista escolhe marca, modelo e ano no cadastro
- **Então** as listas e o preço vêm dela e ficam guardados; com a API fora, o que já foi guardado continua valendo

### PRC-FR-003
- **Dado** um veículo que antes mostrava parcela
- **Quando** o comprador abre a vitrine e a página
- **Então** não há "/mês" em lugar nenhum, nem o simulador

### PRC-FR-004
- **Dado** a página do veículo
- **Quando** o comprador chega ao bloco Veja as parcelas
- **Então** vê os campos desabilitados, o aviso da integração com os bancos e o Ver parcelas desabilitado

### PRC-FR-005
- **Dado** a página do veículo no desktop
- **Quando** o comprador toca em Ver parcelas, ao lado do preço
- **Então** a página vai até o bloco de financiamento; a coluna da direita com o preço e o formulário acompanha a rolagem

### PRC-SEC-001
- **Dado** o bloco de financiamento
- **Quando** alguém tenta preencher ou enviar
- **Então** os campos não aceitam texto e nada é enviado ao servidor

### PRC-SEC-002
- **Dado** um veículo igual oculto e outro de loja suspensa
- **Quando** a média é calculada
- **Então** nenhum dos dois entra

## Pendências
Nenhuma: decisões do dono do produto em 2026-11-25 (fonte fipe.api.br gratuita; sem parcela estimada; bloco de financiamento com aviso; Ver parcelas ao lado do preço, também no desktop). Média CajuGo com o mínimo de 3 anúncios: opção recomendada, para a média não expor o preço de um anúncio só.
