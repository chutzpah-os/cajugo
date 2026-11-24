---
id: 010
slug: referrals
title: Caju Indica · indicação, recompensa e saldo
status: implemented
owner: dono do produto
created: 2026-11-23
---

# 010 · Caju Indica · indicação, recompensa e saldo

## Contexto
O Caju Indica faz a CajuGo crescer por indicação: qualquer pessoa indica lojas para o Catálogo e ganha uma parte da mensalidade da loja indicada (PRD §5.8, fluxo §4.5). A 003 já cria o código pessoal do lojista, o link `/i/{codigo}` que leva ao cadastro e o registro da indicação "Cadastrada"; a 004 descarta a autoindicação por CPF/CNPJ; a 011 abate créditos na fatura. Falta tudo o que faz o programa render: a landing do link [8c], o cadastro do indicador [9b], o acompanhamento das indicações [8a, 8b, 9d], a recompensa a cada mensalidade paga pela indicada, o crédito do lojista [8e], o saldo e o resgate por Pix de vendedor e indicador [9e], a tela do admin [8g], os links de campanha [8f] e o banner na vitrine [9a].

Sucesso: um lojista indica outra loja pelo link, a indicada paga a 1ª mensalidade e o lojista vê a recompensa abatida na própria fatura; um indicador acumula saldo e recebe o Pix.

## Atores
- **Lojista**: indica lojas; a recompensa vira crédito na fatura dele.
- **Vendedor** e **Indicador**: indicam lojas; a recompensa vira saldo, resgatado por Pix.
- **Visitante**: abre o link [8c], se cadastra como indicador [9b] ou como loja [5c] com o código.
- **Admin**: vê as indicações e os resgates [8g], marca o Pix pago e cria links de campanha [8f]; o **Suporte** só consulta.

## Fora de escopo
- Resgate por Pix [9e], tela de indicações e pagamentos do admin [8g] e links de campanha [8f] (spec **010b**, dividida no `/clarify` de 2026-11-23). Até lá, o saldo só acumula.
- Código por celular [9c] (fase 2: depende de SMS/WhatsApp pago).
- Pagamento automático do resgate (o admin paga o Pix por fora e marca como pago).
- Indicação de vendedores (o programa indica só lojas).
- Valores numéricos das regras (% , meses, mínimo, programa ativo, quem indica): já editáveis em [4c]/[8f] desde a 002.

## Requisitos funcionais
- **IND-FR-001** O lojista vê em [8a] a chamada com a recompensa das regras ("Ganhe 30% da mensalidade de cada loja indicada · por até 3 meses, enquanto a loja continuar assinando. Começa a contar no 1º pagamento dela."), o código pessoal, o link com **Copiar** e **WhatsApp**, "Como funciona" e os atalhos para as indicações [8b] e o crédito [8e].
- **IND-FR-002** Vendedor e indicador também têm código pessoal de indicação e link (criados no primeiro acesso ao painel do Caju Indica), com **Copiar** e **WhatsApp** no painel do indicador [9d]; é um código por pessoa, o mesmo em todos os papéis dela, separado do código dos links da Rede Caju.
- **IND-FR-003** O link `/i/{codigo}` abre a landing [8c], fora da busca do Google (`noindex`), com o primeiro nome de quem indicou e o card do Catálogo com a mensalidade das regras; **Quero meu catálogo** leva ao cadastro [5c] com o código aplicado; código inexistente ou desativado mostra a landing sem indicação.
- **IND-FR-004** O visitante se cadastra como indicador em [9b] com nome, celular, e-mail, senha e aceite dos termos, e cai no painel [9d]; quem já tem conta entra e ganha o papel de indicador na mesma conta.
- **IND-FR-005** Quem indica vê as próprias indicações em [8b] (lojista) e em [9d] (vendedor e indicador), com os filtros Todas · Rendendo · Cadastradas · Pausadas, e em cada uma o nome da loja, o status, quanto já rendeu e quantos meses faltam.
- **IND-FR-006** Quando a CajuGo confirma o 1º pagamento da loja indicada, a indicação passa a **Ativa** e rende a 1ª recompensa: o percentual das regras sobre a mensalidade paga.
- **IND-FR-007** Rendem as primeiras mensalidades da indicada, no número de meses das regras: a 1ª e as faturas mensais seguintes, pela ordem dos meses; cada uma rende quando é confirmada, mesmo paga com atraso, e depois da última a indicação fica **Encerrada**.
- **IND-FR-008** Com a loja indicada em atraso ou suspensa, a indicação fica **Pausada**; volta a **Ativa** quando a loja regulariza, sem estender o prazo: os meses que rendem continuam sendo as primeiras mensalidades da loja.
- **IND-FR-009** A recompensa do lojista vira crédito, abatido na próxima fatura dele (a sobra fica para a seguinte); em [8e] ele vê o crédito disponível, o demonstrativo da próxima fatura (mensalidade − crédito) e as movimentações.
- **IND-FR-010** A recompensa do vendedor e do indicador vira saldo; em [9d] ele vê o saldo, a barra até o resgate mínimo, o link e o código, as indicações e as movimentações.
- ~~**IND-FR-011**~~ Resgate por Pix [9e]: movido para a spec 010b (`/clarify` de 2026-11-23). Texto original: com saldo igual ou maior que o mínimo das regras, o vendedor ou indicador pede o resgate em [9e] informando CPF (no primeiro resgate), tipo e chave Pix, confirma, e o resgate fica **Solicitado** com o valor do saldo, que deixa de estar disponível.
- ~~**IND-FR-012**~~ Tela do admin [8g]: movida para a 010b. Texto original: o admin vê em [8g] os indicadores (indicações cadastradas, ativas, recompensas do mês, Pix a pagar) e os filtros Todas · Aguardando · Válidas · Pix a pagar, e marca um resgate como **Pago** com **Marcar Pix pago**, com o `wa.me` para avisar quem resgatou.
- ~~**IND-FR-013**~~ Links de campanha [8f]: movidos para a 010b. Texto original: o admin cria em [8f] links de campanha com um nome (ex.: "Feirão Aracaju"); o link leva ao cadastro com o código da campanha, a indicação fica registrada para a campanha e não rende recompensa; a lista mostra quantas lojas se cadastraram e quantas pagaram por cada link.
- **IND-FR-014** A vitrine [9a] mostra o banner e o rodapé "Indique uma loja e ganhe" com a recompensa das regras, que levam ao painel do Caju Indica de quem já indica ou ao cadastro [9b]; com o programa desligado nas regras, banner, rodapé e landing somem.
- **IND-FR-015** Com o programa desligado ou o papel fora de "quem pode indicar", o código não é aceito em novos cadastros e a pessoa não ganha código novo; as indicações já cadastradas e ativas continuam rendendo até o fim.
- **IND-FR-016** Quem indicou vê no painel o aviso quando a indicação fica Ativa e quando recebe uma recompensa (crédito ou saldo); o aviso do Pix pago é da 010b.
- **IND-FR-017** A indicação não válida (autoindicação, da 003 e 004) nunca rende, e quem indicou a vê como "Não válida", sem o motivo (o admin vê o motivo em [8g], na 010b).

## Requisitos não funcionais
- **IND-NFR-001** [8a], [8b], [8c], [8e], [9b] e [9d] funcionam em 390 px e em 1280 px, com alvos de toque de pelo menos 44 px.
- **IND-NFR-002** A vitrine com o banner [9a] continua em cache e com o mesmo desempenho (`docs/SEO.md`); mudar as regras reflete no banner em até 60 segundos.
- **IND-NFR-003** A recompensa entra na mesma confirmação do pagamento da indicada, e confirmar de novo (ou o mesmo pagamento duas vezes) não gera outra recompensa.

## Requisitos de segurança e privacidade
- **IND-SEC-001** Quem indica A não vê as indicações, o crédito, o saldo nem os resgates de B.
- **IND-SEC-002** Das lojas indicadas, quem indicou vê só o nome da loja e o status; nunca CPF, CNPJ, celular, e-mail ou nome do dono.
- ~~**IND-SEC-003**~~ CPF único no resgate: movido para a 010b com o resgate.
- **IND-SEC-004** Lojista, vendedor e indicador não alteram recompensas, créditos nem saldos: tudo nasce da confirmação do pagamento pelo admin (o Pix pago e as campanhas, só do admin, são da 010b).
- **IND-SEC-005** Valores de recompensa, crédito e saldo são calculados no servidor pela mensalidade efetivamente paga e pelo percentual das regras vigente na data da confirmação.
- **IND-SEC-006** Indicação ativada e recompensa creditada ficam no registro de atividade.

## Critérios de aceite
### IND-FR-001
- **Dado** o lojista Ricardo com o código `RICARDO10`
- **Quando** ele abre [8a]
- **Então** vê "Ganhe 30% da mensalidade de cada loja indicada", o código, o link `/i/ricardo10` com Copiar e WhatsApp, Como funciona e os atalhos para indicações e crédito

### IND-FR-002
- **Dado** a vendedora Ana sem código de indicação
- **Quando** ela abre o painel do Caju Indica
- **Então** ganha um código pessoal (ex.: `ANA10`) e o link com Copiar e WhatsApp

### IND-FR-003
- **Dado** o código `RICARDO10` de Ricardo Souza
- **Quando** um visitante abre `/i/ricardo10`
- **Então** vê "Indicação de Ricardo", o Catálogo a R$ 100/mês e **Quero meu catálogo**, que abre [5c] com o código aplicado
- **E** a página tem `noindex`
- **E** `/i/naoexiste` mostra a landing sem indicação

### IND-FR-004
- **Dado** um visitante sem conta
- **Quando** ele preenche [9b] com nome, celular, e-mail, senha e aceite
- **Então** a conta é criada com o papel de indicador e ele cai em [9d] com o código dele

### IND-FR-005
- **Dado** Ricardo com uma indicação Cadastrada (Loja Nova), uma Ativa (Loja Boa, 1 mês rendido) e uma Pausada
- **Quando** ele filtra "Rendendo" em [8b]
- **Então** vê só a Loja Boa, com "Rendeu R$ 30,00 · faltam 2 meses"

### IND-FR-006
- **Dado** a Loja Boa cadastrada com o código de Ricardo e mensalidade de R$ 100
- **Quando** o admin confirma o 1º pagamento dela
- **Então** a indicação fica Ativa e Ricardo recebe R$ 30 de recompensa

### IND-FR-007
- **Dado** a indicação da Loja Boa com 3 recompensas (1ª mensalidade, novembro e dezembro)
- **Quando** a fatura de janeiro da Loja Boa é confirmada
- **Então** não há nova recompensa e a indicação fica Encerrada
- **E** se a fatura de dezembro tivesse sido paga com atraso, ela renderia ao ser confirmada

### IND-FR-008
- **Dado** a indicação Ativa da Loja Boa
- **Quando** a Loja Boa fica em atraso
- **Então** a indicação fica Pausada
- **E** volta a Ativa quando o pagamento atrasado é confirmado

### IND-FR-009
- **Dado** Ricardo, lojista, com R$ 30 de recompensa
- **Quando** abre [8e]
- **Então** vê "Crédito disponível R$ 30,00", a próxima fatura como R$ 100 − R$ 30 = R$ 70 e a movimentação da Loja Boa
- **E** a fatura seguinte dele abate os R$ 30

### IND-FR-010
- **Dado** a indicadora Júlia com R$ 30 de saldo e mínimo de R$ 50
- **Quando** abre [9d]
- **Então** vê o saldo, a barra em 60% até R$ 50, o link, o código, as indicações e as movimentações

### IND-FR-014
- **Dado** o programa ativo com recompensa de 30%
- **Quando** um visitante abre a vitrine
- **Então** vê o banner "Indique uma loja e ganhe" que leva a [9b]
- **E** com o programa desligado, o banner não aparece

### IND-FR-015
- **Dado** o programa desligado
- **Quando** uma loja se cadastra com o código de Ricardo
- **Então** o código não é aceito
- **E** a indicação Ativa da Loja Boa continua rendendo
- **E** Ricardo não ganha código novo nem vê o banner

### IND-FR-016
- **Dado** a indicação da Loja Boa
- **Quando** o 1º pagamento dela é confirmado
- **Então** Ricardo vê o aviso "Sua indicação Loja Boa está ativa. Você ganhou R$ 30,00."

### IND-FR-017
- **Dado** uma indicação marcada como autoindicação
- **Quando** quem indicou abre [8b] e o admin abre [8g]
- **Então** quem indicou vê "Não válida" sem o motivo, e o admin vê o motivo
- **E** o pagamento da loja não gera recompensa

### IND-SEC-001
- **Dado** os indicadores Júlia e Pedro, cada um com indicações e saldo
- **Quando** Pedro abre o painel ou tenta pedir resgate do saldo de Júlia
- **Então** vê só os dados dele e nada de Júlia

### IND-SEC-002
- **Dado** a Loja Boa indicada por Ricardo
- **Quando** Ricardo vê a indicação
- **Então** vê o nome da loja e o status, sem CNPJ, CPF, celular, e-mail ou nome do dono

### IND-SEC-004
- **Dado** um lojista, um vendedor e um indicador logados
- **Quando** tentam criar, mudar ou apagar uma recompensa, um crédito ou um saldo
- **Então** não há tela nem ação para isso, e o servidor recusa qualquer pedido assim

### IND-SEC-005
- **Dado** a regra de 30% mudada para 20% depois do 1º pagamento da Loja Boa
- **Quando** a fatura seguinte da Loja Boa (R$ 100) é confirmada
- **Então** essa recompensa é de R$ 20, e a primeira continua R$ 30

### IND-SEC-006
- **Dado** uma indicação ativada e uma recompensa creditada
- **Quando** se consulta o registro de atividade
- **Então** há um registro para cada um, sem CPF nem chave Pix

## Pendências
Nenhuma. Resolvidas no `/clarify` de 2026-11-23 (opções recomendadas): divisão com a 010b (resgate, [8g] e campanhas); rendem as primeiras mensalidades da loja, mesmo pagas com atraso, sem estender o prazo; com o programa desligado, as indicações existentes continuam rendendo; landing [8c] `noindex`; um código de indicação por pessoa, separado do código da Rede Caju.
