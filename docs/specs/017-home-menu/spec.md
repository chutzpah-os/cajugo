---
id: 017
slug: home-menu
title: Página inicial e menu do site
status: in-progress
owner: dono do produto
created: 2026-11-25
---

# 017 · Página inicial e menu do site

## Contexto
Pedido do dono do produto em 2026-11-25: a `/` vira a página principal da CajuGo, sem a lista de veículos, e o cabeçalho ganha os menus **Comprar · Vender · Financiar · Cuidar · Assinar · Descobrir**, como nos grandes classificados, adaptados ao que a CajuGo tem. O que ainda não existe aparece com o selo **Em breve**. A lista de veículos (a vitrine [1a]/[15a]) passa para `/veiculos`.

## Fora de escopo
- Construir os serviços marcados como Em breve (financiamento, Tabela FIPE, carro por assinatura); o LaudoCaju é a spec 016.

## Requisitos funcionais
- **HOM-FR-001** A `/` mostra a abertura (o que é a CajuGo, com a ilustração no desktop), o quadro **Buscar · Vender** (a busca e a faixa de tipos levam à vitrine com o filtro) e os produtos da CajuGo (Catálogo para lojas, Rede Caju, Caju Indica, LaudoCaju), sem a lista de veículos.
- **HOM-FR-002** A vitrine fica em `/veiculos`, com os mesmos filtros na URL (`/veiculos?tipo=moto`); o endereço antigo com filtros (`/?marca=bmw`) responde 308 para `/veiculos?marca=bmw`.
- **HOM-FR-003** Em todas as páginas públicas (vitrine, veículo, loja, descoberta, lojistas, termos, favoritos, entrar, recuperar senha e os cadastros), o cabeçalho tem os menus que abrem com a lista de opções:
  - **Comprar**: Veículos novos e Usados (`?estado=`; o seminovo saiu a pedido do dono em 2026-11-25), Carros, Motos, Picapes, Caminhões, Todos os veículos, Favoritos;
  - **Vender**: Anunciar minha loja, Ser vendedor da Rede Caju, Indicar uma loja (Caju Indica);
  - **Financiar**: Simular financiamento (Em breve);
  - **Cuidar**: LaudoCaju · consulta veicular (Em breve até a 016), Seguro (Em breve);
  - **Assinar**: Plano Catálogo para lojas, Carro por assinatura (Em breve);
  - **Descobrir**: Para lojistas (`/lojistas`), Caju Indica (`/conheca/caju-indica`) e Rede Caju (`/conheca/rede-caju`), cada um com a sua página de vendas (como funciona, o que ganha, perguntas e o link para entrar ou se cadastrar); Tabela FIPE (Em breve).
- **HOM-FR-007** O rodapé traz o Instagram @caju.go (pedido do dono, 2026-11-25).
- **HOM-FR-004** No celular, o menu [11a] traz as mesmas seções, cada uma abrindo as suas opções.
- **HOM-FR-005** Item Em breve não é link: mostra o selo e não leva a lugar nenhum.

- **HOM-FR-006** (pedido do dono, 2026-11-25) Entrar, Recuperar senha e os cadastros do lojista, do Caju Indica e da Rede Caju têm versão para desktop: o painel com o que a pessoa ganha à esquerda e o formulário num card à direita; no celular, o formulário primeiro e o painel embaixo.

## Requisitos não funcionais
- **HOM-NFR-001** `/` e `/veiculos` pré-renderizadas, com título, descrição, canônica e JSON-LD (SEO.md); os menus abrem sem JavaScript (`<details>`), com alvos ≥ 44 px, em 390 e 1280 px.

## Critérios de aceite
### HOM-FR-001
- **Dado** a `/`
- **Quando** o visitante a abre
- **Então** vê a abertura, Buscar · Vender e os produtos, e nenhum card de veículo; tocar em Moto leva a `/veiculos?tipo=moto`

### HOM-FR-002
- **Dado** o link antigo `/?marca=bmw`
- **Quando** é aberto
- **Então** responde 308 para `/veiculos?marca=bmw`

### HOM-FR-003
- **Dado** o desktop
- **Quando** o visitante abre Comprar e escolhe Motos
- **Então** vai para `/veiculos?tipo=moto`; em Financiar, "Simular financiamento" aparece com Em breve e sem link

## Pendências
Nenhuma.
