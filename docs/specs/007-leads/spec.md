---
id: 007
slug: leads
title: Leads e desempenho do anúncio
status: draft
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
- Denunciar anúncio [14d], fila de denúncias [14e] e Ocultar pelo admin: proposta de spec **007b** (divisão para a 007 não passar de 15 FR; ver Pendências).
- Lead marcado com o vendedor ("via vendedor {nome}", link `?ref=`) e confirmar a venda com o comprador escolhido [7g]: specs **008/009**.
- Lead vendido sugerindo confirmar a venda [7g]: spec **009**.
- Leads da loja no detalhe da loja do admin [6g] e "Leads no mês" e origem dos leads no painel do admin [4a]: spec **012**.
- Aviso por e-mail ou WhatsApp automático à loja (fase 2, PRD §11).
- Usuários da loja convidados pelo lojista (PRD §12.1 item 3, ainda em aberto).

## Requisitos funcionais
- **LED-FR-001** A página do veículo [1b] tem o formulário "Envie uma mensagem à loja" com Nome, E-mail e Telefone obrigatórios e a Mensagem já preenchida com "Olá, tenho interesse no veículo. Por favor entre em contato."; ao enviar, cria um lead e confirma "Mensagem enviada. A loja vai responder em breve."
- **LED-FR-002** O formulário recusa e-mail inválido e telefone que não seja brasileiro (DDD + número), com a mensagem no campo.
- **LED-FR-003** Tocar em "WhatsApp" na página do veículo [1b] (barra inferior e simulador [14b]) cria um lead "via WhatsApp" sem nome nem contato e abre a conversa normalmente, mesmo se o registro falhar.
- **LED-FR-004** O lead guarda a origem: "via CajuGo" quando o contato saiu da página do veículo na Vitrine CajuGo e "Seu catálogo" quando saiu do Catálogo da loja.
- **LED-FR-005** O lojista vê em "Leads" [3a] os leads da loja, do mais novo ao mais antigo, com os indicadores "Novos, sem resposta" e "% vieram da vitrine CajuGo".
- **LED-FR-006** [3a] filtra por Todos, Novo, Em contato e Negociando, cada filtro com a sua contagem.
- **LED-FR-007** O card do lead mostra sigla, nome, tempo relativo ("há 2 h"), veículo · preço, selo de status, selo de origem, a mensagem e as ações WhatsApp (abre a conversa com a pessoa), Ligar (`tel:`) e "→ próximo status".
- **LED-FR-008** "→ próximo status" avança o lead num toque, na ordem Novo → Em contato → Negociando → Vendido; "Perdido" fica no menu do card e vale de qualquer status aberto.
- **LED-FR-009** Lead "Novo" há mais de 24 horas ganha destaque no card.
- **LED-FR-010** Tocar no veículo do card abre a edição do veículo [6e].
- **LED-FR-011** O item "Leads" do menu do painel mostra o contador de leads novos (aviso no painel, PRD §11).
- **LED-FR-012** A edição do veículo [6e] mostra o bloco "Desempenho do anúncio" com Visualizações, Leads e Dias no ar.

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
- **Dado** a loja A com 4 leads no período, 3 "via CajuGo" e 1 "Seu catálogo", 2 deles "Novo"
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

### LED-FR-011
- **Dado** a loja A com 3 leads "Novo"
- **Quando** o lojista abre o painel
- **Então** o item "Leads" mostra 3
- **E** depois de avançar um deles para "Em contato", mostra 2

### LED-FR-012
- **Dado** um veículo publicado há 10 dias, aberto 120 vezes, com 4 leads
- **Quando** o lojista abre [6e]
- **Então** vê "Visualizações 120", "Leads 4" e "Dias no ar 10"

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

## Pendências
- [PENDENTE] **Divisão:** a 007 do `PLAN.md` inclui denúncias [14d], a fila [14e] e Ocultar; juntas passariam de 15 FR. Proponho mover essa parte para uma spec **007b · Denúncias**. Pode dividir?
- [PENDENTE] **Clique no WhatsApp repetido:** cada toque vira um lead, ou toques do mesmo aparelho no mesmo veículo dentro de um tempo (ex.: 24 h) contam como um só?
- [PENDENTE] **Lead "via WhatsApp" sem contato:** a CajuGo não sabe o número de quem tocou. Como fica o card (sem WhatsApp e Ligar?), ele entra em "Novos, sem resposta" e no contador do menu, e tem status para avançar? Ou ele só conta nos números (desempenho e % da vitrine) sem virar card?
- [PENDENTE] **Visualizações:** o que conta como uma visualização (toda abertura da página, uma por aparelho por dia, sem robôs)? E desde quando: só a partir desta spec (os veículos antigos começam do zero)?
- [PENDENTE] **Marcar como vendido** (PRD [6f]): "leads abertos viram Perdido, exceto o comprador escolhido". A escolha do comprador é da 009; nesta spec, ao marcar vendido, os leads abertos viram Perdido, ficam como estão, ou o diálogo [6f] já pergunta qual lead comprou?
- [PENDENTE] **Período dos indicadores** de [3a] ("% vieram da vitrine CajuGo" e as contagens): mês atual, últimos 30 dias ou desde sempre?
- [PENDENTE] **Retenção de 2 anos** (`SECURITY.md` §8): nesta spec o job diário apaga nome, e-mail, telefone e mensagem dos leads com mais de 2 anos, ou isso fica para depois?
- [PENDENTE] **Veículo depois do lead:** lead de veículo vendido, despublicado ou excluído continua em [3a]? E tocar no veículo excluído faz o quê?
