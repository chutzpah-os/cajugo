---
id: 005
slug: vehicles
title: Veículos do lojista
status: implemented
owner: dono do produto
created: 2026-11-08
---

# 005 · Veículos do lojista

## Contexto
O veículo é o centro do produto: o mesmo registro aparece no catálogo da loja, na vitrine CajuGo e nos links de vendedor (PRD §5.5). Aqui o lojista cadastra o veículo no celular em poucos minutos [2a], acompanha o estoque [1c], edita [6e] e marca como vendido [6f]. A spec 004 deixou pronto o caminho: "Cadastrar primeiro veículo" já leva a [2a], e os primeiros passos [5e] esperam o primeiro veículo.
Sucesso: um lojista publica um veículo completo, com fotos, em até 5 minutos no celular; vendido sai de todos os lugares em segundos.

## Atores
- **Lojista** (store_owner) e **usuário da loja** (store_staff): cadastram, editam, publicam, marcam como vendido e excluem veículos da própria loja (AUT-SEC-007).
- **Visitante**: vê no catálogo da loja só os veículos publicados de loja no ar (a página do veículo [1b] é da spec 006).

## Fora de escopo
- Aprovação prévia [14c] (fila, checagens automáticas, aprovar, pedir ajuste, estado "pendente de aprovação", aviso à loja): spec **005b**, logo depois desta. A regra vem desligada por padrão (PRD §5.12), então aqui "Publicar" publica direto.
- Dados de exemplo (antiga F12): não existem, nem no staging nem no prod. A vitrine começa com as lojas reais; os testes automáticos criam e apagam os próprios veículos.
- Tela do admin para recuperar veículo excluído (spec 012) e apagamento definitivo depois de 90 dias (rotinas da spec 011).
- Página pública do veículo [1b], vitrine [1a], filtros [6d], selo "Baixou R$ X" e catálogo completo da loja (spec 006). Aqui o catálogo `/loja/{slug}` passa a listar os veículos publicados de forma simples.
- Leads e o aviso "leads abertos viram Perdido" ao vender (spec 007); visualizações (spec 006) e leads (spec 007) no desempenho do anúncio [6e], que aqui mostra só "Dias no ar".
- Venda com vendedor da Rede Caju [7g] e comissão (spec 009): aqui "Vendido" é a venda feita pela própria loja.
- Ocultar veículo pelo admin, denúncias [14d]/[14e] (spec 007) e lista "Veículos CajuGo" do admin [1d] (spec 012).
- Busca de dados pela placa (fase 2, PRD §9).

## Requisitos funcionais
- **VEH-FR-001** Meus veículos [1c] mostra os indicadores Publicados, Na CajuGo e Vendidos no mês, o card da assinatura (plano, valor, status, próxima cobrança), a busca por modelo ou placa e os filtros com contagem (Todos, Publicados, Rascunhos, Vendidos).
- **VEH-FR-002** Cada veículo da lista mostra miniatura, nome, selo de status, ano · km, preço, o toggle "Divulgar na CajuGo" com a legenda do estado, "Vendido" (se não vendido) e "Editar"; sem veículos, aparece o estado vazio com "Cadastrar primeiro veículo".
- **VEH-FR-003** O lojista cadastra um veículo [2a] com as seções Fotos, Identificação, Ficha técnica, Preço, Condições, Itens, Descrição e Divulgação; o que ele preenche é salvo sozinho como rascunho ("Rascunho salvo") e nada se perde ao fechar e voltar.
- **VEH-FR-004** O lojista envia até 20 fotos por veículo, com barra de progresso, reordena arrastando no computador ou pelas setas, que funcionam em qualquer aparelho (a primeira é a capa) e remove fotos; as fotos são reduzidas no celular antes do envio.
- **VEH-FR-005** Na Identificação, marca, modelo e versão vêm da lista da tabela FIPE guardada pela CajuGo (cada uma dependente da anterior), o ano modelo fica entre o ano de fabricação e o ano seguinte, e a placa (formato Mercosul ou antigo) é guardada para a loja, com o final de placa derivado dela.
- **VEH-FR-006** Ficha técnica, condições (Sim/Não), itens (com contador "N selecionados") e descrição (até 2.000 caracteres, com contador) seguem as listas e limites do PRD [2a].
- **VEH-FR-007** O preço de venda é obrigatório e mostra a referência FIPE da versão (atualizada uma vez por mês) com a diferença percentual ("4,6% abaixo"), quando houver referência; o lojista escolhe se exibe a parcela estimada.
- **VEH-FR-008** "Divulgar na CajuGo" vem marcado conforme a preferência da loja (spec 003) e o contato do anúncio vem com o WhatsApp da loja; ambos podem ser trocados por veículo.
- **VEH-FR-009** "Publicar" só funciona com pelo menos 1 foto, marca, modelo, versão, anos, quilometragem, câmbio, combustível e preço; faltando algo, cada campo mostra o que falta e o veículo continua rascunho.
- **VEH-FR-010** Veículo publicado de loja no ar aparece no catálogo da loja; a loja ainda não ativada (cadastrada ou em análise) também pode publicar, e os veículos aparecem quando ela for ativada; se também estiver "Divulgar na CajuGo", fica disponível para a vitrine (spec 006). O toggle fica desabilitado em rascunho e vendido, com as legendas "Visível na vitrine CajuGo", "Só no seu catálogo", "Publique para liberar" e "Removido de todos os catálogos".
- **VEH-FR-011** Editar veículo [6e] mostra o resumo (miniatura, nome, ano · km · preço, selos), "Dias no ar", as seções com "Editar" e o toggle de divulgação; alterações num veículo publicado valem no catálogo na hora.
- **VEH-FR-012** Toda mudança de preço de um veículo publicado fica registrada no histórico de preço do veículo (valor anterior, novo valor, quando).
- **VEH-FR-013** "Marcar como vendido" [6f] pede confirmação, tira o veículo do catálogo, da vitrine e dos links de vendedor na hora, desliga a divulgação e pode ser desfeito em até 7 dias (o veículo volta a publicado, com a divulgação como estava antes da venda).
- **VEH-FR-014** "Despublicar" volta o veículo a rascunho (sai do catálogo) e "Excluir veículo" pede confirmação e o remove de todas as listas da loja e do público, sem volta para o lojista (o admin consegue recuperar por 90 dias).
- **VEH-FR-015** Os primeiros passos [5e] marcam "Cadastre seu primeiro veículo" quando a loja tem o primeiro veículo publicado, e somem com os 3 passos completos.

## Requisitos não funcionais
- **VEH-NFR-001** [1c], [2a], [6e] e os diálogos [6f] funcionam em 390 px, com alvos de toque de pelo menos 44 px e campos com rótulo.
- **VEH-NFR-002** Cada foto enviada fica com no máximo 1.600 px no maior lado, e o catálogo mostra as fotos em tamanho adequado à tela (miniatura, card e tela cheia).
- **VEH-NFR-004** O formulário [2a] funciona mesmo se a fonte da tabela FIPE estiver fora do ar: as listas e as referências já guardadas continuam valendo, e só a atualização fica para depois.
- **VEH-NFR-003** Marcar como vendido, despublicar ou excluir tira o veículo do catálogo público em até 60 segundos (PRD §5.3: cache visível ≤ 60 s).

## Requisitos de segurança e privacidade
- **VEH-SEC-001** A loja B nunca vê, edita, publica, vende nem exclui veículo da loja A, nem envia foto para veículo da loja A.
- **VEH-SEC-002** A placa e o chassi nunca aparecem em página pública; o público vê só o final de placa.
- **VEH-SEC-003** As fotos públicas não guardam metadados do arquivo original (localização GPS, aparelho, data); só aceitam JPG, PNG, WEBP ou HEIC de até 15 MB; arquivo recusado não fica guardado.
- **VEH-SEC-004** Veículo em rascunho, vendido ou excluído, ou de loja fora do ar, não aparece em nenhuma página pública.
- **VEH-SEC-005** Publicar, despublicar, marcar como vendido, desfazer venda, excluir e mudar preço ficam no histórico de atividade (quem, veículo, o que mudou).

## Critérios de aceite
### VEH-FR-001
- **Dado** uma loja ativa com 3 publicados (2 divulgados na CajuGo), 1 rascunho e 1 vendido neste mês
- **Quando** o lojista abre [1c]
- **Então** vê Publicados 3, Na CajuGo 2, Vendidos no mês 1 e os filtros Todos (5), Publicados (3), Rascunhos (1), Vendidos (1)
- **E** buscar "onix" ou o final "1234" da placa mostra só os veículos correspondentes

### VEH-FR-002
- **Dado** um veículo publicado e divulgado
- **Quando** o lojista vê o card
- **Então** vê miniatura, nome, "Publicado", ano · km, preço, o toggle ligado com "Visível na vitrine CajuGo", "Vendido" e "Editar"
- **E** uma loja sem veículos vê "Cadastrar primeiro veículo"

### VEH-FR-003
- **Dado** o lojista em [2a] que preencheu marca, modelo e preço
- **Quando** fecha a tela e volta pelo rascunho em [1c]
- **Então** os campos preenchidos continuam lá e aparece "Rascunho salvo"

### VEH-FR-004
- **Dado** um veículo com 20 fotos
- **Quando** o lojista tenta adicionar a 21ª
- **Então** vê que o limite é 20 e a foto não é enviada
- **E** ao arrastar a 3ª foto para o início, ela vira a capa no card e no catálogo

### VEH-FR-005
- **Dado** o lojista escolhendo a marca "Chevrolet"
- **Quando** abre o campo Modelo
- **Então** só vê modelos da Chevrolet, a Versão só fica disponível depois do modelo e o Ano modelo depois da versão (é a ordem da tabela FIPE)
- **E** ano de fabricação 2020 com ano modelo 2022 mostra o erro do ano modelo
- **E** com a fonte da FIPE fora do ar, as listas continuam aparecendo com o que já estava guardado
- **E** a placa "ABC1D23" é aceita e o final de placa fica "3"

### VEH-FR-006
- **Dado** o lojista na descrição
- **Quando** digita mais de 2.000 caracteres
- **Então** o contador mostra o limite e o texto não passa de 2.000
- **E** marcar 3 itens mostra "3 selecionados"

### VEH-FR-007
- **Dado** um veículo com referência de mercado de R$ 80.000
- **Quando** o lojista informa o preço de R$ 76.320
- **Então** vê "4,6% abaixo"
- **E** sem referência para a versão, o preço continua obrigatório e nenhum percentual aparece

### VEH-FR-008
- **Dado** uma loja com "Divulgar novos veículos" desligado e WhatsApp (79) 3211-0000
- **Quando** o lojista cria um veículo
- **Então** o toggle vem desligado e o contato vem com (79) 3211-0000
- **E** trocar o contato num veículo não muda o WhatsApp da loja

### VEH-FR-009
- **Dado** um rascunho sem fotos e sem preço
- **Quando** o lojista toca em "Publicar"
- **Então** vê o aviso em Fotos e em Preço e o veículo continua rascunho
- **E** com tudo preenchido, o veículo fica publicado

### VEH-FR-010
- **Dado** um veículo publicado e divulgado de uma loja ativa
- **Quando** um visitante abre o catálogo da loja
- **Então** vê o veículo
- **E** num rascunho, o toggle está desabilitado com "Publique para liberar"
- **E** uma loja cadastrada que publica um veículo não o mostra no catálogo; quando o 1º pagamento é confirmado, ele aparece sem o lojista fazer nada

### VEH-FR-011
- **Dado** um veículo publicado
- **Quando** o lojista abre [6e], vê há quantos dias o veículo está publicado ("Dias no ar"), muda a quilometragem e salva
- **Então** o catálogo mostra a quilometragem nova

### VEH-FR-012
- **Dado** um veículo publicado a R$ 80.000
- **Quando** o lojista muda o preço para R$ 75.000
- **Então** o histórico do veículo guarda R$ 80.000 → R$ 75.000 com a data
- **E** mudar o preço de um rascunho não gera histórico

### VEH-FR-013
- **Dado** um veículo publicado e divulgado
- **Quando** o lojista confirma "Marcar como vendido"
- **Então** o veículo sai do catálogo e da vitrine, a divulgação fica desligada e o card mostra "Removido de todos os catálogos"
- **E** em até 7 dias, "Desfazer venda" volta o veículo a publicado e divulgado, como estava; depois de 7 dias, a opção não aparece

### VEH-FR-014
- **Dado** um veículo publicado
- **Quando** o lojista despublica
- **Então** ele volta a rascunho e sai do catálogo
- **E** ao confirmar "Excluir veículo", ele some de [1c] e de qualquer página pública, e o lojista não tem como restaurá-lo
- **E** os dados do veículo excluído continuam guardados por 90 dias para o admin

### VEH-FR-015
- **Dado** uma loja recém-ativada sem veículos
- **Quando** publica o primeiro veículo
- **Então** os primeiros passos mostram 2 de 3 com "Cadastre seu primeiro veículo" feito

### VEH-SEC-001
- **Dado** os lojistas A e B, com um veículo cada
- **Quando** B tenta abrir, editar, publicar, vender, excluir ou enviar foto para o veículo de A (pelo endereço ou pela ação)
- **Então** não acessa nada de A (como se não existisse) e o veículo de A não muda

### VEH-SEC-002
- **Dado** um veículo publicado com placa "ABC1D23"
- **Quando** um visitante abre o catálogo da loja
- **Então** não encontra "ABC1D23" nem o chassi em nenhum lugar da página; só o final "3", se exibido

### VEH-SEC-003
- **Dado** uma foto tirada no celular com localização GPS
- **Quando** é enviada e publicada
- **Então** a foto que o público recebe não tem a localização nem os dados do aparelho
- **E** um arquivo SVG, GIF ou acima de 15 MB é recusado e não fica guardado

### VEH-SEC-004
- **Dado** uma loja com um rascunho, um vendido, um excluído e um publicado
- **Quando** um visitante abre o catálogo
- **Então** vê só o publicado
- **E** com a loja suspensa ou cadastrada, não vê nenhum

### VEH-SEC-005
- **Dado** um lojista que muda o preço, marca como vendido e desfaz
- **Quando** o admin consulta o histórico de atividade
- **Então** encontra as três ações com quem fez, o veículo e os valores

## Pendências
Respostas do `/clarify` (rodada 1, 2026-11-08): FIPE pela API pública gratuita, copiada para o banco da CajuGo (listas sincronizadas, preço por versão uma vez por mês); aprovação prévia [14c] na spec 005b; loja não ativada pode publicar e os veículos aparecem na ativação; excluir é definitivo para o lojista e o admin recupera por 90 dias; nenhum dado de exemplo em ambiente nenhum. Rodada 2: desfazer venda volta a divulgação como estava; [6e] mostra só "Dias no ar" (visualizações na 006, leads na 007).

Nenhuma.
