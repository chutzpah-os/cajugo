# CajuGo

Plataforma de veículos com três produtos sobre o mesmo estoque: Catálogo (lojistas), Rede Caju (vendedores) e vitrine CajuGo (compradores), mais o programa Caju Indica. Termos de produto em pt-BR; entre parênteses, o nome usado no código.

## Lojas e pessoas

**Loja** (`store`):
Revenda de veículos que assina o CajuGo; tem um catálogo próprio no endereço da loja (`cajugo.vercel.app/{slug}` no MVP; `{slug}.cajugo.com.br` depois).
_Evite_: concessionária, revenda, cliente

**Lojista** (`store_owner`):
Dono da loja; assina o plano e gerencia veículos, leads e dados da loja.
_Evite_: vendedor, anunciante, dealer

**Admin** (`admin`) e **Suporte** (`support`):
Equipe CajuGo; o Admin gerencia lojas, assinaturas e vitrine; o Suporte tem acesso de leitura e moderação.
_Evite_: moderador, operador

**Visitante**:
Qualquer pessoa navegando nos catálogos, sem conta.
_Evite_: comprador, usuário, cliente

**Usuário da loja** (`store_staff`):
Pessoa da equipe do lojista, com permissão de veículos e leads.

**Vendedor** (`seller`):
Pessoa independente da Rede Caju que divulga veículos da vitrine e ganha comissão das lojas parceiras. Não paga nada. Não use o termo para o lojista.
_Evite_: corretor, afiliado, revendedor

**Indicador** (`referrer`):
Pessoa que indica lojas no Caju Indica. Lojistas e vendedores também podem indicar.
_Evite_: afiliado, parceiro

**Conta** e **papéis**:
Uma conta (e-mail e senha) pode ter vários papéis (lojista, usuário da loja, vendedor, indicador, admin, suporte).

## Produtos e catálogos

**Catálogo** (produto):
Plano de assinatura da loja (Plano Catálogo, R$ 100/mês): catálogo próprio + vitrine + leads.


**Vitrine CajuGo** (`showcase`):
Catálogo central, na raiz do site (`cajugo.vercel.app`; depois `cajugo.com.br`), com os veículos que as lojas escolheram divulgar.
_Evite_: marketplace, catálogo geral, portal

**Catálogo da loja** (`store catalog`):
Página pública com todos os veículos publicados de uma loja.
_Evite_: vitrine da loja, site da loja, estoque público

**Divulgar na CajuGo** (`share_on_cajugo`):
Escolha do lojista, por veículo, de mostrá-lo também na Vitrine CajuGo.
_Evite_: impulsionar, destacar, anunciar

**Ocultar** (status `hidden`):
Ação do Admin (por denúncia ou moderação) que tira o veículo da Vitrine CajuGo e dos links de vendedor, mantendo-o no Catálogo da loja; a loja recebe o motivo.
_Evite_: bloquear, remover, banir

**Aprovação prévia**:
Fila em que o admin revisa veículos antes de publicar, quando a regra está ligada. Ações: aprovar ou pedir ajuste.

## Rede Caju

**Rede Caju**:
Canal de vendas com vendedores independentes aprovados pela CajuGo.

**Parceria** (`partnership`):
Vínculo entre um vendedor e uma loja; só com parceria ativa o vendedor ganha comissão daquela loja.

**Comissão** (`commission`):
Valor que a loja paga ao vendedor por uma venda: % do preço ou valor fixo, definido pela loja. Paga fora da plataforma.
_Evite_: bônus, repasse

**Taxa CajuGo**:
Percentual (1%) do valor final que a CajuGo cobra da loja por carro vendido via vendedor, lançado na fatura seguinte.
_Evite_: comissão CajuGo

**Venda** (`sale`):
Registro de um veículo vendido, com valor final e atribuição (vendedor do link, outro parceiro ou a própria loja).

**Link do vendedor**:
Link de um veículo com o código do vendedor (`?ref=`); leads vindos dele ficam marcados com o vendedor.

## Caju Indica

**Caju Indica**:
Programa de indicação de lojas: quem indica ganha 30% da mensalidade da loja indicada por até 3 meses. Não existe indicação de vendedor.

**Indicação** (`referral`):
Vínculo entre quem indicou e a loja indicada, criado pelo código ou link.

**Recompensa** (`reward`):
Valor mensal gerado por uma indicação ativa (R$ 30), creditado a quem indicou.

**Crédito** (Caju Indica):
Recompensa do lojista, abatida na fatura dele.

**Saldo** e **Resgate** (`payout`):
Recompensa de vendedor ou indicador acumulada; resgatada por Pix a partir de R$ 50, paga pelo admin.

**Campanha**:
Link de indicação do admin, sem recompensa, para medir origem de cadastros.

## Veículos

**Veículo** (`vehicle`):
Carro cadastrado por uma loja, com fotos, ficha, preço e status.
_Evite_: anúncio, listing, carro (no código)

**Status do veículo**:
`rascunho` (`draft`), `pendente de aprovação` (`pending_approval`), `publicado` (`published`), `oculto` (`hidden`), `vendido` (`sold`), `excluído` (`deleted`).
_Evite_: ativo, pausado, inativo

**Final de placa** (`plate_end`):
Último dígito da placa, o único dado da placa que aparece em público.

**Parcela estimada**:
Valor mensal calculado com entrada, prazo e taxa configurados pelo Admin; é uma estimativa, não uma simulação de banco.
_Evite_: financiamento, simulação

## Contato e cobrança

**Lead** (`lead`):
Contato de um visitante com uma loja sobre um veículo, pelo formulário ou pelo WhatsApp.
_Evite_: mensagem, contato, oportunidade

**Origem do lead** (`origin`):
Por onde o visitante chegou: Vitrine CajuGo (`cajugo`) ou Catálogo da loja (`store_catalog`).

**Denúncia** (`report`):
Aviso sobre um anúncio suspeito (de qualquer pessoa, anônimo para a loja) ou sobre um vendedor (do lojista), revisado pelo admin.

**Plano Catálogo** (`plan`):
O único plano do MVP: R$ 100/mês, sem fidelidade.

**Comprovante**:
Arquivo (foto ou PDF) do Pix pago, enviado pelo lojista e conferido pelo admin no extrato.

**Pagamento** (`payment`):
Envio de um comprovante para uma fatura: enviado → confirmado ou recusado (com motivo).

**Assinatura** (`subscription`):
Vínculo pago da loja com o Plano Catálogo; o status dela decide se a loja fica no ar.
_Evite_: contrato, mensalidade (para a assinatura em si)

**Fatura** (`invoice`):
Cobrança de um mês: mensalidade + taxas CajuGo − crédito Caju Indica.
_Evite_: boleto, conta

**Status da loja**:
`cadastrada`, `pagamento_em_analise`, `ativa`, `em_atraso`, `suspensa`, `cancelamento_agendado`, `cancelada`, `arquivada` (código: `registered`, `payment_review`, `active`, `past_due`, `suspended`, `cancel_scheduled`, `canceled`, `archived`).
_Evite_: bloqueada, inativa

**Config**:
Regras numéricas editáveis pelo admin (chave Pix, prazos, taxas, mínimos). Nada disso fica fixo no código.

**Favorito** e **Alerta de busca**:
Veículo salvo pelo comprador; pedido "Avisar quando chegar" para uma busca sem resultado.

**Senha temporária**:
Senha gerada pelo Admin para o lojista entrar quando esqueceu a dele; obriga a troca no próximo login.
