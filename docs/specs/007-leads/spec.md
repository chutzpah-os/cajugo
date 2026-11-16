---
id: 007
slug: leads
title: Leads e desempenho do anúncio
status: implemented
owner: dono do produto
created: 2026-11-16
---

# 007 · Leads e desempenho do anúncio

## Contexto
Hoje o comprador fala com a loja só pelo botão WhatsApp da página do veículo [1b], e a loja não sabe quantos contatos a CajuGo trouxe. Esta spec transforma cada contato (formulário "Envie uma mensagem à loja" ou clique no WhatsApp) num **lead** que a loja acompanha na tela Leads [3a], com a origem (Vitrine CajuGo ou Catálogo da loja), e mostra o desempenho do anúncio em [6e]. Sucesso: o lojista vê, todo mês, quantos leads vieram da vitrine CajuGo, que é o motivo de pagar o plano (PRD §2).

## Atores
- **Visitante** (comprador, não autenticado)
- **Lojista** (dono da loja) e **usuário da loja** (permissão de leads)
- **Admin** e **suporte** (leitura, PRD §4)

## Fora de escopo
- Denunciar anúncio [14d], fila de denúncias [14e] e Ocultar pelo admin: spec **007b · Denúncias** (dividida no `/clarify` de 2026-11-16 para a 007 não passar de 15 FR).
- Ao marcar o veículo como vendido, os leads abertos dele ficam como estão; a regra do PRD [6f] ("leads abertos viram Perdido, exceto o comprador escolhido") entra na spec **009**, junto com a escolha do comprador [7g] (`/clarify` de 2026-11-16).
- Lead marcado com o vendedor ("via vendedor {nome}", link `?ref=`) e confirmar a venda com o comprador escolhido [7g]: specs **008/009**.
- Lead vendido sugerindo confirmar a venda [7g]: spec **009**.
- Leads da loja no detalhe da loja do admin [6g] e "Leads no mês" e origem dos leads no painel do admin [4a]: spec **012**.
- Aviso por e-mail ou WhatsApp automático à loja (fase 2, PRD §11).
- Usuários da loja convidados pelo lojista (PRD §12.1 item 3, ainda em aberto).

## Requisitos funcionais
- **LED-FR-001** A página do veículo [1b] tem o formulário "Envie uma mensagem à loja" com Nome, E-mail e Telefone obrigatórios e a Mensagem já preenchida com "Olá, tenho interesse no veículo. Por favor entre em contato."; ao enviar, cria um lead e confirma "Mensagem enviada. A loja vai responder em breve."
- **LED-FR-002** O formulário recusa e-mail inválido e telefone que não seja brasileiro (DDD + número), com a mensagem no campo.
- **LED-FR-003** Tocar em "WhatsApp" na página do veículo [1b] (barra inferior e simulador [14b]) cria um lead "via WhatsApp" sem nome nem contato (no máximo um por aparelho e veículo a cada 24 horas, LED-FR-013) e abre a conversa normalmente, mesmo se o registro falhar.
- **LED-FR-004** O lead guarda a origem: "via CajuGo" quando o contato saiu da página do veículo na Vitrine CajuGo e "Seu catálogo" quando saiu do Catálogo da loja.
- **LED-FR-005** O lojista vê em "Leads" [3a] os leads da loja, do mais novo ao mais antigo, com os indicadores "Novos, sem resposta" (quantos leads estão "Novo" agora) e "% vieram da vitrine CajuGo" (leads dos últimos 30 dias, inclusive os "via WhatsApp").
- **LED-FR-006** [3a] filtra por Todos, Novo, Em contato e Negociando, cada filtro com a contagem de todos os leads nesse status, sem limite de data.
- **LED-FR-007** O card do lead mostra sigla, nome, tempo relativo ("há 2 h"), veículo · preço, selo de status, selo de origem, a mensagem e as ações WhatsApp (abre a conversa com a pessoa), Ligar (`tel:`) e "→ próximo status".
- **LED-FR-008** "→ próximo status" avança o lead num toque, na ordem Novo → Em contato → Negociando → Vendido; "Perdido" fica no menu do card e vale de qualquer status aberto.
- **LED-FR-009** Lead "Novo" há mais de 24 horas ganha destaque no card.
- **LED-FR-010** Tocar no veículo do card abre a edição do veículo [6e], também se ele foi vendido ou despublicado; o lead continua na lista depois que o veículo sai do ar, e o de veículo excluído mostra o nome do veículo com "Veículo excluído", sem link.
- **LED-FR-011** O item "Leads" do menu do painel mostra o contador de leads novos (aviso no painel, PRD §11).
- **LED-FR-012** A edição do veículo [6e] mostra o bloco "Desempenho do anúncio" com Visualizações, Leads e Dias no ar.
- **LED-FR-013** Toques repetidos em "WhatsApp" do mesmo aparelho no mesmo veículo geram no máximo um lead a cada 24 horas; a conversa abre em todos os toques.
- **LED-FR-014** O lead "via WhatsApp" entra como "Em contato" (a conversa já começou no WhatsApp da loja), com o card "Contato pelo WhatsApp" sem as ações WhatsApp e Ligar; a loja avança o status até Vendido ou Perdido, e ele não conta em "Novos, sem resposta" nem no contador do menu.
- **LED-FR-015** Uma visualização é a abertura da página do veículo por um aparelho num dia: o mesmo aparelho no mesmo veículo conta uma vez por dia, robôs conhecidos não contam, e os veículos já publicados começam do zero quando esta spec entrar no ar.

## Requisitos não funcionais
- **LED-NFR-001** O formulário em [1b] e a tela [3a] funcionam em 390 px e em 1280 px ([15b]), com alvos de toque de pelo menos 44 px.
- **LED-NFR-002** O formulário e o registro do clique não pioram o LCP nem o CLS da página do veículo (LCP < 2,5 s, CLS < 0,1 em 4G, `SEO.md`), e a página continua em cache.
- **LED-NFR-003** Um lead novo aparece em [3a] e no contador do menu em até 60 segundos.

## Requisitos de segurança e privacidade
- **LED-SEC-001** A loja B nunca vê, conta nem altera os leads da loja A; abrir ou mudar o status de um lead de outra loja responde como inexistente.
- **LED-SEC-002** O formulário e o registro do clique no WhatsApp têm honeypot (só o formulário) e limite por IP (5/min e 30/dia), e o IP só é guardado como hash.
- **LED-SEC-003** Nome, e-mail, telefone e mensagem do lead só aparecem para a loja do lead (dono e usuário da loja) e para o admin e o suporte; nunca na vitrine, no catálogo ou em outra loja.
- **LED-SEC-004** O formulário mostra o aviso de privacidade com link para a política [12i] e limita a mensagem a 1.000 caracteres e cada campo ao seu tamanho.
- **LED-SEC-005** Admin e suporte só leem os leads; mudar status é da loja.
- **LED-SEC-006** Lead com mais de 2 anos perde nome, e-mail, telefone e mensagem no job diário (`SECURITY.md` §8); o lead continua nos números da loja e no desempenho do anúncio.

## Critérios de aceite
### LED-FR-001
- **Dado** a página de um veículo publicado da loja A
- **Quando** Ana preenche Nome "Ana", E-mail "ana@exemplo.com", Telefone "(79) 99999-0000" e envia
- **Então** vê "Mensagem enviada. A loja vai responder em breve."
- **E** a loja A tem um lead "Novo" de Ana sobre esse veículo, com a mensagem

### LED-FR-002
- **Dado** o formulário da página do veículo
- **Quando** o e-mail é "ana@" ou o telefone é "1234"
- **Então** o lead não é criado e o campo mostra a mensagem do erro

### LED-FR-003
- **Dado** a página de um veículo da loja A
- **Quando** o visitante toca em "WhatsApp"
- **Então** abre a conversa com a loja
- **E** a loja A tem um lead "via WhatsApp" sobre esse veículo, sem nome

### LED-FR-004
- **Dado** o mesmo veículo aberto pela Vitrine CajuGo e pelo Catálogo da loja
- **Quando** um contato sai de cada página
- **Então** o primeiro lead tem o selo "via CajuGo" e o segundo "Seu catálogo"

### LED-FR-005
- **Dado** a loja A com 4 leads nos últimos 30 dias, 3 "via CajuGo" e 1 "Seu catálogo", 2 deles "Novo", e 1 lead "Seu catálogo" de 40 dias atrás
- **Quando** o lojista abre [3a]
- **Então** vê "Novos, sem resposta: 2" e "75% vieram da vitrine CajuGo"
- **E** os leads aparecem do mais novo ao mais antigo

### LED-FR-006
- **Dado** a loja A com 2 leads "Novo", 1 "Em contato" e 1 "Negociando"
- **Quando** o lojista toca no filtro "Novo"
- **Então** vê só os 2 novos, e os filtros mostram Todos 4, Novo 2, Em contato 1, Negociando 1

### LED-FR-007
- **Dado** um lead de Ana pelo formulário, há 2 horas, sobre um Fiat Argo de R$ 70.000, via CajuGo
- **Quando** o lojista vê o card
- **Então** o card mostra "AN", "Ana", "há 2 h", "Fiat Argo · R$ 70.000", "Novo", "via CajuGo", a mensagem, WhatsApp, Ligar e "→ Em contato"

### LED-FR-008
- **Dado** um lead "Novo"
- **Quando** o lojista toca em "→ Em contato" e depois em "Perdido" no menu do card
- **Então** o lead passa a "Em contato" e depois a "Perdido"
- **E** um lead "Vendido" ou "Perdido" não oferece mais "→ próximo status"

### LED-FR-009
- **Dado** um lead "Novo" criado há 25 horas e outro há 1 hora
- **Quando** o lojista abre [3a]
- **Então** só o de 25 horas aparece em destaque

### LED-FR-010
- **Dado** um lead sobre o Fiat Argo
- **Quando** o lojista toca no veículo do card
- **Então** abre a edição desse veículo [6e]

### LED-FR-010 (veículo fora do ar)
- **Dado** um lead do Fiat Argo, depois marcado como vendido, e um lead do Fiat Uno, depois excluído
- **Quando** o lojista abre [3a]
- **Então** os dois leads continuam na lista
- **E** tocar no Argo abre a edição dele, e o card do Uno mostra "Fiat Uno · Veículo excluído" sem link

### LED-FR-011
- **Dado** a loja A com 3 leads "Novo"
- **Quando** o lojista abre o painel
- **Então** o item "Leads" mostra 3
- **E** depois de avançar um deles para "Em contato", mostra 2

### LED-FR-012
- **Dado** um veículo publicado há 10 dias, aberto 120 vezes, com 4 leads
- **Quando** o lojista abre [6e]
- **Então** vê "Visualizações 120", "Leads 4" e "Dias no ar 10"
- **E** um veículo publicado antes desta spec mostra as Visualizações contadas desde então

### LED-FR-013
- **Dado** um visitante que tocou em "WhatsApp" no Fiat Argo há 1 hora
- **Quando** toca de novo
- **Então** a conversa abre e a loja continua com um só lead "via WhatsApp" desse aparelho para o Argo
- **E** um toque do mesmo aparelho 25 horas depois cria outro lead

### LED-FR-014
- **Dado** um lead "via WhatsApp" do Fiat Argo
- **Quando** o lojista abre [3a]
- **Então** o card mostra "Contato pelo WhatsApp", "Em contato" e "→ Negociando", sem WhatsApp nem Ligar
- **E** "Novos, sem resposta" e o contador do menu não mudam, mas o lead entra no total e no "% vieram da vitrine CajuGo"

### LED-FR-015
- **Dado** um veículo publicado
- **Quando** o mesmo aparelho abre a página 3 vezes hoje, outro aparelho abre 1 vez e um robô de busca abre 5 vezes
- **Então** as Visualizações de hoje sobem 2
- **E** amanhã, a 1ª abertura do primeiro aparelho conta de novo

### LED-SEC-001
- **Dado** um lead da loja A
- **Quando** o lojista B abre [3a] ou tenta avançar o status desse lead
- **Então** não vê o lead, a contagem dele não entra nos números de B e a ação responde como inexistente

### LED-SEC-002
- **Dado** o mesmo IP
- **Quando** envia o 6º formulário ou registra o 6º clique em menos de 1 minuto, ou preenche o campo honeypot
- **Então** o 6º é recusado com "Muitas tentativas" e o honeypot recebe sucesso falso sem criar lead

### LED-SEC-003
- **Dado** um lead de Ana na loja A
- **Quando** se abre a vitrine, o catálogo da loja A ou o painel da loja B
- **Então** o nome, o e-mail e o telefone de Ana não aparecem em nenhum deles

### LED-SEC-004
- **Dado** o formulário da página do veículo
- **Quando** a mensagem tem 1.001 caracteres
- **Então** o lead não é criado e o campo mostra o limite
- **E** o formulário mostra o link para a política de privacidade

### LED-SEC-005
- **Dado** um lead da loja A
- **Quando** o suporte tenta mudar o status dele
- **Então** a ação é recusada e o status não muda

### LED-SEC-006
- **Dado** um lead de Ana criado há 2 anos e 1 dia
- **Quando** o job diário roda
- **Então** o lead fica sem nome, e-mail, telefone e mensagem
- **E** continua contando nos Leads do desempenho do veículo

## Pendências
Nenhuma. Resolvidas no `/clarify` de 2026-11-16 (2 rodadas).
