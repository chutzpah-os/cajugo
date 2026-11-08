---
id: 004
slug: pix-activation
title: Pix manual e ativação da loja
status: in-progress
owner: dono do produto
created: 2026-11-08
---

# 004 · Pix manual e ativação da loja

## Contexto
É o momento em que o cadastro vira receita. Depois de criar a loja (spec 003), o lojista confirma o plano [5d], paga a 1ª mensalidade por Pix para a chave da CajuGo e envia o comprovante [6c]; enquanto o admin confere no extrato, vê "Pagamento em análise" [10a]. O admin confirma ou recusa na fila de comprovantes [10b]; confirmado, a loja fica **ativa**, o catálogo vai ao ar e o lojista vê o onboarding [5e]; recusado, vê o motivo e reenvia [12e]. No MVP não há gateway: nenhum dado de cartão, nenhuma cobrança automática (PRD §5.6).
Sucesso: um comprovante enviado é conferido em até 1 dia útil, e a loja vai ao ar no mesmo instante da confirmação, sem ajuste manual no banco.

## Atores
- **Lojista** (store_owner) com loja `cadastrada` ou `pagamento em análise`: paga e envia o comprovante.
- **Usuário da loja** (store_staff): não paga nem envia comprovante (AUT-FR-016).
- **Admin**: confere, confirma, recusa e registra pagamento sem comprovante.
- **Suporte**: vê a fila de comprovantes, sem agir (AUT-SEC-008).
- **Visitante**: passa a ver o catálogo da loja quando ela fica ativa.

## Fora de escopo
- Fatura mensal [10c], aviso de vencimento em 3 dias, atraso, suspensão [12f]/[12g], reativação de loja suspensa, cancelamento [12h] e Assinaturas do admin [4b] (spec 011). Aqui entra só a **1ª mensalidade**.
- Recompensa do Caju Indica e status "Ativa" da indicação no 1º pagamento confirmado (spec 010), que confere a autoindicação por CPF/CNPJ de novo antes de pagar qualquer recompensa.
- "Editar plano" [4b] com aviso de 30 dias antes da mudança de preço (spec 011); aqui o preço já é uma regra editável em [4c].
- Detalhe da loja do admin [6g]: o registro de pagamento sem comprovante fica em [10b] e ganha um atalho na [6g] na spec 012.
- Painel admin [4a] (spec 012).
- Cadastro de veículos e rascunhos [2a] (spec 005): [10a] e [5e] só apontam para lá.
- Recibo e nota fiscal (fora do sistema no MVP, PRD §5.6).
- Gateway, Pix automático e cartão (fase 2, PRD §12.1 #6).
- Envio automático de avisos por e-mail, WhatsApp ou SMS: no MVP, aviso no painel e botão `wa.me` (PRD §11).
- Liberação do endereço sem 1º pagamento em 7 dias (job da spec 011).

## Requisitos funcionais
- **PIX-FR-001** A tela de pagamento [5d] mostra o resumo do Plano Catálogo (valor por mês, vindo da regra "Mensalidade do Plano Catálogo" editável pelo admin em [4c], com vigência, nome da loja, vencimento no dia da 1ª confirmação, "Sem fidelidade", "Você pode cancelar a assinatura a qualquer momento.") e só a forma de pagamento Pix.
- **PIX-FR-002** Em [5d] o lojista informa CPF ou CNPJ (com validação dos dígitos) e segue para o Pix [6c] pelo botão "Pagar com Pix · R$ {valor}".
- **PIX-FR-003** Ao informar o CPF ou CNPJ, se ele for o mesmo já informado por quem indicou a loja, a indicação fica "não válida" por autoindicação; se quem indicou ainda não tem documento, a comparação acontece quando ele informar. O lojista indicado não vê aviso e segue para o Pix normalmente.
- **PIX-FR-004** A tela do Pix [6c] mostra o valor a pagar, a chave Pix da CajuGo com "Copiar", o QR code estático com o valor, o favorecido, "Como pagar" em passos e o prazo de conferência das regras ("Conferimos o comprovante em até {N} dia útil."). Sem chave Pix configurada, [5d] avisa "O pagamento está indisponível no momento. Fale com a CajuGo." com o botão `wa.me` do suporte, o botão de pagar fica desabilitado e [10b] mostra ao admin "Chave Pix não configurada".
- **PIX-FR-005** Em [6c] o lojista anexa o comprovante (foto ou PDF, até 10 MB) com pré-visualização e informa o valor pago; "Enviar comprovante" só habilita com arquivo e valor.
- **PIX-FR-006** Enviado o comprovante, o pagamento fica "Comprovante enviado", a loja fica "pagamento em análise" e o lojista vê [10a] ("Comprovante recebido. Estamos conferindo." e o prazo); enquanto estiver em análise, entrar leva a [10a] e não é possível enviar outro comprovante.
- **PIX-FR-007** O admin vê a fila de comprovantes aguardando conferência [10b], do mais antigo ao mais recente, com loja, referência ("1ª mensalidade"), valor, horário do envio e o arquivo em visualização privada, além dos totais "aguardando conferência" e "confirmados no mês" e o lembrete "Confira no extrato se o valor caiu na chave".
- **PIX-FR-008** Na fila, o comprovante cujo valor pago (informado pelo lojista) difere do esperado mostra o alerta "Valor diferente do esperado"; ao conferir, o admin pode corrigir o valor pago conforme o extrato, e o valor corrigido é o que vale.
- **PIX-FR-009** Ao **Confirmar**, o pagamento fica confirmado, a 1ª mensalidade fica paga, a loja fica **ativa**, o próximo vencimento passa a ser o mesmo dia do mês seguinte (no último dia do mês quando ele não tem esse dia: 31/01 → 28/02 → 31/03) e o admin recebe um botão `wa.me` com a mensagem pronta para o WhatsApp da loja.
- **PIX-FR-010** Ao **Recusar**, o admin informa o motivo (obrigatório); o pagamento fica recusado, a loja volta a "cadastrada" e o lojista vê [12e] com o motivo, o valor faltante (quando houver) e um novo envio.
- **PIX-FR-011** Em [10b], o admin pode registrar um pagamento sem comprovante (exceção, ex.: dinheiro): busca a loja pelo nome ou pelo endereço, informa a forma, o valor e uma observação; tem o mesmo efeito da confirmação.
- **PIX-FR-012** Com a loja ativa pela 1ª vez, o painel do lojista mostra o onboarding [5e]: "Assinatura ativa. Sua loja está no ar." com o link do catálogo, "Primeiros passos" (Assinatura ativa ✓; Cadastre seu primeiro veículo; Complete sua loja) e "Cadastrar primeiro veículo"; "Complete sua loja" fica completo com logo, capa, "Sobre a loja" e horário preenchidos; os primeiros passos somem quando os 3 estiverem completos.
- **PIX-FR-013** O lojista vê no painel o aviso de comprovante confirmado ou recusado (com o motivo).
- **PIX-FR-014** Assim que a loja fica ativa, o endereço público da loja (`/loja/{slug}`) passa a abrir; antes disso, não abre.

## Requisitos não funcionais
- **PIX-NFR-001** [5d], [6c], [10a], [12e], [5e] e [10b] funcionam em 390 px, com alvos de toque de pelo menos 44 px e campos com rótulo.
- **PIX-NFR-002** Nenhuma tela de pagamento ou de conferência é indexada nem entra no sitemap (`docs/SEO.md`).

## Requisitos de segurança e privacidade
- **PIX-SEC-001** O lojista da loja B nunca vê, envia nem substitui comprovante ou pagamento da loja A; o pagamento é sempre o da loja da sessão.
- **PIX-SEC-002** O comprovante é privado: não tem endereço público, só o admin, o suporte e o próprio lojista o veem, por um link que expira em minutos; só aceita JPG, PNG, WEBP, HEIC ou PDF de até 10 MB.
- **PIX-SEC-003** Só o admin confirma, recusa ou registra pagamento sem comprovante; o suporte vê a fila sem agir; lojista e usuário da loja não abrem [10b].
- **PIX-SEC-004** O valor esperado é calculado pelo sistema, nunca vem da tela do lojista; confirmar, recusar e registrar sem comprovante ficam no histórico de atividade (quem, loja, valor, referência, motivo).
- **PIX-SEC-005** O CPF ou CNPJ do lojista só aparece para ele mesmo (mascarado) e para o admin; nunca para quem indicou nem em página pública.
- **PIX-SEC-006** O usuário da loja não abre [5d], [6c] nem [12e] e não envia comprovante.
- **PIX-SEC-007** Um comprovante já conferido não pode ser conferido de novo: duas confirmações (ou confirmação e recusa) ao mesmo tempo resultam em uma só, e o segundo admin vê "Este comprovante já foi conferido."

## Critérios de aceite
### PIX-FR-001
- **Dado** um lojista com a loja "Silva Autocar" cadastrada e o plano de R$ 100/mês
- **Quando** ele abre [5d]
- **Então** vê "Plano Catálogo", "R$ 100/mês", "Silva Autocar", "vencimento no dia da 1ª confirmação", "Sem fidelidade" e "Você pode cancelar a assinatura a qualquer momento."
- **E** Pix é a única forma de pagamento
- **E** depois que o admin muda a mensalidade para R$ 120 em [4c], uma loja que abre [5d] vê R$ 120, e um comprovante já enviado continua esperando R$ 100

### PIX-FR-002
- **Dado** o lojista em [5d]
- **Quando** informa o CPF `111.111.111-11` (dígitos inválidos)
- **Então** vê "CPF inválido" e não segue
- **E** com um CPF ou CNPJ válido, "Pagar com Pix · R$ 100" leva a [6c]

### PIX-FR-003
- **Dado** uma loja indicada pelo código de um lojista com CNPJ `12.345.678/0001-95`
- **Quando** o lojista da loja indicada informa o mesmo CNPJ em [5d]
- **Então** a indicação fica "não válida" por autoindicação, visível só para o admin
- **E** o lojista segue para o Pix normalmente, sem aviso sobre a indicação
- **E** se quem indicou é um indicador ainda sem documento, a indicação continua "Cadastrada" e a comparação é feita quando ele informar o CPF

### PIX-FR-004
- **Dado** a chave Pix da CajuGo e o favorecido preenchidos nas regras e o prazo de conferência de 1 dia útil
- **Quando** o lojista abre [6c]
- **Então** vê R$ 100, a chave com "Copiar", o QR code com o valor de R$ 100, o favorecido, os passos e "Conferimos o comprovante em até 1 dia útil."
- **E** "Copiar" copia a chave
- **E** com a chave Pix vazia nas regras, [5d] mostra "O pagamento está indisponível no momento. Fale com a CajuGo." com o botão `wa.me` do suporte e o botão de pagar desabilitado, e [10b] mostra "Chave Pix não configurada"

### PIX-FR-005
- **Dado** o lojista em [6c] sem arquivo anexado
- **Quando** olha o botão "Enviar comprovante"
- **Então** ele está desabilitado
- **E** ao anexar uma foto ou um PDF, vê a pré-visualização, e o botão habilita quando o valor pago também está preenchido
- **E** um arquivo de mais de 10 MB mostra "O arquivo pode ter no máximo 10 MB." e não é anexado

### PIX-FR-006
- **Dado** o lojista em [6c] com o comprovante anexado
- **Quando** envia
- **Então** vê [10a] com "Comprovante recebido. Estamos conferindo." e o prazo
- **E** a loja está "pagamento em análise"
- **E** ao sair e entrar de novo, cai em [10a], sem opção de enviar outro comprovante

### PIX-FR-007
- **Dado** dois comprovantes enviados às 9h e às 10h e um confirmado hoje
- **Quando** o admin abre [10b]
- **Então** vê o das 9h antes do das 10h, cada um com loja, "1ª mensalidade", valor e horário
- **E** os totais "2 aguardando conferência" e "1 confirmado no mês"
- **E** abrir o arquivo mostra o comprovante sem expô-lo em endereço público

### PIX-FR-008
- **Dado** a 1ª mensalidade de R$ 100 e um comprovante enviado com valor pago de R$ 90
- **Quando** o admin abre [10b]
- **Então** esse comprovante mostra "Valor diferente do esperado"
- **E** um comprovante de R$ 100 não mostra o alerta
- **E** se o extrato mostra R$ 100, o admin corrige o valor pago para R$ 100 e confirma; o histórico guarda o valor informado e o corrigido

### PIX-FR-009
- **Dado** um comprovante em análise da loja "Silva Autocar", conferido em 26/11
- **Quando** o admin confirma
- **Então** a loja fica ativa, a 1ª mensalidade fica paga e o próximo vencimento é 26/12
- **E** uma loja confirmada em 31/01 vence em 28/02 (29/02 em ano bissexto) e depois em 31/03
- **E** o admin vê o botão `wa.me` para o WhatsApp da loja com a mensagem de confirmação pronta

### PIX-FR-010
- **Dado** um comprovante em análise de R$ 90 para a 1ª mensalidade de R$ 100
- **Quando** o admin recusa sem motivo
- **Então** vê "Informe o motivo" e nada muda
- **E** ao recusar com o motivo "Valor divergente", a loja volta a "cadastrada" e o lojista vê [12e] com "Valor divergente", o valor faltante de R$ 10 e o novo envio

### PIX-FR-011
- **Dado** uma loja cadastrada que pagou em dinheiro
- **Quando** o admin busca a loja em [10b] e registra o pagamento sem comprovante, com a forma "Dinheiro", o valor e uma observação
- **Então** a loja fica ativa e o próximo vencimento é definido, como na confirmação
- **E** o registro aparece no histórico de atividade com quem registrou

### PIX-FR-012
- **Dado** uma loja que acabou de ter o 1º pagamento confirmado e não tem veículos
- **Quando** o lojista entra
- **Então** vê "Assinatura ativa. Sua loja está no ar.", o link do catálogo, "Primeiros passos" com 1 de 3 completo e "Cadastrar primeiro veículo"
- **E** "Complete sua loja" só fica marcado com logo, capa, "Sobre a loja" e horário preenchidos (faltando um deles, continua pendente)
- **E** com os 3 passos completos, os primeiros passos não aparecem mais

### PIX-FR-013
- **Dado** um comprovante recusado com o motivo "Valor divergente"
- **Quando** o lojista abre o painel
- **Então** vê o aviso de recusa com "Valor divergente"
- **E** depois de uma confirmação, vê o aviso de comprovante confirmado

### PIX-FR-014
- **Dado** a loja "silva-autocar" cadastrada
- **Quando** um visitante abre `/loja/silva-autocar`
- **Então** a página não abre (não encontrada)
- **E** depois da confirmação do 1º pagamento, a mesma página abre com o nome da loja

### PIX-SEC-001
- **Dado** os lojistas A e B, cada um com sua loja cadastrada
- **Quando** B tenta enviar um comprovante para o pagamento de A ou abrir o comprovante de A
- **Então** não acessa nada de A (como se não existisse)
- **E** o comprovante de B fica sempre no pagamento da loja de B

### PIX-SEC-002
- **Dado** um comprovante enviado
- **Quando** alguém sem sessão de admin, suporte ou do próprio lojista tenta abrir o arquivo
- **Então** não consegue
- **E** o link que o admin usa para ver o arquivo deixa de funcionar depois de alguns minutos
- **E** um arquivo SVG, GIF ou HTML é recusado no envio

### PIX-SEC-003
- **Dado** um comprovante em análise
- **Quando** o suporte abre [10b]
- **Então** vê a fila, sem os botões Confirmar, Recusar nem Registrar pagamento
- **E** uma tentativa de confirmar pelo suporte, pelo lojista ou pelo usuário da loja é recusada (sem permissão)

### PIX-SEC-004
- **Dado** o lojista em [6c]
- **Quando** envia o comprovante adulterando o valor esperado na requisição
- **Então** o valor esperado continua o calculado pelo sistema (o lojista só informa o valor pago)
- **E** confirmar, recusar ou registrar sem comprovante grava no histórico quem fez, a loja, o valor, a referência e o motivo

### PIX-SEC-005
- **Dado** o lojista com CNPJ `12.345.678/0001-95`
- **Quando** ele vê os próprios dados
- **Então** vê o documento mascarado (ex.: `12.***.***/0001-95`)
- **E** quem indicou a loja e a página pública da loja não mostram o documento

### PIX-SEC-006
- **Dado** um usuário da loja conectado
- **Quando** tenta abrir [5d], [6c] ou [12e], ou enviar um comprovante
- **Então** vê "Sem permissão" ou o aviso da loja indisponível, e nada é enviado

### PIX-SEC-007
- **Dado** um comprovante em análise aberto por dois admins
- **Quando** o primeiro confirma e o segundo confirma ou recusa logo depois
- **Então** a loja é ativada uma vez só
- **E** o segundo vê "Este comprovante já foi conferido."

## Pendências
Respostas do `/clarify` (rodada 1, 2026-11-08): valor pago informado pelo lojista e corrigível pelo admin; mensalidade como regra editável em [4c]; autoindicação contra o documento já informado por quem indicou, sem aviso ao indicado; registro sem comprovante em [10b]; sem chave Pix, aviso em [5d] e em [10b]. Rodada 2: "Complete sua loja" = logo, capa, sobre e horário; vencimento nos dias 29–31 cai no último dia do mês que não tem esse dia.

Nenhuma.
