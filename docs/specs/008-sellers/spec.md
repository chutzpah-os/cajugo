---
id: 008
slug: sellers
title: Rede Caju · vendedor
status: implemented
owner: dono do produto
created: 2026-11-16
---

# 008 · Rede Caju · vendedor

## Contexto
A Rede Caju deixa vendedores independentes divulgarem a vitrine inteira e ganharem comissão das lojas parceiras (PRD §5.7). Esta spec cobre o lado do vendedor e a curadoria. O vendedor se cadastra [7a] e a CajuGo aprova ou bloqueia [7h]. Aprovado, ele usa o painel [7b], a vitrine com o link de cada veículo [7c] e a conta [13c]. O extrato [7d] fica na 008b, junto da Confirmar venda da 009 (dividida no `/clarify` de 2026-11-16). Sucesso: um vendedor aprovado compartilha o link de um veículo e o contato que vem dele aparece para a loja como "via vendedor {nome}".

## Atores
- **Visitante** (não autenticado): se cadastra como vendedor.
- **Vendedor** (Rede Caju): em análise, ativo ou bloqueado.
- **Admin**: aprova, bloqueia e desbloqueia vendedores.
- **Suporte**: consulta [7h], sem decidir (PRD §2.1).
- **Lojista** e **usuário da loja**: veem os leads marcados com o vendedor em [3a].
- **Comprador**: abre o link do vendedor.

## Fora de escopo
- Lado do lojista na Rede Caju: comissão e ajuste por veículo [7e], aprovar e recusar parceria [7f], vendedores disponíveis e convite [13a], perfil e avaliação [13b], denunciar vendedor [13d], Confirmar venda [7g] e a taxa CajuGo na fatura (spec **009**).
- Extrato do vendedor [7d] com **Recebi**, e "a receber" e "vendas do mês" no painel [7b] (spec **008b**, depois da Confirmar venda da 009).
- Saldo e resgate do Caju Indica [9d, 9e] (spec **010**), mesmo para o vendedor que também indica.
- Item "vendedores em análise" no "Precisa de atenção" do painel do admin [4a] (spec **012**).
- Avisos por e-mail ou WhatsApp automáticos (fase 2, PRD §11); os toggles de avisos em [13c] ficam "em breve".

## Requisitos funcionais
- **SEL-FR-001** O visitante se cadastra como vendedor em [7a] com nome, CPF (dígitos válidos e único), celular, e-mail, cidade, chave Pix, foto de um documento com foto (frente e verso), senha e aceite dos termos [12i], e vê a confirmação de que a conta está **Em análise**, que a CajuGo confere os dados antes de aprovar e que o vendedor não paga nada.
- **SEL-FR-002** O vendedor em análise ou bloqueado, ao entrar, vê o status da conta (e, se bloqueado, o motivo), sem vitrine, links nem pedidos de parceria; o bloqueado continua vendo o extrato (008b).
- **SEL-FR-003** A tela Vendedores do admin [7h] mostra os indicadores (em análise, ativos, bloqueados) e as listas nesta ordem: cadastros em análise (do mais antigo), ativos e bloqueados, com nome, cidade, celular, CPF e data do cadastro.
- **SEL-FR-004** O admin abre as fotos do documento do cadastro em [7h] e aprova com **Aprovar** (antecedentes ele consulta por fora, pelo CPF); o vendedor passa a **Ativo** e ganha um código pessoal único, usado nos links.
- **SEL-FR-005** O admin bloqueia um vendedor ativo com **Bloquear**, informando um motivo, e desbloqueia um bloqueado com **Desbloquear**; o vendedor bloqueado deixa de aparecer para as lojas, os links dele deixam de marcar novos leads e as parcerias ficam suspensas, voltando como estavam ao desbloquear.
- **SEL-FR-006** O painel do vendedor [7b] mostra os cliques nos links do mês e as lojas com o status da parceria (Parceiro, Pendente); a receber, vendas do mês e últimas vendas entram na 008b.
- **SEL-FR-007** A vitrine do vendedor [7c] lista todos os veículos da vitrine CajuGo, com a mesma busca e os mesmos filtros de [1a].
- **SEL-FR-008** Em [7c], todo veículo tem **Compartilhar**, que copia o link `/v/{id}?ref={codigo}` ou abre o WhatsApp com o link e uma mensagem pronta; o de loja parceira mostra também "Você ganha R$ X" (comissão calculada pela regra da loja).
- **SEL-FR-009** Em [7c], veículo de loja sem parceria mostra **Pedir parceria**; o pedido fica Pendente para a loja e no painel do vendedor, e pedir de novo enquanto está pendente não cria outro pedido. Loja que não aceita vendedores mostra o botão desabilitado com "Esta loja não aceita vendedores" (até a 009 criar essa escolha, toda loja aceita pedidos).
- **SEL-FR-010** Cada abertura de um link de vendedor ativo conta um clique para aquele vendedor e veículo, parceiro ou não, no máximo uma vez por aparelho por dia, sem contar robôs.
- **SEL-FR-011** O lead criado depois de abrir o link de um vendedor ativo e parceiro da loja do veículo fica marcado com o vendedor e aparece em [3a] com o selo "via vendedor {nome}"; pelo link de vendedor sem parceria com a loja, o lead fica sem vendedor.
- ~~**SEL-FR-012**~~ Extrato [7d] com filtros: movido para a spec 008b (`/clarify` de 2026-11-16).
- ~~**SEL-FR-013**~~ **Recebi**: movido para a spec 008b (`/clarify` de 2026-11-16).
- **SEL-FR-014** A conta do vendedor [13c] mostra e permite trocar a chave Pix, e tem os links para dados pessoais, lojas parceiras, Caju Indica, termos e sair; os avisos aparecem como "em breve".
- **SEL-FR-015** O menu do vendedor é Início · Vitrine · Extrato · Conta, todos na barra do celular e na barra lateral no desktop [15c]; até a 008b, Extrato mostra que as vendas aparecem ali quando a loja confirmar.
- **SEL-FR-016** Quem já tem conta na CajuGo (lojista, usuário da loja, indicador) e abre [7a] com o mesmo e-mail é levado a entrar; logado, o cadastro acrescenta o papel de vendedor à mesma conta, sem nova senha, e o login [9f] passa a oferecer o painel do vendedor.

## Requisitos não funcionais
- **SEL-NFR-001** [7a], [7b], [7c], [7d], [13c] e [7h] funcionam em 390 px e em 1280 px, com alvos de toque de pelo menos 44 px.
- **SEL-NFR-002** O link do vendedor abre a mesma página do veículo em cache, sem piorar o LCP nem o CLS (LCP < 2,5 s, CLS < 0,1 em 4G), e a canônica não leva o `?ref=` (`SEO.md`).
- **SEL-NFR-003** A vitrine do vendedor [7c] mostra os primeiros 20 veículos em até 2,5 s em 4G e carrega mais sob demanda.

## Requisitos de segurança e privacidade
- **SEL-SEC-001** O CPF do vendedor aparece completo só para o admin; o próprio vendedor vê o CPF mascarado; loja, comprador e outros vendedores nunca veem o CPF.
- **SEL-SEC-002** A chave Pix do vendedor aparece só para o próprio vendedor, o admin e as lojas parceiras dele (para pagar a comissão); nunca em página pública.
- **SEL-SEC-003** O cadastro [7a] tem honeypot e limite por IP (5/min e 30/dia), e o CPF que já tem conta de vendedor é recusado com "CPF já cadastrado" e o link Entrar, sem revelar a quem pertence.
- **SEL-SEC-004** O vendedor A nunca vê nem altera o painel, o extrato, os pedidos de parceria, os cliques ou os dados do vendedor B, nem marca "Recebi" numa venda de B.
- **SEL-SEC-005** Só o admin aprova, bloqueia e desbloqueia vendedores; o suporte vê [7h] sem os botões e recebe "Sem permissão" se tentar decidir; lojista, usuário da loja, vendedor e indicador nem abrem [7h].
- **SEL-SEC-006** O código do link (`?ref=`) não revela nome, CPF, contato ou chave Pix do vendedor na página do veículo, e um código de vendedor em análise, bloqueado ou inexistente não marca o lead.
- **SEL-SEC-007** Aprovar, bloquear (com o motivo) e desbloquear ficam no registro de atividade com quem decidiu, sem CPF nem chave Pix.
- **SEL-SEC-009** As fotos do documento ficam privadas: só o admin e o suporte (em [7h]) e o próprio vendedor as abrem, por link de curta duração; nunca aparecem para loja, comprador ou outro vendedor, e só aceitam imagem ou PDF de até 10 MB.
- **SEL-SEC-008** Valor da comissão, status da venda e status do vendedor são definidos no servidor; o vendedor não consegue aumentar a comissão, criar venda nem mudar o próprio status.

## Critérios de aceite
### SEL-FR-001
- **Dado** um visitante em [7a]
- **Quando** preenche nome, CPF válido, celular, e-mail, cidade, chave Pix, senha, aceita os termos e envia
- **Então** vê a confirmação "Em análise" com a explicação da curadoria
- **E** com CPF de dígitos inválidos, o envio é recusado no campo CPF

### SEL-FR-001 (documento)
- **Dado** um visitante em [7a]
- **Quando** envia sem a foto do documento
- **Então** o envio é recusado com "Envie a foto do documento"

### SEL-FR-002
- **Dado** um vendedor em análise
- **Quando** entra
- **Então** vê "Cadastro em análise" e não vê a vitrine nem links
- **E** um vendedor bloqueado vê "Conta bloqueada" com o motivo

### SEL-FR-003
- **Dado** 2 cadastros em análise, 1 ativo e 1 bloqueado
- **Quando** o admin abre [7h]
- **Então** vê os indicadores 2 · 1 · 1 e os em análise primeiro, do mais antigo

### SEL-FR-004
- **Dado** o cadastro em análise da Ana, com a foto do documento
- **Quando** o admin abre a foto em [7h] e toca em **Aprovar**
- **Então** a Ana passa a Ativo, ganha um código pessoal e vê a vitrine [7c] ao entrar

### SEL-FR-005
- **Dado** a Ana ativa, com link já compartilhado
- **Quando** o admin a bloqueia com o motivo "Cobrou sinal por fora"
- **Então** a Ana vê "Conta bloqueada" ao entrar
- **E** um contato feito depois pelo link dela não fica marcado com ela
- **E** a parceria dela com a loja A fica suspensa
- **E** **Desbloquear** a volta para Ativo, com a parceria com a loja A de volta

### SEL-FR-006
- **Dado** a Ana parceira da loja A, com pedido pendente na loja B e 12 cliques no mês
- **Quando** abre o painel
- **Então** vê "12 cliques", a loja A como Parceiro e a loja B como Pendente

### SEL-FR-007
- **Dado** a vitrine CajuGo com 45 veículos
- **Quando** a Ana abre [7c] e filtra por "BMW"
- **Então** vê só os BMW da vitrine, como em [1a]

### SEL-FR-008
- **Dado** a Ana parceira da loja A, que paga 2% de comissão, um Fiat Argo de R$ 60.000 da loja A e um Onix da loja B, sem parceria
- **Quando** abre [7c]
- **Então** o card do Argo mostra "Você ganha R$ 1.200" e **Compartilhar**
- **E** o link copiado é `/v/{id do Argo}?ref={código da Ana}`
- **E** o card do Onix tem **Compartilhar** e **Pedir parceria**, sem "Você ganha"

### SEL-FR-009
- **Dado** a Ana sem parceria com a loja B
- **Quando** toca em **Pedir parceria** num veículo da loja B duas vezes
- **Então** existe um pedido só, Pendente, e o painel mostra a loja B como Pendente
- **E** num veículo de loja que não aceita vendedores, o botão aparece desabilitado com "Esta loja não aceita vendedores"

### SEL-FR-010
- **Dado** o link da Ana para o Argo
- **Quando** o mesmo aparelho abre o link 3 vezes no dia e outro aparelho abre 1 vez
- **Então** o painel da Ana conta 2 cliques
- **E** a abertura por um robô não conta

### SEL-FR-011
- **Dado** a Ana ativa e parceira da loja A
- **Quando** um comprador abre o link da Ana para o Argo e envia o formulário de contato
- **Então** o lojista A vê o lead com "via vendedor Ana"
- **E** pelo link de um vendedor sem parceria com a loja A, o lead não fica marcado

### SEL-FR-014
- **Dado** a Ana em [13c]
- **Quando** troca a chave Pix por uma chave válida
- **Então** a nova chave aparece na conta
- **E** os avisos aparecem como "em breve"

### SEL-FR-015
- **Dado** a Ana ativa
- **Quando** abre o painel no celular e no desktop
- **Então** vê Início · Vitrine · Extrato · Conta na barra do celular e na barra lateral

### SEL-FR-016
- **Dado** o Caio, lojista com conta, que abre [7a] com o mesmo e-mail
- **Quando** entra com a senha dele e conclui o cadastro de vendedor
- **Então** a conta do Caio tem os papéis de lojista e vendedor (Em análise), sem nova senha
- **E** o login oferece os dois painéis

### SEL-SEC-001
- **Dado** a Ana com CPF 123.456.789-09
- **Quando** ela abre [13c], o admin abre [7h] e o lojista parceiro abre o lead dela
- **Então** a Ana vê `123.***.***-09`, o admin vê o CPF completo e o lojista não vê CPF

### SEL-SEC-002
- **Dado** a chave Pix da Ana
- **Quando** se abre a página do veículo pelo link dela e o painel de uma loja sem parceria com ela
- **Então** a chave Pix não aparece em nenhum dos dois

### SEL-SEC-003
- **Dado** o formulário [7a]
- **Quando** o mesmo IP envia o 6º cadastro em menos de 1 minuto, ou preenche o honeypot, ou usa um CPF já cadastrado
- **Então** o 6º é recusado com "Muitas tentativas", o honeypot recebe sucesso falso sem criar conta e o CPF repetido é recusado com "CPF já cadastrado" e o link Entrar

### SEL-SEC-004
- **Dado** a Ana e o Beto, vendedores ativos
- **Quando** o Beto tenta abrir o extrato da Ana ou marcar "Recebi" numa venda dela
- **Então** recebe "não encontrado" e nada muda

### SEL-SEC-005
- **Dado** um lojista, um usuário da loja, um vendedor e um indicador logados
- **Quando** abrem [7h] ou tentam aprovar ou bloquear um vendedor
- **Então** veem "Sem permissão" e nada muda
- **E** o suporte vê [7h] sem Aprovar, Bloquear nem Desbloquear, e a tentativa direta é recusada

### SEL-SEC-006
- **Dado** o link `?ref=` da Ana
- **Quando** alguém abre a página do veículo
- **Então** o HTML não tem nome, CPF, contato nem chave Pix da Ana
- **E** com o código de um vendedor bloqueado ou inexistente, o lead não fica marcado

### SEL-SEC-007
- **Dado** o admin que bloqueia a Ana com motivo
- **Quando** se consulta o registro de atividade
- **Então** há um registro com o admin, a Ana, "bloqueado" e o motivo, sem CPF nem chave Pix

### SEL-SEC-009
- **Dado** a foto do documento da Ana
- **Quando** o admin e o suporte abrem em [7h], a Ana abre em [13c], e o lojista parceiro e o Beto tentam abrir o mesmo arquivo
- **Então** só o admin, o suporte e a Ana veem a imagem; os outros recebem "não encontrado"

### SEL-SEC-008
- **Dado** a Ana logada
- **Quando** envia um valor de comissão, um status de venda ou o próprio status para o servidor
- **Então** nada disso é aceito e os valores continuam os definidos pela loja e pela CajuGo

## Pendências
Nenhuma. Resolvidas no `/clarify` de 2026-11-16: divisão com a 008b (extrato e Recebi), foto do documento com upload privado e antecedentes conferidos por fora, conta única, bloqueio suspende parcerias e mantém o extrato, Compartilhar em toda a vitrine com lead só de parceria, loja que não aceita vendedores, suporte só consulta, "CPF já cadastrado".
