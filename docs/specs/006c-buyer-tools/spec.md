---
id: 006c
slug: buyer-tools
title: Ferramentas do comprador (simulador e favoritos)
status: in-progress
owner: dono do produto
created: 2026-11-15
---

# 006c · Ferramentas do comprador: simulador e favoritos

## Contexto
A vitrine [1a] e a página do veículo [1b] (spec 006) já mostram os veículos, mas o comprador ainda não consegue estimar a parcela nem guardar os carros de que gostou, e por isso sai e não volta. Esta spec traz o simulador [14b] e os favoritos [14a]. Sucesso: parte dos visitantes usa o simulador e envia a simulação à loja pelo WhatsApp, e os favoritos trazem visitas de volta.

## Atores
- **Visitante** (comprador, não autenticado)
- **Lojista** (dono do anúncio)

## Fora de escopo
- "Avisar quando chegar" [12a] e banner Caju Indica [9a] (spec **006d**, dividida no `/clarify` de 2026-11-16).
- Favoritos sincronizados com conta (fase 2): hoje nenhum comprador tem conta, e a conta de comprador seria escopo próprio. Os favoritos ficam só no aparelho.
- Aviso de queda de preço por WhatsApp (fase 2, PRD §5.10).
- Registro de lead ao clicar no WhatsApp e mensagem à loja (spec 007).
- Financiamento real e análise de crédito (PRD §3: o simulador é estimativa).
- Compartilhar a lista de favoritos.

## Requisitos funcionais
### Simulador [14b]
- **BUY-FR-001** Na página de um veículo com "Exibir parcela estimada" ativada pelo lojista [1b], "Simular" e "Ver parcelas" abrem o simulador [14b] com entrada de 0, 20, 30 ou 50% e prazo de 24, 36, 48 ou 60x, já marcados com a entrada e o prazo das regras [4c], e a taxa mensal das regras.
- **BUY-FR-002** O simulador mostra parcela (tabela Price), entrada, valor financiado e total pago, em reais, e o aviso "Estimativa sem análise de crédito", e recalcula a cada troca de entrada ou prazo.
- **BUY-FR-003** "Enviar simulação à loja" abre o WhatsApp do contato do anúncio com mensagem pronta citando o veículo, o link, a entrada, o prazo e a parcela.

### Favoritos [14a]
- **BUY-FR-004** O coração em todo card público (vitrine, descoberta e catálogo da loja) e na página do veículo favorita e desfavorita o veículo, sem conta, e o estado aparece em todas as telas do aparelho.
- **BUY-FR-005** O coração do cabeçalho leva a Favoritos [14a], que lista os favoritos do mais recente ao mais antigo, com o card da vitrine.
- **BUY-FR-006** Um favorito cujo preço atual é menor que o do momento em que foi favoritado mostra o selo "Baixou R$ X" com a diferença.
- **BUY-FR-007** Um favorito vendido, despublicado ou de loja fora do ar continua na lista com o selo "Vendido", sem preço, e leva a veículos parecidos.
- **BUY-FR-008** Sem favoritos, [14a] mostra o estado vazio com convite para a vitrine.

## Requisitos não funcionais
- **BUY-NFR-001** Simulador, coração e [14a] funcionam em 390 px e em 1280 px [15a], com alvos de toque de pelo menos 44 px.
- **BUY-NFR-002** Favoritar e simular não pioram o LCP nem o CLS da vitrine, da descoberta e da página do veículo (LCP < 2,5 s, CLS < 0,1 em 4G, `SEO.md`), e as páginas continuam em cache: o coração não personaliza o HTML.
- **BUY-NFR-003** O simulador calcula sem ida ao servidor e dá o mesmo valor que o "a partir de R$ X/mês" do card para a mesma entrada e prazo.
- **BUY-NFR-004** Até 200 favoritos por aparelho.

## Requisitos de segurança e privacidade
- **BUY-SEC-001** O lojista nunca sabe quem favoritou um veículo: os favoritos ficam no aparelho e a CajuGo não guarda quem favoritou.
- **BUY-SEC-002** [14a] mostra de cada favorito só o que a página pública mostra agora; um veículo que deixou de aparecer não mostra placa, chassi, preço nem foto além do selo "Vendido".

## Critérios de aceite
### BUY-FR-001
- **Dado** as regras [4c] com entrada 20%, prazo 48x e taxa 1,79% a.m., e um veículo de R$ 60.000
- **Quando** o visitante toca em "Simular" na página do veículo
- **Então** o simulador abre com 20% e 48x marcados, e as opções 0/20/30/50% e 24/36/48/60x
- **E** num veículo sem "Exibir parcela estimada", a página não mostra "Simular" nem "Ver parcelas"

### BUY-FR-002
- **Dado** o simulador aberto para um veículo de R$ 60.000 com 20% e 48x a 1,79% a.m.
- **Quando** o visitante troca para 30% e 36x
- **Então** vê a entrada de R$ 18.000, o financiado de R$ 42.000, a parcela pela tabela Price e o total, com o aviso "Estimativa sem análise de crédito"

### BUY-FR-003
- **Dado** o simulador com 30% e 36x de um Fiat Argo
- **Quando** o visitante toca em "Enviar simulação à loja"
- **Então** abre o WhatsApp do contato do anúncio com a mensagem citando o Fiat Argo, o link do veículo, 30%, 36x e a parcela

### BUY-FR-004
- **Dado** um visitante sem conta na vitrine
- **Quando** toca no coração de um card e depois abre a página desse veículo
- **Então** o coração aparece marcado nas duas telas
- **E** tocar de novo desfavorita nas duas
- **E** no catálogo da loja, o coração aparece também nos veículos que a loja não divulga na CajuGo

### BUY-FR-005
- **Dado** 3 veículos favoritados em momentos diferentes
- **Quando** o visitante toca no coração do cabeçalho
- **Então** abre Favoritos [14a] com os 3, do último favoritado ao primeiro

### BUY-FR-006
- **Dado** um veículo favoritado a R$ 80.000
- **Quando** o lojista baixa o preço para R$ 76.000
- **Então** o favorito mostra "Baixou R$ 4.000"
- **E** um favorito que subiu de preço ou ficou igual não mostra selo

### BUY-FR-007
- **Dado** um veículo favoritado
- **Quando** o lojista marca como vendido
- **Então** o favorito fica na lista com "Vendido", sem preço, e leva a veículos parecidos

### BUY-FR-008
- **Dado** um visitante sem favoritos
- **Quando** abre [14a]
- **Então** vê o estado vazio com o convite para ver a vitrine

### BUY-SEC-001
- **Dado** um veículo da loja A favoritado por 5 pessoas
- **Quando** o lojista A abre o painel e o veículo
- **Então** não há em lugar nenhum quem favoritou

### BUY-SEC-002
- **Dado** um veículo com placa ABC1D23 favoritado e depois vendido
- **Quando** o visitante abre [14a]
- **Então** o favorito mostra só "Vendido" e o nome do veículo, sem placa, chassi, preço nem foto

## Pendências
Nenhuma. Resolvidas no `/clarify` de 2026-11-16:
- Dividir em 006c (simulador e favoritos) e 006d ("Avisar quando chegar" e banner Caju Indica).
- Favoritos só no aparelho; sincronizar com conta é fase 2 (PRD §2 e §5.10 ajustados).
- Simulador só em veículo com "Exibir parcela estimada" ativada (BUY-FR-001).
- Coração em todo card público e na página do veículo, divulgado ou não (BUY-FR-004).
