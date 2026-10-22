# CajuGo

SaaS de catálogo de veículos para lojistas: cada loja assinante tem um catálogo próprio e pode divulgar seus veículos na vitrine central CajuGo. Termos de produto em pt-BR; entre parênteses, o nome usado no código.

## Lojas e pessoas

**Loja** (`store`):
Revenda de veículos que assina o CajuGo; tem um catálogo próprio num endereço `cajugo.com.br/{slug}`.
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

**Vendedor**:
Pessoa que indica clientes e ganha comissão. Só na fase 2; não use o termo para o lojista.

## Catálogos

**Vitrine CajuGo** (`showcase`):
Catálogo central em `cajugo.com.br` com os veículos que as lojas escolheram divulgar.
_Evite_: marketplace, catálogo geral, portal

**Catálogo da loja** (`store catalog`):
Página pública com todos os veículos publicados de uma loja.
_Evite_: vitrine da loja, site da loja, estoque público

**Divulgar na CajuGo** (`share_on_cajugo`):
Escolha do lojista, por veículo, de mostrá-lo também na Vitrine CajuGo.
_Evite_: impulsionar, destacar, anunciar

**Ocultar** (`hidden_by_admin`):
Ação do Admin que tira um veículo só da Vitrine CajuGo, mantendo-o no Catálogo da loja.
_Evite_: bloquear, remover, banir

## Veículos

**Veículo** (`vehicle`):
Carro cadastrado por uma loja, com fotos, ficha, preço e status.
_Evite_: anúncio, listing, carro (no código)

**Status do veículo**:
`rascunho` (`draft`), `publicado` (`published`), `vendido` (`sold`), `excluído` (`deleted`).
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
Aviso de um visitante sobre um anúncio suspeito, revisado pelo Admin ou pelo Suporte.

**Plano Catálogo** (`plan`):
O único plano do MVP: R$ 100/mês, sem fidelidade.

**Assinatura** (`subscription`):
Vínculo pago da loja com o Plano Catálogo; o status dela decide se a loja fica no ar.
_Evite_: contrato, mensalidade (para a assinatura em si)

**Fatura** (`invoice`):
Cobrança de um mês da assinatura.
_Evite_: boleto, conta

**Senha temporária**:
Senha gerada pelo Admin para o lojista entrar quando esqueceu a dele; obriga a troca no próximo login.
