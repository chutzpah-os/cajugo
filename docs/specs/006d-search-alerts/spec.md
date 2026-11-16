---
id: 006d
slug: search-alerts
title: Avisar quando chegar
status: planned
owner: dono do produto
created: 2026-11-16
---

# 006d · Avisar quando chegar

## Contexto
Quando a busca da vitrine não acha nada [12a], o comprador vai embora e a CajuGo perde o contato. O "Avisar quando chegar" guarda o contato e a busca, e o admin avisa a pessoa pelo WhatsApp quando chega um veículo compatível (envio automático é fase 2, PRD §5.11). Dividida da 006c no `/clarify` de 2026-11-16. Sucesso: buscas sem resultado viram contatos avisados.

## Atores
- **Visitante** (comprador, não autenticado)
- **Admin** (vê os alertas e avisa a pessoa)
- **Lojista** (dono do anúncio)

## Fora de escopo
- Banner e rodapé Caju Indica [9a]: entram com a spec **010**, quando o cadastro de indicador [9b] e o painel existirem (`/clarify` de 2026-11-16: um banner para um programa que ainda não paga levaria a uma página vazia).
- Envio automático do aviso por WhatsApp, SMS ou e-mail (fase 2, PRD §5.11).
- Alerta por e-mail (o e-mail transacional ainda não está decidido) e por telefone fixo.
- Avisar por veículos que já estavam na vitrine quando o alerta foi criado.

## Requisitos funcionais
- **ALR-FR-001** A busca sem resultado [12a] da vitrine e das páginas de descoberta oferece "Avisar quando chegar", que pede nome e celular brasileiro com WhatsApp (DDD + 9 dígitos, começando com 9), guarda a busca feita (texto, filtros e, na página de descoberta, a marca, o modelo ou a cidade dela) e confirma "Vamos avisar quando chegar".
- **ALR-FR-002** Um veículo atende a um alerta quando apareceria na lista da vitrine com a busca guardada (a mesma regra da lista) e entrou na vitrine depois que o alerta foi criado; o alerta aparece para o admin com esse veículo e um botão que abre o WhatsApp da pessoa com mensagem pronta, com o nome dela e o link do veículo.
- **ALR-FR-003** O admin vê os alertas no item "Alertas" do menu (gaveta "Mais" no celular, barra lateral no desktop [15c]), com o contador de alertas com veículo compatível ainda não avisados, e marca cada um como avisado.
- **ALR-FR-004** A mensagem de aviso leva um link para a pessoa cancelar o alerta; cancelado, ele deixa de aparecer para o admin.
- **ALR-FR-005** Um alerta pendente expira depois da validade das regras [4c] (90 dias no início) e deixa de aparecer para o admin.
- **ALR-FR-006** A mesma busca para o mesmo celular, com um alerta ainda pendente, não cria outro: a pessoa vê "Já estamos de olho nessa busca".

## Requisitos não funcionais
- **ALR-NFR-001** O formulário do alerta e a tela "Alertas" funcionam em 390 px e em 1280 px, com alvos de toque de pelo menos 44 px.
- **ALR-NFR-002** O botão do alerta não piora o LCP nem o CLS da vitrine e da descoberta (LCP < 2,5 s, CLS < 0,1 em 4G, `SEO.md`), e as páginas continuam em cache.
- **ALR-NFR-003** Um veículo compatível aparece nos alertas do admin em até 60 segundos depois de entrar na vitrine.

## Requisitos de segurança e privacidade
- **ALR-SEC-001** O lojista nunca vê os alertas nem o contato de quem pediu; só o admin vê.
- **ALR-SEC-002** O formulário tem honeypot e limite de envios por IP (5 por minuto e 30 por dia, `SECURITY.md` §6) e de no máximo 5 alertas pendentes por celular; valida nome, celular e busca; e só guarda com o consentimento para ser contatado, com link para a privacidade [12i].
- **ALR-SEC-003** Um veículo que a loja não divulga na CajuGo, ou de loja fora do ar, nunca aparece num alerta.
- **ALR-SEC-004** O alerta guarda só nome, celular, busca e datas; o nome e o celular são apagados no momento em que o alerta é avisado, cancelado ou expira, e fica só a contagem, sem dado pessoal.
- **ALR-SEC-005** O link de cancelamento não deixa adivinhar nem cancelar o alerta de outra pessoa.

## Critérios de aceite
### ALR-FR-001
- **Dado** a busca "Fiat Toro" com câmbio automático sem resultado
- **Quando** o visitante toca em "Avisar quando chegar", informa nome e celular (79) 99999-0000, aceita ser contatado e confirma
- **Então** vê "Vamos avisar quando chegar"
- **E** o alerta guarda "Fiat Toro" e o câmbio automático
- **E** um telefone fixo, como (79) 3211-0000, é recusado com "Informe um celular com WhatsApp"

### ALR-FR-002
- **Dado** um alerta de Ana para "Fiat Toro" automático até R$ 120.000, criado ontem
- **Quando** um Fiat Toro automático de R$ 110.000 é publicado e divulgado na vitrine hoje
- **Então** o admin vê o alerta com esse veículo e o botão que abre o WhatsApp de Ana com a mensagem citando o nome dela e o link do veículo
- **E** um Fiat Toro manual, um de R$ 130.000 ou um que já estava na vitrine antes do alerta não aparecem

### ALR-FR-003
- **Dado** 2 alertas com veículo compatível e 1 sem
- **Quando** o admin abre o menu
- **Então** "Alertas" mostra o contador 2
- **E** depois de "Marcar como avisado" num deles, o contador vai para 1

### ALR-FR-004
- **Dado** uma pessoa que recebeu o aviso com o link de cancelamento
- **Quando** abre o link e confirma
- **Então** o alerta é cancelado e não aparece mais para o admin

### ALR-FR-005
- **Dado** a validade de 90 dias nas regras e um alerta pendente criado há 91 dias
- **Quando** o admin abre "Alertas"
- **Então** o alerta não aparece
- **E** quando o admin muda a validade em [4c], os próximos vencimentos acompanham

### ALR-FR-006
- **Dado** um alerta pendente de (79) 99999-0000 para "Fiat Toro" automático
- **Quando** o mesmo celular pede de novo a mesma busca
- **Então** vê "Já estamos de olho nessa busca" e continua havendo um só alerta

### ALR-SEC-001
- **Dado** um veículo da loja A com 1 alerta compatível
- **Quando** o lojista A abre o painel e o veículo
- **Então** não vê o alerta nem o contato

### ALR-SEC-002
- **Dado** o formulário "Avisar quando chegar"
- **Quando** um robô preenche o campo escondido, ou o mesmo IP envia mais de 5 em um minuto ou 30 no dia, ou o celular já tem 5 alertas pendentes, ou o celular é inválido, ou falta o consentimento
- **Então** o alerta não é guardado e a pessoa vê a mensagem adequada (sem revelar o honeypot)

### ALR-SEC-003
- **Dado** um alerta para "Fiat Toro" e a loja A publica um Fiat Toro não divulgado na CajuGo
- **Quando** o admin abre "Alertas"
- **Então** o alerta não aparece com esse veículo

### ALR-SEC-004
- **Dado** um alerta avisado, outro cancelado e outro expirado
- **Quando** o admin ou qualquer consulta procura o nome e o celular deles
- **Então** os dados pessoais não existem mais, e só a contagem de alertas fica

### ALR-SEC-005
- **Dado** o link de cancelamento do alerta de Ana
- **Quando** alguém troca um caractere do link ou tenta outro número
- **Então** recebe "Link inválido" e nenhum alerta é cancelado

## Pendências
Nenhuma. Resolvidas no `/clarify` da 006c (2026-11-16): contato com nome e celular, os dois obrigatórios; item "Alertas" no menu do admin com contador; validade de 90 dias como regra [4c]; dados pessoais apagados ao avisar, cancelar ou expirar. No `/clarify` da 006d (2026-11-16):
- Banner Caju Indica [9a] sai daqui e entra com a spec 010.
- "Atende à busca" = a mesma regra da lista da vitrine, só para veículos que entraram depois do alerta (ALR-FR-002).
- Limite por IP do `SECURITY.md` §6 e até 5 pendentes por celular; mesma busca não duplica (ALR-SEC-002, ALR-FR-006).
- Só celular brasileiro com DDD (ALR-FR-001).
