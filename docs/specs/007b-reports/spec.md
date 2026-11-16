---
id: 007b
slug: reports
title: Denúncias de anúncio
status: implemented
owner: dono do produto
created: 2026-11-16
---

# 007b · Denúncias de anúncio

## Contexto
Anúncio golpista (preço irreal, fotos de outro carro) é o maior risco para a confiança na vitrine (SECURITY.md, ameaças). Qualquer pessoa denuncia um anúncio pela página do veículo [14d], de forma anônima para a loja, e a equipe da CajuGo decide na fila [14e]: **Manter** (arquiva) ou **Ocultar** (tira da vitrine; a loja recebe o motivo). Dividida da 007 no `/clarify` de 2026-11-16. Sucesso: anúncio suspeito sai da vitrine no mesmo dia em que é denunciado e analisado, sem expor quem denunciou.

## Atores
- **Visitante** (comprador, não autenticado) e qualquer pessoa logada: denuncia.
- **Admin** e **suporte**: analisam a fila (PRD §4: "moderar denúncias").
- **Lojista** e **usuário da loja**: recebem o aviso do veículo ocultado.

## Fora de escopo
- Denunciar vendedor [13d] (spec **009**, Rede Caju).
- Aprovação prévia [14c] (spec **005b**).
- Lista "Veículos CajuGo" do admin [1d], o detalhe da loja [6g] com **Ocultar** e o item "denúncias" no "Precisa de atenção" do painel [4a] (spec **012**).
- Aviso à loja por e-mail ou WhatsApp automático (fase 2, PRD §11).

## Requisitos funcionais
- **RPT-FR-001** A página do veículo [1b] tem "Denunciar anúncio", que abre [14d] com os motivos Já vendido, Preço não real, Fotos de outro carro e Suspeita de golpe (um obrigatório) e uma descrição opcional; ao enviar, confirma "Denúncia enviada. Vamos analisar."
- **RPT-FR-002** A fila "Denúncias" [14e] mostra os anúncios publicados com denúncia aberta (anúncio vendido, despublicado ou excluído sai da fila sozinho e volta se for publicado de novo), um card por anúncio, do mais antigo ao mais novo, com foto, veículo, loja, preço, link para o anúncio, quantas denúncias abertas há, a contagem por motivo e as descrições.
- **RPT-FR-003** **Manter** arquiva as denúncias abertas do anúncio, que sai da fila; o anúncio não muda, e uma denúncia nova depois disso volta a colocá-lo na fila.
- **RPT-FR-004** **Ocultar** pede um motivo (Já vendido, Preço não real, Fotos de outro carro, Suspeita de golpe ou Outro, com texto de até 200 caracteres) e confirma "Sai só da vitrine, continua no catálogo da loja; o lojista é avisado com o motivo" (PRD [6f]); o anúncio fica oculto, as denúncias abertas dele são fechadas e ele sai da fila.
- **RPT-FR-005** Anúncio oculto sai da vitrine, das páginas de descoberta, das buscas, do sitemap e dos links de vendedor, e continua no catálogo da loja e na página do veículo aberta por ele (PRD §5.3).
- **RPT-FR-006** O lojista recebe um aviso no painel com o veículo e o motivo do Ocultar (PRD §11), e o veículo mostra o selo "Oculto" e o motivo em Meus veículos [1c] e na edição [6e].
- **RPT-FR-007** O admin tem o item "Denúncias" no menu (gaveta "Mais" no celular, barra lateral no desktop [15c]), com o contador de anúncios na fila.
- **RPT-FR-008** A tela "Denúncias" tem a aba "Ocultados", com os anúncios ocultos, o motivo e quando foram ocultados; **Mostrar de novo** devolve o anúncio à vitrine (se ele é divulgado) e avisa o lojista no painel.
- **RPT-FR-009** Com o veículo oculto, o lojista pode marcar como vendido e excluir, mas não editar nem divulgar na CajuGo; [6e] mostra o motivo e "Para revisar, fale com a CajuGo". Despublicar e publicar de novo mantém o anúncio oculto.
- **RPT-FR-010** Denúncias repetidas do mesmo aparelho para o mesmo anúncio contam uma vez a cada 24 horas; a tela confirma o envio em todas.

## Requisitos não funcionais
- **RPT-NFR-001** [14d] e [14e] funcionam em 390 px e em 1280 px ([15c]), com alvos de toque de pelo menos 44 px.
- **RPT-NFR-002** "Denunciar anúncio" não piora o LCP nem o CLS da página do veículo (LCP < 2,5 s, CLS < 0,1 em 4G, `SEO.md`), e a página continua em cache.
- **RPT-NFR-003** Um anúncio ocultado sai da vitrine em até 60 segundos.

## Requisitos de segurança e privacidade
- **RPT-SEC-001** A denúncia é anônima para a loja: o lojista nunca vê que houve denúncia, quantas, os motivos ou as descrições; vê só o motivo escolhido pela CajuGo ao ocultar.
- **RPT-SEC-002** O formulário [14d] tem honeypot e limite por IP (5/min e 30/dia), o IP só é guardado como hash, e a descrição tem até 1.000 caracteres.
- **RPT-SEC-003** Só admin e suporte veem a fila e decidem; lojista, usuário da loja, vendedor e indicador não abrem [14e] nem chamam Manter ou Ocultar.
- **RPT-SEC-004** Ocultar e Manter mudam só o anúncio da decisão e avisam só a loja dele: a loja B não recebe o aviso nem tem veículo alterado por uma decisão sobre a loja A.
- **RPT-SEC-005** Toda decisão (Manter ou Ocultar, com o motivo) fica no registro de atividade com quem decidiu (PRD [6f]: "Todas as confirmações geram registro"), sem dado de quem denunciou.
- **RPT-SEC-006** A denúncia não guarda quem denunciou, logado ou não: nem conta, nem nome, nem contato (só o hash do IP no limite de envios).

## Critérios de aceite
### RPT-FR-001
- **Dado** a página de um Fiat Argo publicado da loja A
- **Quando** o visitante toca em "Denunciar anúncio", escolhe "Fotos de outro carro", escreve "A placa da foto é de outro veículo" e envia
- **Então** vê "Denúncia enviada. Vamos analisar."
- **E** sem motivo escolhido, o envio é recusado com "Escolha um motivo."

### RPT-FR-002
- **Dado** o Argo da loja A com 2 denúncias abertas ("Preço não real" e "Suspeita de golpe") e o Onix da loja B com 1, feita antes
- **Quando** o admin abre "Denúncias"
- **Então** vê o Onix primeiro e depois o Argo com "2 denúncias", "Preço não real 1", "Suspeita de golpe 1", as descrições e o link do anúncio

### RPT-FR-003
- **Dado** o Argo com 2 denúncias abertas
- **Quando** o admin toca em "Manter"
- **Então** o Argo sai da fila e continua na vitrine
- **E** uma nova denúncia do Argo o coloca na fila de novo, com "1 denúncia"

### RPT-FR-004
- **Dado** o Argo com 2 denúncias abertas
- **Quando** o admin toca em "Ocultar", escolhe um motivo e confirma
- **Então** o Argo fica oculto e sai da fila
- **E** sem motivo escolhido, "Ocultar da vitrine" não confirma

### RPT-FR-005
- **Dado** o Argo oculto, divulgado na CajuGo
- **Quando** alguém abre a vitrine, a página de descoberta "/carros/fiat", o sitemap e o catálogo da loja A
- **Então** o Argo não aparece na vitrine, na descoberta nem no sitemap
- **E** aparece no catálogo da loja A, e a página dele abre como veículo do catálogo

### RPT-FR-006
- **Dado** o Argo da loja A ocultado com um motivo
- **Quando** o lojista A abre o painel
- **Então** vê o aviso com "Fiat Argo" e o motivo
- **E** o Argo aparece com o selo "Oculto" e o motivo em [1c] e em [6e]

### RPT-FR-007
- **Dado** 2 anúncios com denúncia aberta
- **Quando** o admin abre o menu
- **Então** "Denúncias" mostra 2
- **E** depois de Manter um deles, mostra 1

### RPT-FR-002 (anúncio fora do ar)
- **Dado** o Argo com denúncia aberta
- **Quando** o lojista marca o Argo como vendido
- **Então** o Argo sai da fila
- **E** se a venda for desfeita, ele volta à fila com a mesma denúncia

### RPT-FR-008
- **Dado** o Argo oculto com o motivo "Preço não real"
- **Quando** o admin abre a aba "Ocultados" e toca em "Mostrar de novo"
- **Então** o Argo volta à vitrine e sai da aba
- **E** o lojista vê no painel o aviso de que o Argo voltou à vitrine

### RPT-FR-009
- **Dado** o Argo da loja A oculto
- **Quando** o lojista abre [6e]
- **Então** vê o motivo e "Para revisar, fale com a CajuGo", sem "Editar" nem "Divulgar na CajuGo"
- **E** pode marcar como vendido ou excluir
- **E** se despublicar e publicar de novo, o Argo continua oculto

### RPT-FR-010
- **Dado** um aparelho que denunciou o Argo há 1 hora
- **Quando** denuncia o Argo de novo
- **Então** vê "Denúncia enviada. Vamos analisar." e a fila continua com a mesma contagem
- **E** a denúncia do mesmo aparelho 25 horas depois conta de novo

### RPT-SEC-006
- **Dado** um lojista logado que denuncia o anúncio de outra loja
- **Quando** o admin abre a fila
- **Então** a denúncia aparece sem conta, nome ou contato de quem denunciou

### RPT-SEC-001
- **Dado** o Argo da loja A com 2 denúncias e depois ocultado
- **Quando** o lojista A abre o painel, [1c], [6e] e o aviso
- **Então** vê só o motivo do Ocultar, sem número de denúncias, motivos das denúncias, descrições ou qualquer dado de quem denunciou

### RPT-SEC-002
- **Dado** o formulário [14d]
- **Quando** o mesmo IP envia a 6ª denúncia em menos de 1 minuto, ou preenche o campo honeypot, ou manda uma descrição de 1.001 caracteres
- **Então** a 6ª é recusada com "Muitas tentativas", o honeypot recebe sucesso falso sem criar denúncia e a descrição longa é recusada no campo

### RPT-SEC-003
- **Dado** um lojista, um usuário da loja e um vendedor logados
- **Quando** abrem "Denúncias" ou tentam Manter ou Ocultar
- **Então** veem "Sem permissão" e nada muda

### RPT-SEC-004
- **Dado** o Argo da loja A e o Onix da loja B, ambos com denúncia aberta
- **Quando** o admin oculta o Argo
- **Então** o Onix continua na vitrine e na fila, e só a loja A recebe o aviso

### RPT-SEC-005
- **Dado** o suporte que oculta o Argo com o motivo "Preço não real"
- **Quando** se consulta o registro de atividade
- **Então** há um registro com o suporte, o Argo, a decisão e o motivo, sem IP nem texto das denúncias

## Pendências
Nenhuma. Resolvidas no `/clarify` de 2026-11-16 (motivos do Ocultar, mostrar de novo, lojista com veículo oculto, denúncia repetida, sem autor, anúncio fora do ar, item no menu).
