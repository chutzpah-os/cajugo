---
id: 016
slug: laudo-caju
title: LaudoCaju · selo e laudo do veículo vistoriado
status: draft
owner: dono do produto
created: 2026-11-25
---

# 016 · LaudoCaju · selo e laudo do veículo vistoriado

## Contexto
O **LaudoCaju** é um produto da CajuGo: o veículo que tem laudo cautelar ganha um selo e um bloco na página do veículo [1b], para o comprador fechar negócio com mais confiança. A referência visual é o "Vistoriado" da Webmotors (capturas enviadas pelo dono em 2026-11-25): uma faixa escura acima do título com o selo e **Mais detalhes**; mais abaixo, o bloco do laudo com os itens inspecionados, **Visualizar laudo**, **Saiba mais** (página do produto) e o aviso de responsabilidade.

## Atores
- **Comprador**: vê o selo, o bloco e o laudo.
- **Lojista**: [PENDENTE P1] envia ou pede o laudo.
- **Vistoriadora**: [PENDENTE P1] emite o laudo.
- **Admin**: [PENDENTE P4] confere o laudo antes de o selo aparecer.

## Fora de escopo
- A vistoria em si (feita pela vistoriadora).
- Cobrança do LaudoCaju [PENDENTE P3].

## Requisitos funcionais
- **LAU-FR-001** O veículo com laudo válido mostra, acima do título na página [1b], a faixa escura com o selo **LaudoCaju** e **Mais detalhes**; tocar em Mais detalhes desce até o bloco do laudo.
- **LAU-FR-002** O bloco do laudo mostra:
  - "Confiança e tranquilidade na compra do seu seminovo aqui na CajuGo";
  - **Diversos itens inspecionados**, com a marca de conferido: Estrutura, Indício de sinistro, Funilaria, Interior, Débitos e Restrições;
  - "Você mais seguro na hora de fechar o negócio!";
  - **Visualizar laudo**, que abre o laudo [PENDENTE P2];
  - "Ainda com dúvidas sobre o LaudoCaju? **Saiba mais**", que leva à página do produto LaudoCaju;
  - o aviso: "A CajuGo não possui qualquer ingerência ou responsabilidade em relação ao laudo cautelar, atuando meramente como um classificado de anúncios de veículos com atribuição do selo LaudoCaju, sendo as vistoriadoras as únicas responsáveis pelo laudo cautelar emitido, assim como os itens vistoriados."
- **LAU-FR-003** A página do produto **LaudoCaju** explica o que é o laudo, os itens inspecionados e como ter o selo [PENDENTE P5].
- **LAU-FR-004** O card [1a] do veículo com laudo mostra o selo LaudoCaju [PENDENTE P6].
- **LAU-FR-005** Veículo sem laudo, ou com laudo vencido [PENDENTE P7], não mostra a faixa, o bloco nem o selo.

## Requisitos de segurança e privacidade
- **LAU-SEC-001** O laudo nunca mostra dado pessoal do dono do veículo nem a placa inteira (só o final, como no resto da CajuGo).
- **LAU-SEC-002** Só o lojista da loja (ou o admin) anexa ou troca o laudo do veículo; loja B não mexe no laudo do veículo da loja A.

## Critérios de aceite
### LAU-FR-001
- **Dado** um veículo com laudo válido
- **Quando** o comprador abre a página e toca em Mais detalhes
- **Então** a página desce até o bloco do laudo

### LAU-FR-002
- **Dado** o bloco do laudo
- **Quando** o comprador o lê
- **Então** vê os 6 itens inspecionados, Visualizar laudo, Saiba mais e o aviso de responsabilidade

### LAU-FR-005
- **Dado** um veículo sem laudo
- **Quando** o comprador abre a página
- **Então** não há faixa, bloco nem selo LaudoCaju

## Pendências
- [PENDENTE P1] Quem emite e como o laudo chega à CajuGo: o lojista envia o PDF de qualquer vistoriadora, só vistoriadoras parceiras, ou a CajuGo contrata a vistoria?
- [PENDENTE P2] "Visualizar laudo" abre o PDF enviado (guardado como imagem/arquivo no Cloudinary) ou um link da vistoriadora?
- [PENDENTE P3] O LaudoCaju é cobrado do lojista (avulso ou no plano) ou é grátis no MVP?
- [PENDENTE P4] O admin confere o laudo antes de o selo aparecer, ou o selo aparece assim que o lojista envia?
- [PENDENTE P5] Endereço e conteúdo da página do produto (ex.: `/laudocaju`).
- [PENDENTE P6] O selo também aparece no card da vitrine, ou só na página do veículo?
- [PENDENTE P7] O laudo tem validade (ex.: 90 dias, ou até o km mudar)?
- [PENDENTE P8] Os itens inspecionados são sempre os 6 da referência, ou vêm do laudo (com "aprovado"/"com apontamento")?
