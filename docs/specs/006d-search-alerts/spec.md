---
id: 006d
slug: search-alerts
title: Avisar quando chegar e banner Caju Indica
status: draft
owner: dono do produto
created: 2026-11-16
---

# 006d · Avisar quando chegar e banner Caju Indica

## Contexto
Quando a busca da vitrine não acha nada [12a], o comprador vai embora e a CajuGo perde o contato. O "Avisar quando chegar" guarda o contato e a busca, e o admin avisa a pessoa pelo WhatsApp quando chega um veículo compatível (envio automático é fase 2, PRD §5.11). A vitrine também passa a mostrar o banner Caju Indica [9a]. Dividida da 006c no `/clarify` de 2026-11-16. Sucesso: buscas sem resultado viram contatos avisados, e o banner traz indicações de lojas.

## Atores
- **Visitante** (comprador, não autenticado)
- **Admin** (vê os alertas e avisa a pessoa)
- **Lojista** (dono do anúncio)

## Fora de escopo
- Envio automático do aviso por WhatsApp, SMS ou e-mail (fase 2, PRD §5.11).
- Alerta por e-mail (o e-mail transacional ainda não está decidido).
- Cadastro de indicador [9b], painel [8a]/[9d] e regras do Caju Indica (spec 010); aqui só o banner da vitrine.

## Requisitos funcionais
### Avisar quando chegar [12a]
- **ALR-FR-001** A busca sem resultado [12a] da vitrine e das páginas de descoberta oferece "Avisar quando chegar", que pede nome e celular com WhatsApp, guarda a busca feita (texto e filtros) e confirma "Vamos avisar quando chegar".
- **ALR-FR-002** Quando um veículo que atende à busca de um alerta pendente entra na vitrine, o alerta aparece para o admin com o veículo e um botão que abre o WhatsApp da pessoa com mensagem pronta, com o nome dela e o link do veículo.
- **ALR-FR-003** O admin vê os alertas no item "Alertas" do menu (gaveta "Mais" no celular, barra lateral no desktop [15c]), com o contador de alertas com veículo compatível ainda não avisados, e marca cada um como avisado.
- **ALR-FR-004** A mensagem de aviso leva um link para a pessoa cancelar o alerta; cancelado, ele deixa de aparecer para o admin.
- **ALR-FR-005** Um alerta pendente expira depois da validade das regras [4c] (90 dias no início) e deixa de aparecer para o admin.

### Banner Caju Indica [9a]
- **ALR-FR-006** A vitrine [1a] mostra o banner e o rodapé "Indique uma loja e ganhe" (e o card no desktop [15a]) com a recompensa das regras do Caju Indica, e nenhum dos dois aparece quando o programa está desligado nas regras.

## Requisitos não funcionais
- **ALR-NFR-001** O formulário do alerta, a tela "Alertas" e o banner funcionam em 390 px e em 1280 px, com alvos de toque de pelo menos 44 px.
- **ALR-NFR-002** O banner e o botão do alerta não pioram o LCP nem o CLS da vitrine e da descoberta (LCP < 2,5 s, CLS < 0,1 em 4G, `SEO.md`), e as páginas continuam em cache.
- **ALR-NFR-003** Um veículo compatível aparece nos alertas do admin em até 60 segundos depois de entrar na vitrine.

## Requisitos de segurança e privacidade
- **ALR-SEC-001** O lojista nunca vê os alertas nem o contato de quem pediu; só o admin vê.
- **ALR-SEC-002** O formulário tem honeypot e limite de envios por pessoa, valida nome, celular e busca, e só guarda com o consentimento para ser contatado, com link para a privacidade [12i].
- **ALR-SEC-003** Um veículo que a loja não divulga na CajuGo, ou de loja fora do ar, nunca aparece num alerta.
- **ALR-SEC-004** O alerta guarda só nome, celular, busca e datas; o nome e o celular são apagados no momento em que o alerta é avisado, cancelado ou expira, e fica só a contagem, sem dado pessoal.
- **ALR-SEC-005** O link de cancelamento não deixa adivinhar nem cancelar o alerta de outra pessoa.

## Critérios de aceite
### ALR-FR-001
- **Dado** a busca "Fiat Toro" com câmbio automático sem resultado
- **Quando** o visitante toca em "Avisar quando chegar", informa nome e celular, aceita ser contatado e confirma
- **Então** vê "Vamos avisar quando chegar"
- **E** o alerta guarda "Fiat Toro" e o câmbio automático

### ALR-FR-002
- **Dado** um alerta de Ana para "Fiat Toro" automático
- **Quando** um Fiat Toro automático é publicado e divulgado na vitrine
- **Então** o admin vê o alerta com esse veículo e o botão que abre o WhatsApp de Ana com a mensagem citando o nome dela e o link do veículo

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
- **Dado** o Caju Indica ligado nas regras, com recompensa de 30% por 3 meses
- **Quando** o visitante abre a vitrine
- **Então** vê o banner e o rodapé "Indique uma loja e ganhe" com a recompensa
- **E** com o programa desligado, nenhum dos dois aparece

### ALR-SEC-001
- **Dado** um veículo da loja A com 1 alerta compatível
- **Quando** o lojista A abre o painel e o veículo
- **Então** não vê o alerta nem o contato

### ALR-SEC-002
- **Dado** o formulário "Avisar quando chegar"
- **Quando** um robô preenche o campo escondido, ou a mesma pessoa envia mais vezes que o limite, ou o celular é inválido, ou falta o consentimento
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
Respostas da rodada 1 do `/clarify` da 006c (2026-11-16): contato com nome e celular, os dois obrigatórios; item "Alertas" no menu do admin com contador; validade de 90 dias como regra [4c]; dados pessoais apagados ao avisar, cancelar ou expirar.
- [PENDENTE] **Destino do banner Caju Indica (ALR-FR-006):** enquanto a spec 010 (cadastro de indicador [9b], painel [8a]) não existe, o banner leva para onde, ou só entra junto com a 010?
- [PENDENTE] **O que conta como "atende à busca" (ALR-FR-002):** todos os filtros guardados, ou só marca/modelo e o texto?
- [PENDENTE] **Limite de envios (ALR-SEC-002):** quantos alertas por celular e por aparelho (ex.: 5 por dia)?
