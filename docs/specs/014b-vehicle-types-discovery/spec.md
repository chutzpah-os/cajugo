---
id: 014b
slug: vehicle-types-discovery
title: Tipos de veículo · descoberta, alertas, admin e cadastro da loja
status: draft
owner: dono do produto
created: 2026-11-24
---

# 014b · Tipos de veículo · descoberta, alertas, admin e cadastro da loja

## Contexto
A 014 deixa a loja anunciar qualquer tipo de veículo e o comprador filtrar por tipo na vitrine. Esta spec leva o tipo ao resto do produto: as páginas de descoberta do Google por tipo, o alerta de busca, as filas do admin e a entrada da loja (landing e cadastro). Ela foi dividida da 014 no `/clarify` de 2026-11-24, e os IDs continuam os da 014.

Sucesso: "motos usadas em Aracaju" no Google leva a `/motos/aracaju-se`; quem pede aviso de uma moto não recebe aviso de carro; uma loja de caminhões se cadastra já dizendo o que vende.

## Atores
- **Visitante/comprador**, **lojista** (no cadastro) e **admin**.

## Fora de escopo
- O que já está na 014: tipos, cadastro, ficha, vitrine e filtro.

## Requisitos funcionais
- **TIP-FR-010** Cada tipo tem as suas **páginas de descoberta** para o Google (`/motos`, `/motos/honda`, `/motos/aracaju-se`, `/caminhoes/...` etc., como as de carro da 006b), com título, texto e listas próprios, e entra no sitemap. `/carros/...` continua como está.
- **TIP-FR-012** O **alerta de busca** ("Avisar quando chegar", 006d) guarda o tipo da busca e só avisa com veículo do mesmo tipo.
- **TIP-FR-013** O admin vê o tipo nos cards de aprovação [14c], denúncias [14e] e Veículos CajuGo [1d], e pode filtrar por tipo.
- **TIP-FR-014** A landing [5b] e o cadastro da loja [5c] falam de "veículos" (não só carros), e o cadastro [5c] pergunta o que a loja vende, com Carro já marcado.

## Requisitos não funcionais
- **TIP-NFR-003** As páginas novas de descoberta seguem o `SEO.md` (§6): HTML do servidor, título, canônica, JSON-LD do tipo e fora do Google quando vazias.

## Requisitos de segurança e privacidade
- **TIP-SEC-004** A pergunta "o que você vende" no cadastro [5c] só aceita os tipos da CajuGo, e o cadastro continua com honeypot e limite de envios (003).

## Critérios de aceite
### TIP-FR-010
- **Dado** motos Honda publicadas em Aracaju
- **Quando** o Google abre `/motos/honda` e `/motos/aracaju-se`
- **Então** as páginas respondem com a lista, o título do tipo e o JSON-LD, e estão no sitemap

### TIP-FR-012
- **Dado** um alerta de busca criado na vitrine filtrada por Moto
- **Quando** chega um carro e depois uma moto que combinam com o resto da busca
- **Então** só a moto conta como veículo compatível

### TIP-FR-013
- **Dado** uma moto aguardando aprovação
- **Quando** o admin abre [14c] e filtra por Moto
- **Então** vê a moto com o tipo no card

### TIP-FR-014
- **Dado** um visitante na landing [5b]
- **Quando** ele segue para o cadastro [5c]
- **Então** a landing fala de veículos, e o cadastro pergunta o que a loja vende, com Carro já marcado

### TIP-SEC-004
- **Dado** o cadastro [5c]
- **Quando** alguém envia um tipo que não existe, por fora da tela
- **Então** o cadastro recusa com o erro no campo e nada é criado

## Pendências
- [PENDENTE] **Plural e gênero nos endereços e títulos** de cada tipo (ex.: `/vans` ou `/vans-e-furgoes`; "Motorhomes usados" ou "Motorhomes e trailers usados")?
