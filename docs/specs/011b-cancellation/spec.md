---
id: 011b
slug: cancellation
title: Cancelamento e fim da assinatura
status: in-progress
owner: dono do produto
created: 2026-11-24
---

# 011b · Cancelamento e fim da assinatura

## Contexto
A 011 cobra, atrasa, suspende e reativa a loja, mas o lojista ainda não consegue sair: a Conta [3c] promete "Você pode cancelar a assinatura a qualquer momento", e o botão não existe. Esta spec fecha o ciclo da assinatura (PRD §5.1, §5.2):
- o cancelamento [12h] sem multa, com a loja no ar até o fim do período pago e **Desfazer** até lá;
- a loja **cancelada** no fim do período e **arquivada** depois da retenção, com os dados pessoais apagados (LGPD);
- a liberação do endereço de quem nunca pagou;
- o **Editar plano** do admin [4b], que muda a mensalidade com 30 dias de aviso.

Sucesso: o lojista cancela sozinho, continua no ar até o dia em que já pagou e, se mudar de ideia, desfaz com um toque; quem não volta tem os dados apagados no prazo.

## Atores
- **Lojista**: cancela, desfaz o cancelamento e reassina.
- **Admin**: vê os cancelamentos em [4b] e edita a mensalidade do plano.
- **Visitante**: vê o catálogo da loja cancelada como indisponível.
- **Job diário**: encerra o período, arquiva e libera endereços.

## Fora de escopo
- Reembolso de mensalidade (sem multa e sem devolução: a loja fica no ar até o fim do período pago).
- Pausar a assinatura sem cancelar.
- Planos diferentes do Plano Catálogo (o MVP tem um plano só).
- Exportação dos dados da loja antes do arquivamento (fase 2).

## Requisitos funcionais
- **CAN-FR-001** A Conta [3c] tem **Cancelar assinatura**, que abre [12h] com as consequências:
  - a loja fica no ar até o fim do período pago (data);
  - depois sai do ar;
  - os dados ficam guardados pela retenção das regras (90 dias);
  - o crédito não usado expira;
  - **Desfazer** vale até o fim do período.
- **CAN-FR-002** Em [12h], o lojista escolhe um motivo opcional (lista das regras) e confirma; a loja passa a **cancelamento agendado**, e tudo continua no ar e editável até o fim do período.
- **CAN-FR-003** Com o cancelamento agendado, o painel mostra o aviso "Sua assinatura termina em dd/mm" com **Desfazer cancelamento**, que devolve a loja a ativa sem cobrar nada a mais.
- **CAN-FR-004** O fim do período é o próximo vencimento da loja: a fatura desse vencimento não é aberta enquanto o cancelamento está agendado.
- **CAN-FR-005** No fim do período, o job passa a loja a **cancelada**:
  - catálogo, veículos, vitrine e links de vendedor saem do ar para o público;
  - o painel abre só a Conta;
  - o crédito não usado expira;
  - as parcerias da Rede Caju e as indicações do Caju Indica dessa loja deixam de render.
- **CAN-FR-006** O lojista da loja cancelada (ainda não arquivada) **reassina** pela Conta pagando uma nova 1ª mensalidade (o mesmo fluxo da 004, com o valor vigente): confirmado o pagamento, a loja volta a ativa com um novo dia de cobrança, o mesmo endereço e os veículos de antes.
- **CAN-FR-007** Passada a retenção das regras (90 dias) desde o cancelamento, o job **arquiva** a loja:
  - apaga os dados da loja (WhatsApp, endereço, CPF/CNPJ, texto, Instagram, logo e capa), os veículos com as fotos e os leads;
  - apaga a conta do dono (login e perfil) se ela não tiver outro papel (vendedor, indicador) nem outra loja; se tiver, tira só o papel de lojista;
  - libera o endereço do catálogo;
  - mantém o nome da loja, as faturas e os pagamentos (sem dado pessoal), para a contabilidade.
- **CAN-FR-008** Uma loja cadastrada sem 1º pagamento confirmado em 7 dias perde o endereço do catálogo, que fica livre para outra loja: a loja continua com um endereço provisório e, se pagar depois, escolhe um endereço livre em Minha loja [3b] (essa primeira troca não conta no limite de 1 a cada 30 dias).
- **CAN-FR-009** Loja em atraso ou suspensa também pode cancelar; o período pago já acabou, então ela fica **cancelada** na hora, e as faturas mensais em aberto são canceladas (não são cobradas depois).
- **CAN-FR-010** O admin vê em [4b] o filtro **Cancelamento agendado** e **Canceladas**, com a data do fim e o motivo informado.
- **CAN-FR-011** Em [4b], **Editar plano** muda a mensalidade a partir de uma data pelo menos 30 dias à frente, para todas as lojas: as faturas abertas a partir dessa data usam o valor novo, todos os lojistas veem no painel o aviso com o valor e a data, e o admin ganha a lista de `wa.me` para avisar.
- **CAN-FR-012** O lojista e o admin veem no painel o aviso do cancelamento agendado, do desfazer e da loja cancelada.

## Requisitos não funcionais
- **CAN-NFR-001** [12h], o aviso do painel e o filtro de [4b] funcionam em 390 px e em 1280 px, com alvos de toque de pelo menos 44 px.
- **CAN-NFR-002** A loja cancelada sai do ar para o público em até 60 segundos depois do fim do período; o job processa todas as lojas numa execução e rodar de novo não repete nada.

## Requisitos de segurança e privacidade
- **CAN-SEC-001** O lojista B não cancela, não desfaz nem reassina a loja A.
- **CAN-SEC-002** Só o dono da loja cancela, desfaz e reassina; o usuário da loja, o vendedor e o suporte não. Só o admin edita o plano.
- **CAN-SEC-003** O arquivamento apaga de verdade os dados pessoais (não só esconde), inclusive as fotos no armazenamento e a conta no provedor de login, e mantém só o nome da loja, as faturas e os pagamentos.
- **CAN-SEC-004** Cancelamento (com o motivo), desfazer, fim do período, arquivamento, liberação de endereço e edição do plano ficam no registro de atividade, sem dado pessoal.
- **CAN-SEC-005** A página pública da loja cancelada mostra "Esta loja não está mais na CajuGo" com status 404 e fora da busca, sem o motivo; depois do arquivamento, o endereço livre responde como qualquer endereço inexistente.

## Critérios de aceite
### CAN-FR-001
- **Dado** a loja A ativa com próximo vencimento em 10/12
- **Quando** o lojista toca em **Cancelar assinatura** na Conta
- **Então** [12h] mostra "No ar até 10/12", a retenção de 90 dias, que o crédito expira e que dá para desfazer até 10/12

### CAN-FR-002
- **Dado** [12h] aberta
- **Quando** o lojista escolhe "Vou parar de vender" e confirma
- **Então** a loja fica em cancelamento agendado e o catálogo continua no ar

### CAN-FR-003
- **Dado** a loja A com cancelamento agendado para 10/12
- **Quando** o lojista toca em **Desfazer cancelamento**
- **Então** a loja volta a ativa, com o mesmo vencimento e sem cobrança extra

### CAN-FR-004
- **Dado** a loja A com cancelamento agendado e vencimento em 10/12
- **Quando** o job roda em 07/12
- **Então** a fatura de dezembro não é aberta

### CAN-FR-005
- **Dado** a loja A com cancelamento agendado para 10/12 e R$ 30 de crédito
- **Quando** o job roda em 10/12
- **Então** a loja fica cancelada, o catálogo e a vitrine saem do ar, o crédito expira e o painel abre só a Conta

### CAN-FR-006
- **Dado** a loja A cancelada há 20 dias
- **Quando** o lojista reassina e o admin confirma o pagamento
- **Então** a loja volta a ativa com os veículos de antes e um novo dia de cobrança

### CAN-FR-007
- **Dado** a loja A cancelada há 90 dias
- **Quando** o job roda
- **Então** a loja fica arquivada, os dados da loja, os veículos e as fotos são apagados e o endereço fica livre
- **E** a conta do dono é apagada, a não ser que ele também seja vendedor ou indicador, caso em que só perde o papel de lojista
- **E** as faturas e os pagamentos continuam, sem dados pessoais

### CAN-FR-008
- **Dado** a loja N cadastrada há 8 dias com o endereço `loja-nova`, sem pagamento confirmado
- **Quando** o job roda
- **Então** `loja-nova` fica livre para outro cadastro, e a loja N fica com um endereço provisório
- **E** se a loja N pagar depois, escolhe um endereço livre em Minha loja

### CAN-FR-009
- **Dado** a loja B suspensa com uma fatura aberta
- **Quando** o lojista cancela
- **Então** a loja fica cancelada na hora e a fatura aberta é cancelada

### CAN-FR-010
- **Dado** a loja A com cancelamento agendado e motivo "Vou parar de vender"
- **Quando** o admin filtra **Cancelamento agendado** em [4b]
- **Então** vê a loja A com "Termina em 10/12 · Vou parar de vender"

### CAN-FR-011
- **Dado** a mensalidade de R$ 100
- **Quando** o admin edita para R$ 120 a partir de 01/02 (mais de 30 dias à frente)
- **Então** as faturas abertas desde 01/02 usam R$ 120, as anteriores R$ 100, e os lojistas veem o aviso
- **E** uma data com menos de 30 dias é recusada

### CAN-FR-012
- **Dado** a loja A que agendou o cancelamento
- **Quando** o lojista e o admin abrem o painel
- **Então** o lojista vê "Sua assinatura termina em 10/12" e o admin vê o aviso da loja A

### CAN-SEC-001
- **Dado** o lojista B logado
- **Quando** tenta cancelar ou desfazer o cancelamento da loja A
- **Então** recebe "não encontrado" e nada muda na loja A

### CAN-SEC-002
- **Dado** o usuário da loja A e o suporte logados
- **Quando** tentam cancelar a loja A ou editar o plano
- **Então** veem "Sem permissão" e nada muda

### CAN-SEC-003
- **Dado** a loja A arquivada
- **Quando** se consulta o banco
- **Então** não há nome, e-mail, celular, CPF/CNPJ nem endereço do dono e da loja, e as fotos não existem mais no armazenamento

### CAN-SEC-004
- **Dado** a loja A cancelada pelo lojista e arquivada pelo job
- **Quando** se consulta o registro de atividade
- **Então** há os registros do cancelamento (com o motivo), do fim do período e do arquivamento, sem dados pessoais

### CAN-SEC-005
- **Dado** a loja A cancelada
- **Quando** um visitante abre `/loja/{slug}`
- **Então** vê "Esta loja não está mais na CajuGo", com status 404, `noindex` e sem o motivo

## Pendências
Nenhuma. Resolvidas no `/clarify` de 2026-11-24 (opções recomendadas): loja em atraso ou suspensa cancela na hora e as faturas abertas são canceladas; reassinar com nova 1ª mensalidade e novo dia de cobrança, mantendo endereço e veículos; arquivamento apaga loja, veículos, fotos, leads e a conta do dono sem outro papel, mantendo nome, faturas e pagamentos; endereço de quem não pagou em 7 dias vira provisório; loja cancelada mostra "não está mais na CajuGo" com 404; Editar plano vale para todas as lojas a partir da data.
