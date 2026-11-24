---
id: 011
slug: billing-cycle
title: Fatura mensal, atraso e suspensão
status: implemented
owner: dono do produto
created: 2026-11-20
---

# 011 · Fatura mensal, atraso e suspensão

## Contexto
A 004 cobra só a 1ª mensalidade e ativa a loja. Daí em diante nada cobra a loja, nada a suspende por atraso e nada a reativa. Esta spec fecha o ciclo da assinatura (PRD §5.1, §5.2 e §5.6):
- a **fatura mensal** [10c]: mensalidade + taxas CajuGo das vendas via vendedor do período − crédito Caju Indica;
- o aviso de vencimento;
- o **atraso**, a **suspensão** depois da tolerância e a **reativação** quando o pagamento é confirmado;
- a Conta do lojista [3c] e a tela Assinaturas do admin [4b].

O pagamento usa a mesma fila de comprovantes da 004 [6c, 10b].

Sucesso: uma loja que não paga até o fim da tolerância sai do ar sozinha, e volta no momento em que o admin confirma o comprovante, sem ninguém mexer no status à mão.

## Atores
- **Lojista**: paga a fatura e vê a Conta e o histórico de faturas.
- **Admin**: confere comprovantes [10b], acompanha as assinaturas [4b], suspende e reativa.
- **Suporte**: vê [4b] e avisa pelo `wa.me`, sem suspender nem reativar (PRD §2.1).
- **Visitante**: vê o catálogo da loja suspensa como "Catálogo temporariamente indisponível" [12g].
- **Job diário**: vencimentos, atraso e suspensão.

## Fora de escopo
- Cancelar assinatura e desfazer [12h], fim do período (cancelada), arquivamento depois de 90 dias, liberação do endereço sem 1º pagamento em 7 dias e **Editar plano** com aviso de 30 dias [4b] (spec **011b**, dividida no `/clarify` de 2026-11-20).
- Crédito Caju Indica (spec **010**): até lá, o crédito da fatura é sempre R$ 0.
- Usuários da loja na Conta [3c] (PRD §12.1, item 3; spec 012).
- Recibo e nota fiscal (fora do sistema no MVP); gateway e cobrança automática (fase 2).

## Requisitos funcionais
- **SUB-FR-001** Para cada loja ativa, em atraso ou suspensa, a fatura do mês é aberta 3 dias antes do vencimento, com a mensalidade das regras, as taxas CajuGo das vendas via vendedor confirmadas até a abertura e ainda não faturadas (e não desfeitas), o crédito Caju Indica (R$ 0 até a 010), o total e o vencimento no dia de cobrança da loja.
- **SUB-FR-002** A fatura do mês [10c] mostra mensalidade, cada taxa CajuGo (veículo, data e valor), crédito, total, vencimento, status e **Pagar com Pix**, que leva a [6c] com o valor da fatura.
- **SUB-FR-003** O comprovante da fatura mensal entra na mesma fila de conferência [10b], com a referência "Mensalidade mm/aaaa"; enquanto é conferido, a loja continua no status em que estava.
- **SUB-FR-004** Ao **Confirmar** o comprovante da fatura mensal, a fatura fica paga, o próximo vencimento passa para o mesmo dia do mês seguinte (último dia do mês quando ele não existe) e a loja em atraso ou suspensa volta a **ativa**.
- **SUB-FR-005** Ao **Recusar** o comprovante da fatura mensal, o lojista vê [12e] com o motivo e o valor faltante, e a loja segue no status em que estava (no ar até o fim da tolerância).
- **SUB-FR-006** Três dias antes do vencimento, o lojista vê no painel o aviso "Sua fatura vence em dd/mm · R$ X" com **Pagar agora**, e o admin vê a loja na lista de vencimentos com o botão `wa.me` para avisar.
- **SUB-FR-007** No dia seguinte ao vencimento sem pagamento confirmado, a loja passa a **em atraso**: catálogo e vitrine continuam no ar e o painel mostra o alerta da fatura com os dias de atraso e **Pagar agora** (com um comprovante em conferência, o alerta de vencimento e o de atraso não aparecem; o de loja suspensa, sim).
- **SUB-FR-008** Passada a tolerância das regras (5 dias) sem pagamento confirmado, a loja passa a **suspensa**: catálogo e veículos saem do ar para o público ([12g], sem expor o motivo), os dados ficam guardados e o lojista continua editando.
- **SUB-FR-009** O lojista de loja suspensa vê [12f]: alerta com os dias de atraso e o valor, e **Pagar agora** → [6c]; o resto do painel continua aberto.
- **SUB-FR-010** A Conta do lojista [3c] mostra o Plano Catálogo, o status da assinatura, o valor, a próxima cobrança, **Como pagar** (chave Pix da CajuGo e WhatsApp do suporte), a fatura do mês e as faturas anteriores (mês, valor, status), além do bloco Rede Caju da 009.
- **SUB-FR-011** A tela Assinaturas do admin [4b] mostra o MRR, as contagens Em dia, Atrasadas e Suspensas, o card do plano e os filtros Todas, Em dia, Atrasadas, Suspensas.
- **SUB-FR-012** Em [4b], cada loja mostra dono, desde quando assina, selo e a linha do status: em dia "Próxima cobrança dd/mm · R$ X" + **Detalhes**; em atraso "Em atraso N dias · R$ X" + `wa.me` + **Suspender**; em análise "Comprovante enviado dd/mm" + **Conferir** (→ [10b]); suspensa "Catálogo e vitrine · Fora do ar" + **Reativar**.
- **SUB-FR-013** O admin suspende uma loja em atraso antes do fim da tolerância com **Suspender** (confirmação de [6f]) e reativa uma loja suspensa com **Reativar**, informando o motivo; reativada sem pagamento, a fatura continua aberta e a loja volta a **em atraso** (o job suspende de novo depois da tolerância, contada da reativação); sem fatura vencida em aberto, volta a **ativa**.
- **SUB-FR-014** A taxa CajuGo de uma venda entra em uma fatura só uma vez; a venda desfeita antes de entrar numa fatura não entra; desfeita com a fatura ainda aberta, a taxa sai dela e o total é recalculado; desfeita com a fatura já paga, a taxa volta como crédito na próxima fatura.
- **SUB-FR-017** O comprovante só quita a fatura com o valor total em aberto; com valor menor, o admin recusa com o valor faltante (SUB-FR-005); com valor maior, a sobra vira crédito na próxima fatura.
- **SUB-FR-016** Com mais de uma fatura em aberto (atraso de mais de um mês), cada mês tem a sua; [6c] cobra o total em aberto e o comprovante confirmado quita da mais antiga para a mais nova; a loja só volta a ativa com todas as vencidas pagas (a fatura aberta que ainda não venceu não a segura fora do ar).
- **SUB-FR-015** O lojista e o admin veem no painel o aviso quando a loja é suspensa e quando é reativada.

## Requisitos não funcionais
- **SUB-NFR-001** [10c], [3c], [12f] e [4b] funcionam em 390 px e em 1280 px, com alvos de toque de pelo menos 44 px.
- **SUB-NFR-002** O job diário processa vencimentos, atrasos e suspensões de todas as lojas em uma execução, e rodar de novo no mesmo dia não cria fatura nem aviso repetidos.
- **SUB-NFR-003** A loja suspensa sai do ar para o público, e a reativada volta, em até 60 segundos depois da mudança de status.

## Requisitos de segurança e privacidade
- **SUB-SEC-001** O lojista B não vê nem paga a fatura, as taxas ou o histórico da loja A.
- **SUB-SEC-002** Valores da fatura (mensalidade, taxas, crédito, total) são calculados no servidor; o lojista só informa o valor pago no comprovante.
- **SUB-SEC-003** Só o admin suspende e reativa; o suporte vê [4b] e usa o `wa.me`; o usuário da loja não vê a fatura nem a Conta; vendedor, indicador e suporte não suspendem nem reativam.
- **SUB-SEC-004** Abertura de fatura, suspensão, reativação (automática ou pelo admin) e confirmação do pagamento ficam no registro de atividade.
- **SUB-SEC-005** A página pública da loja suspensa não mostra o motivo, o valor nem os dias de atraso.

## Critérios de aceite
### SUB-FR-001
- **Dado** a loja A ativa com cobrança todo dia 10, mensalidade de R$ 100 e uma venda via vendedor de R$ 50.000 com taxa de R$ 500 no período
- **Quando** a fatura do mês é aberta no dia 7
- **Então** ela tem mensalidade R$ 100, taxa R$ 500, crédito R$ 0 e total R$ 600, com vencimento no dia 10

### SUB-FR-002
- **Dado** a fatura de R$ 600 da loja A
- **Quando** o lojista abre [10c]
- **Então** vê a mensalidade, a taxa com o veículo e a data, o total e **Pagar com Pix**, que abre [6c] com R$ 600

### SUB-FR-003
- **Dado** a loja A ativa que envia o comprovante da fatura de novembro
- **Quando** o admin abre [10b]
- **Então** vê o comprovante com "Mensalidade 11/2026"
- **E** a loja A continua ativa enquanto ele confere

### SUB-FR-004
- **Dado** a loja A suspensa por atraso, com vencimento dia 10
- **Quando** o admin confirma o comprovante da fatura
- **Então** a loja A volta a ativa, o catálogo volta ao ar e o próximo vencimento é o dia 10 do mês seguinte

### SUB-FR-005
- **Dado** a loja A em atraso com um comprovante de R$ 500 para uma fatura de R$ 600
- **Quando** o admin recusa com "Valor divergente"
- **Então** o lojista vê [12e] com o motivo e "Faltam R$ 100"
- **E** a loja continua em atraso

### SUB-FR-006
- **Dado** a loja A com fatura vencendo dia 10
- **Quando** chega o dia 7
- **Então** o lojista vê "Sua fatura vence em 10/12 · R$ 600" e o admin vê a loja na lista de vencimentos com `wa.me`

### SUB-FR-007
- **Dado** a loja A com fatura vencida no dia 10 e sem pagamento confirmado
- **Quando** o job roda no dia 11
- **Então** a loja fica em atraso, continua no ar e o painel mostra "Fatura em atraso há 1 dia"

### SUB-FR-008
- **Dado** a loja A em atraso desde o dia 11, com tolerância de 5 dias
- **Quando** o job roda no dia 16
- **Então** a loja fica suspensa e o catálogo mostra "Catálogo temporariamente indisponível"
- **E** os veículos saem da vitrine

### SUB-FR-009
- **Dado** a loja A suspensa
- **Quando** o lojista abre o painel
- **Então** vê "Loja suspensa · 6 dias de atraso · R$ 600" com **Pagar agora**
- **E** ainda consegue editar um veículo

### SUB-FR-010
- **Dado** a loja A ativa com uma fatura paga e a do mês aberta
- **Quando** o lojista abre a Conta
- **Então** vê o plano, "Ativa", a próxima cobrança, Como pagar, a fatura do mês e a anterior como paga

### SUB-FR-011
- **Dado** 3 lojas em dia, 1 em atraso e 1 suspensa, a R$ 100
- **Quando** o admin abre [4b]
- **Então** vê MRR de R$ 500 e as contagens 3 · 1 · 1

### SUB-FR-012
- **Dado** a loja B em atraso há 2 dias
- **Quando** o admin filtra "Atrasadas"
- **Então** vê a loja B com "Em atraso 2 dias · R$ 100", `wa.me` e **Suspender**

### SUB-FR-013
- **Dado** a loja B em atraso
- **Quando** o admin toca em **Suspender** e confirma
- **Então** a loja B fica suspensa e sai do ar
- **E** **Reativar** com o motivo "Acordo de pagamento" a devolve ao ar, em atraso, com a fatura ainda aberta

### SUB-FR-017
- **Dado** a fatura de R$ 600 da loja A
- **Quando** o admin confirma um comprovante corrigido para R$ 650
- **Então** a fatura fica paga e a próxima tem um crédito de R$ 50
- **E** com R$ 550, o admin recusa com "Faltam R$ 50"

### SUB-FR-014
- **Dado** uma venda via vendedor confirmada no dia 5 e desfeita no dia 6
- **Quando** a fatura do mês é aberta no dia 10
- **Então** a taxa dessa venda não entra
- **E** uma taxa já cobrada não entra de novo na fatura seguinte

### SUB-FR-014 (desfeita depois)
- **Dado** a taxa de R$ 500 de uma venda na fatura de dezembro, ainda aberta
- **Quando** a venda é desfeita
- **Então** a fatura de dezembro passa a ter só a mensalidade
- **E** se a fatura de dezembro já estivesse paga, a de janeiro teria um crédito de R$ 500

### SUB-FR-016
- **Dado** a loja A suspensa com as faturas de novembro e dezembro abertas, de R$ 100 cada
- **Quando** o lojista abre [6c] e o admin confirma um comprovante de R$ 200
- **Então** [6c] cobra R$ 200 e as duas faturas ficam pagas, da mais antiga para a mais nova
- **E** com um comprovante de R$ 100, só novembro é paga e a loja continua suspensa

### SUB-FR-015
- **Dado** a loja A que foi suspensa pelo job
- **Quando** o lojista abre o painel
- **Então** vê o aviso "Sua loja foi suspensa por falta de pagamento"
- **E** depois da reativação vê "Pagamento confirmado. Sua loja está no ar."

### SUB-SEC-001
- **Dado** o lojista B logado
- **Quando** tenta abrir ou pagar a fatura da loja A
- **Então** recebe "não encontrado" e nada muda

### SUB-SEC-002
- **Dado** o lojista A que envia um total, uma taxa ou um crédito junto com o comprovante
- **Quando** o servidor recebe
- **Então** esses campos são recusados e a fatura usa o cálculo do servidor

### SUB-SEC-003
- **Dado** um usuário da loja, um vendedor e o suporte logados
- **Quando** tentam suspender ou reativar uma loja
- **Então** veem "Sem permissão" e nada muda
- **E** o usuário da loja não abre a Conta nem a fatura

### SUB-SEC-004
- **Dado** a loja A suspensa pelo job e reativada pelo admin
- **Quando** se consulta o registro de atividade
- **Então** há os registros da suspensão (pelo sistema) e da reativação (com o admin)

### SUB-SEC-005
- **Dado** a loja A suspensa por atraso
- **Quando** um visitante abre `/loja/{slug}`
- **Então** vê "Catálogo temporariamente indisponível" sem motivo, valor ou dias de atraso

## Pendências
Nenhuma. No `/verify` de 2026-11-23: volta a ativa sem fatura vencida (SUB-FR-016), reativar sem nada vencido → ativa (SUB-FR-013), sem alerta de cobrança com comprovante em conferência (SUB-FR-007). Resolvidas no `/clarify` de 2026-11-23: divisão com a 011b (cancelamento, arquivamento, liberação do endereço, Editar plano), fatura aberta 3 dias antes do vencimento, taxa de venda desfeita (sai da fatura aberta ou vira crédito), faturas separadas quitadas da mais antiga, reativar sem pagamento com motivo, suporte consulta e avisa, fatura só quita com o total (sobra vira crédito).
