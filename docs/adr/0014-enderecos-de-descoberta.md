# Endereços das páginas de descoberta

Status: proposta (plano da 006b, 2026-11-15)

As páginas de descoberta ficam sob `/carros`, com marca e cidade no mesmo nível: `/carros/{marca}`, `/carros/{marca}/{modelo}`, `/carros/{cidade}-{uf}` e `/carros/{cidade}-{uf}/{marca}`. A cidade é reconhecida por terminar com uma das 27 UFs; o resto é marca. Endereço indexado é difícil de mudar (cada troca custa redirecionamentos e posição no Google), por isso a regra fica registrada.

- **Por quê:** endereços curtos e parecidos com a busca ("fiat argo", "carros campinas sp") e um índice só (`/carros`) para o buscador chegar a todas as páginas.
- **Descartado:** prefixos separados (`/carros/marca/fiat`, `/carros/cidade/campinas-sp`): sem ambiguidade, mas mais longos e sem ganho para o comprador.
- **Consequências:** a marca é escrita com o nome conhecido (`brandName`, "GM - Chevrolet" → `chevrolet`); uma marca terminada em `-{uf}` precisaria de correção na lista de nomes. O status real (404) de `/carros/*` vem do `proxy.ts`, como em `/loja` e `/v` (ADR 0013). Página que já teve veículos e ficou vazia responde 200, fora do Google, com alternativas.
