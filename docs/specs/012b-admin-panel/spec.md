---
id: 012b
slug: admin-panel
title: Admin · painel, lojas, usuários e detalhe da loja
status: clarified
owner: dono do produto
created: 2026-11-24
---

# 012b · Admin · painel, lojas, usuários e detalhe da loja

## Contexto
O admin já confere pagamentos [10b], assinaturas [4b], vendedores [7h], aprovação [14c], denúncias [14e], alertas [12a] e as regras [4c, 8f]. Mas o painel [4a] e Lojas [1d] ainda são telas provisórias, e o detalhe da loja [6g] não existe. Por isso a operação não tem uma visão do negócio nem um lugar para cuidar de cada loja: criar a loja de quem pede ajuda, definir a senha temporária, ver o dono e a assinatura e ocultar um veículo. Esta spec entrega essas telas no celular e no desktop [15c], seguindo de forma fiel as capturas dos Turnos 01, 04, 06 e 15 (com a base visual da 012).

Sucesso: o admin entende a saúde do negócio em 5 segundos e resolve qualquer pendência ou pedido de loja a partir do painel, sem procurar em outras telas.

## Atores
- **Admin**: vê e decide tudo.
- **Suporte**: vê tudo, sem os botões que mudam algo (o que já vale para as outras telas do admin).

## Fora de escopo
- Assinaturas [4b], pagamentos [10b], vendedores [7h], aprovação [14c], denúncias [14e], alertas [12a] e regras [4c, 8f]: já entregues; aqui só entram os atalhos para elas.
- Resgates do Caju Indica [8g] (010b): o item "Pix de resgate a pagar" do painel aparece quando a 010b for entregue.
- Convite de usuário da loja (fora do MVP, PRD §12).
- Exportar listas.

## Requisitos funcionais
- **ADM-FR-001** O painel [4a] mostra a saudação com o primeiro nome e a data, e 4 KPIs:
  - **Lojas ativas**, com "+N no mês" (lojas ativadas no mês);
  - **Receita mensal** (MRR), com a variação das mensalidades pagas no mês até hoje em relação ao mesmo período do mês anterior;
  - **Veículos na vitrine**, com "+N no mês" (publicados no mês);
  - **Leads no mês**, com a variação em relação ao mesmo período do mês anterior (do dia 1 até o mesmo dia).

  Sem dado no mês anterior, a variação não aparece.
- **ADM-FR-002** O painel mostra **Precisa de atenção** só com os itens que têm pendência, cada um com o contador colorido, o título, o detalhe e o atalho para a lista já filtrada:
  - comprovantes a conferir;
  - vencimentos em 3 dias;
  - assinaturas atrasadas;
  - vendedores em análise;
  - veículos a aprovar;
  - denúncias;
  - alertas de busca a avisar;
  - lojas cadastradas sem pagamento.
- **ADM-FR-003** O painel mostra a **origem dos leads** do mês (barra Vitrine CajuGo × Catálogos, com os percentuais) e as **lojas com mais leads** no mês (até 10).
- **ADM-FR-004** Lojas [1d] tem as abas **Lojas**, **Veículos CajuGo** e **Usuários**. Na aba Lojas aparecem os KPIs (assinaturas ativas e receita mensal) e os cards de loja: sigla, nome, "dono · cidade", selo da assinatura, "N veículos · M na CajuGo" e **Gerenciar**. Há busca por nome, endereço ou dono e os filtros por situação da assinatura.
- **ADM-FR-005** Em Lojas, **Nova loja** cria a loja e a conta do dono com uma senha temporária, mostrada uma única vez para o admin copiar e passar pelo WhatsApp. A loja nasce **cadastrada** (aguardando o 1º pagamento), e o dono troca a senha no primeiro login. Pagamento combinado fora (ex.: dinheiro) entra por **Registrar pagamento sem comprovante** em [6g], que ativa a loja como a confirmação de [10b].
- **ADM-FR-006** A aba **Veículos CajuGo** mostra o texto explicativo do design e os veículos na vitrine (miniatura, nome, "loja · preço"), com os filtros **Denunciados** e **Aguardando aprovação** e o **Ocultar** com motivo (o mesmo de [14e]).
- **ADM-FR-007** A aba **Usuários** lista as contas: sigla, nome, loja ou informação e os selos de papel (Lojista, Usuário da loja, Vendedor, Indicador, Admin, Suporte). Há busca por nome ou e-mail, e cada conta abre a loja dela [6g] (lojista e usuário da loja) ou a tela do papel ([7h] para vendedor).
- **ADM-FR-008** O detalhe da loja [6g] (por **Gerenciar** ou pelos itens do painel) mostra:
  - o cabeçalho com "← Lojas", a sigla, o nome, a cidade, "cliente desde", o selo da assinatura e o link do catálogo;
  - os KPIs Veículos, Na CajuGo e Leads no mês;
  - o card **Dono**: nome, e-mail, celular e CPF/CNPJ;
  - o card **Assinatura**: plano, pagamento, próxima cobrança, total pago, **Faturas** e **Registrar pagamento sem comprovante**;
  - o card **Rede Caju**: aceita vendedores, comissão padrão, parceiros e vendas no mês;
  - o card **Veículos**, com os primeiros e **Ver todos (N)**.
- **ADM-FR-009** As ações de [6g] ficam numa lista, nesta ordem:
  - Editar dados da loja;
  - Ver catálogo público;
  - **Definir senha temporária** (mostrada uma vez; obriga a troca no próximo login);
  - Histórico de atividade;
  - **Suspender loja** em `caju-deep`, por último, que vira **Reativar** quando a loja está suspensa (as mesmas regras da 011).
- **ADM-FR-010** Em [6g], **Editar dados da loja** altera os dados de Minha loja (nome, WhatsApp, cidade, endereço, sobre, Instagram), com as mesmas validações da 003. O endereço do catálogo (o lojista troca em Minha loja) e o dono da loja não mudam por aqui.
- **ADM-FR-011** O **Histórico de atividade** da loja mostra os registros dela do mais recente ao mais antigo (data, quem fez e a ação em texto), 20 por vez, sem dados pessoais além do nome de quem fez.
- **ADM-FR-012** A Conta admin [4c] ganha **Equipe CajuGo**:
  - a lista de admins e suportes;
  - **Convidar** (nome, e-mail e papel Admin ou Suporte): a conta nasce com a senha temporária, mostrada uma vez;
  - **Remover da equipe**: a pessoa perde o papel e todas as sessões dela são encerradas. Ninguém remove a si mesmo, e o último admin não pode ser removido. Para trocar o papel, o admin remove e convida de novo.
- **ADM-FR-015** A Conta admin ganha **Logs de atividade**: o registro geral, do mais recente ao mais antigo, 20 por vez, com os filtros **tipo de ação** e **período** (de/até). O registro fica visível por inteiro (é só de inclusão; sem limpeza no MVP).
- **ADM-FR-013** No desktop [15c], a Visão geral mostra os KPIs (Lojas ativas, Receita do mês, Em atraso, Veículos na vitrine) e as filas **Comprovantes Pix** e **Veículos aguardando aprovação**, com **Confirmar**/**Recusar** e **Aprovar**/**Recusar** inline (as mesmas regras de [10b] e [14c]) e **Ver todos**. A sidebar mostra os contadores de pendências.
- **ADM-FR-014** A navegação do admin no celular é **Painel · Lojas · Assinaturas · Conta · Mais**; "Mais" abre a gaveta com Pagamentos Pix, Veículos, Alertas, Rede Caju e Caju Indica (PRD §7.2).

## Requisitos não funcionais
- **ADM-NFR-001** [4a], [1d], [6g], [4c] e [15c] seguem as capturas dos Turnos 01, 04, 06 e 15, com a comparação registrada em 390 e 1280 px (DSG-NFR-001), alvos de toque ≥ 44 px e sem rolagem horizontal.
- **ADM-NFR-002** O painel [4a] abre em até 1 s (p95) com 500 lojas, e os números podem ter até 60 s de atraso.
- **ADM-NFR-003** As listas de Lojas, Veículos CajuGo, Usuários e Histórico mostram 20 itens por vez, com **Carregar mais**.

## Requisitos de segurança e privacidade
- **ADM-SEC-001** Só admin e suporte abrem as telas do admin; lojista, usuário da loja, vendedor, indicador e visitante recebem "Sem permissão" ou o login.
- **ADM-SEC-002** O suporte vê tudo, mas não tem Nova loja, Editar dados, Definir senha temporária, Suspender/Reativar, Ocultar, Convidar, Remover da equipe, Confirmar, Recusar nem Aprovar; a tentativa direta também é recusada.
- **ADM-SEC-003** A senha temporária aparece uma única vez, para quem a gerou, e nunca fica em registro, aviso ou tela depois disso; criar, editar, definir senha, convidar, remover da equipe e ocultar ficam no registro de atividade sem dado pessoal.
- **ADM-SEC-004** O CPF/CNPJ do dono aparece por inteiro só para o admin em [6g]; o suporte vê mascarado (como o lojista vê o próprio).
- **ADM-SEC-005** Uma loja inexistente ou um id inválido em [6g] responde "não encontrado", e o histórico de uma loja nunca mostra os registros de outra.

## Critérios de aceite
### ADM-FR-001
- **Dado** 42 lojas ativas, MRR de R$ 4.200, 1.284 veículos na vitrine e 318 leads no mês (eram 274 no mês anterior)
- **Quando** a admin Ana abre o painel no dia 20
- **Então** vê "Olá, Ana", a data e os 4 KPIs
- **E** em Leads no mês, a variação compara com os leads de 1 a 20 do mês anterior

### ADM-FR-002
- **Dado** 2 assinaturas atrasadas, 3 veículos denunciados e nenhum comprovante a conferir
- **Quando** o admin abre o painel
- **Então** "Precisa de atenção" mostra "Assinaturas atrasadas" (2) e "Anúncios denunciados" (3), e não mostra comprovantes
- **E** tocar em "Assinaturas atrasadas" abre [4b] filtrado em Atrasadas

### ADM-FR-003
- **Dado** 318 leads no mês, 62% pela vitrine CajuGo
- **Quando** o admin abre o painel
- **Então** a barra mostra "Vitrine CajuGo 62%" e "Catálogos 38%", e a lista das lojas com mais leads vem em ordem decrescente

### ADM-FR-004
- **Dado** lojas em dia, atrasada e suspensa
- **Quando** o admin abre Lojas e busca "Garagem"
- **Então** vê o card da Garagem 77 com a sigla, "Marta Oliveira · Osasco", o selo ATRASADA, "12 veículos · 6 na CajuGo" e Gerenciar

### ADM-FR-005
- **Dado** o admin em Lojas
- **Quando** cria a "Loja Nova" com o dono e o e-mail dele
- **Então** a senha temporária aparece uma vez com **Copiar**, a loja fica cadastrada, e o dono que entra com essa senha vai para a Nova senha
- **E** o admin que registra o pagamento sem comprovante em [6g] deixa a loja ativa

### ADM-FR-006
- **Dado** 2 veículos denunciados na vitrine
- **Quando** o admin filtra Denunciados e oculta um com o motivo
- **Então** o veículo sai da vitrine e o lojista recebe o aviso com o motivo

### ADM-FR-007
- **Dado** uma conta lojista e vendedora
- **Quando** o admin abre Usuários e busca pelo nome dela
- **Então** vê os selos Lojista e Vendedor, e tocar abre a loja dela [6g]

### ADM-FR-008
- **Dado** a Auto Center Silva em dia, com 24 veículos, 18 na CajuGo e 58 leads no mês
- **Quando** o admin abre o detalhe da loja
- **Então** vê o cabeçalho, os 3 KPIs e os cards Dono, Assinatura, Rede Caju e Veículos, como na captura [6g]

### ADM-FR-009
- **Dado** o detalhe de uma loja ativa
- **Quando** o admin toca em Definir senha temporária
- **Então** a senha aparece uma vez para copiar, e o próximo login do dono leva à Nova senha
- **E** Suspender loja é o último item, em `caju-deep`; na loja suspensa, vira Reativar

### ADM-FR-010
- **Dado** o detalhe da loja
- **Quando** o admin troca o WhatsApp da loja para um número inválido
- **Então** vê o mesmo erro de Minha loja e nada muda; com um número válido, a loja passa a ter o novo WhatsApp

### ADM-FR-011
- **Dado** a loja com a assinatura cancelada e desfeita e uma senha temporária definida
- **Quando** o admin abre o Histórico de atividade
- **Então** vê os três registros, do mais recente ao mais antigo, com a data, quem fez e a ação, sem a senha

### ADM-FR-012
- **Dado** a Conta admin
- **Quando** o admin convida "Bruno" como Suporte
- **Então** Bruno aparece na Equipe CajuGo com o selo Suporte, e a senha temporária aparece uma vez
- **E** ao remover Bruno, ele perde o papel e é desconectado; a própria admin não tem "Remover" na sua linha, e o último admin não pode ser removido

### ADM-FR-015
- **Dado** registros de cancelamento, convite e senha temporária na semana
- **Quando** o admin abre Logs de atividade e filtra o tipo "Senha temporária" nos últimos 7 dias
- **Então** vê só esses registros, do mais recente ao mais antigo, sem a senha

### ADM-FR-013
- **Dado** 3 comprovantes a conferir e 2 veículos aguardando aprovação
- **Quando** o admin abre a Visão geral em 1280 px e confirma um comprovante inline
- **Então** o comprovante sai da fila, e o contador de Pagamentos Pix na sidebar cai de 3 para 2

### ADM-FR-014
- **Dado** o admin em 390 px
- **Quando** toca em Mais
- **Então** a gaveta abre com Pagamentos Pix, Veículos, Alertas, Rede Caju e Caju Indica

### ADM-SEC-001
- **Dado** um lojista logado
- **Quando** abre `/admin/lojas` ou o detalhe de uma loja
- **Então** vê "Sem permissão" e nenhum dado

### ADM-SEC-002
- **Dado** o suporte logado
- **Quando** abre o detalhe da loja ou tenta definir a senha temporária pela ação
- **Então** vê os dados sem os botões, e a ação é recusada com "Sem permissão"

### ADM-SEC-003
- **Dado** a senha temporária definida para o dono
- **Quando** se consulta o registro de atividade e os avisos
- **Então** há o registro "senha temporária definida" sem a senha, e a senha não aparece em lugar nenhum

### ADM-SEC-004
- **Dado** a loja com CNPJ 12.345.678/0001-90
- **Quando** o admin e o suporte abrem o detalhe
- **Então** o admin vê o CNPJ inteiro e o suporte vê mascarado

### ADM-SEC-005
- **Dado** um id de loja inexistente e a loja A
- **Quando** o admin abre `/admin/lojas/{id inexistente}` e o histórico da loja A
- **Então** vê "não encontrado" no primeiro, e só registros da loja A no segundo

## Pendências
Nenhuma. Resolvidas no `/clarify` de 2026-11-24, com as opções recomendadas (instrução do dono do produto de seguir sem parar):
- a Nova loja nasce cadastrada; pagamento combinado fora entra pelo registro sem comprovante (ADM-FR-005);
- Editar dados não troca o endereço do catálogo nem o dono (ADM-FR-010);
- Equipe com Convidar e Remover; ninguém remove a si mesmo, o último admin fica, e trocar o papel é remover e convidar (ADM-FR-012);
- Logs de atividade com o registro inteiro, filtros de tipo e período, 20 por vez (ADM-FR-015);
- variação dos KPIs: mesmo período do mês anterior; Lojas ativas e Veículos com "+N no mês" (ADM-FR-001).
