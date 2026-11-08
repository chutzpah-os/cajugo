---
id: 003
slug: store-signup
title: Cadastro do lojista, Minha loja e menu
status: in-progress
owner: dono do produto
created: 2026-11-08
---

# 003 · Cadastro do lojista, Minha loja e menu

## Contexto
É a porta de entrada da receita: o lojista conhece o Catálogo pela landing [5b], cria a conta e a loja [5c] (com código do Caju Indica, se tiver [8d]) e segue para o pagamento (spec 004). Depois, mantém a vitrine da loja em Minha loja [3b]: dados públicos, horário, logo, capa, link e QR code para divulgar. O menu da home [11a] liga o comprador e o lojista a tudo isso. A landing é página pública e entra no SEO (`docs/SEO.md`).
Sucesso: um lojista sai da landing para a tela de pagamento em poucos minutos, sem ajuda, e consegue divulgar o link da loja.

## Atores
- **Visitante** (não conectado): vê o menu e a landing; faz o cadastro.
- **Lojista** (store_owner): edita Minha loja.
- **Usuário da loja** (store_staff): não acessa Minha loja (AUT-SEC-007).
- **Quem indicou** (lojista, vendedor ou indicador com código): só aparece no aviso "Indicação de {nome} aplicada".

## Fora de escopo
- Pagamento [5d], Pix [6c] e ativação da loja (spec 004). Depois do cadastro, a pessoa segue para a tela de pagamento já existente.
- Catálogo público da loja `/loja/{slug}` e "Ver como cliente" funcionando de ponta a ponta (specs 005/006); aqui o botão aponta para o endereço.
- Recompensas, painel e telas do Caju Indica, landing [8c] completa e links de campanha (spec 010). Aqui entram só o código pessoal, o link que leva ao cadastro e o registro da indicação.
- Checagem de autoindicação por CPF/CNPJ (spec 004, quando o documento é pedido no pagamento).
- Liberação do slug sem 1º pagamento em 7 dias (job da spec 011).
- Usuários da loja (convite), Conta [3c] e cancelamento (specs 011/012; PRD §12.1 #3).
- Texto jurídico definitivo dos termos [12i] (PRD §12.1 #5); aqui entra a versão inicial do rascunho do PRD.

## Requisitos funcionais
- **STO-FR-001** O menu da home [11a] mostra Comprar veículos, Produtos (Catálogo, Rede Caju), Caju Indica, Favoritos e Entrar; quem está conectado vê o próprio nome e os painéis que pode abrir no lugar de "Entrar".
- **STO-FR-002** A landing do lojista [5b] apresenta o Catálogo (o que a loja recebe, plano de R$ 100/mês sem fidelidade, perguntas frequentes) e leva ao cadastro pelo botão "Prosseguir".
- **STO-FR-003** O visitante cria, num só formulário [5c], a conta de lojista e a loja (nome, cidade, WhatsApp, endereço do catálogo, seu nome, e-mail, celular, senha e aceite dos termos) e, ao concluir, já fica conectado e segue para a tela de pagamento.
- **STO-FR-004** Cada campo do cadastro é validado como no PRD [5c] (nome da loja 2–60, cidade de uma lista de cidades do Brasil, WhatsApp e celular brasileiros, e-mail válido, senha ≥ 8, termos aceitos), com a mensagem abaixo do campo.
- **STO-FR-005** O endereço do catálogo é sugerido a partir do nome da loja e mostra "Disponível" ou "Indisponível" enquanto a pessoa digita; só aceita letras minúsculas, números e hífen (3–40, sem hífen nas pontas) e não repete o de outra loja.
- **STO-FR-006** Toda loja nasce com status "cadastrada" (fora do ar) e com o endereço reservado para ela.
- **STO-FR-007** O cadastro aceita um código de indicação opcional: preenchido sozinho quando a pessoa vem do link de indicação, validado enquanto digita ("Indicação de {nome} aplicada") e recusado com mensagem clara se não existir ou se for autoindicação (mesmo e-mail ou mesmo celular de quem indicou). A indicação aceita fica registrada como "Cadastrada".
- **STO-FR-008** Em Minha loja [3b], o lojista edita as informações públicas: nome da loja, sobre a loja, endereço em campos separados (rua, número, complemento, bairro e CEP; cidade e UF do cadastro), WhatsApp e Instagram.
- **STO-FR-009** O lojista define o horário de atendimento por dia da semana, com intervalos ou "Fechado".
- **STO-FR-010** O lojista envia ou troca o logo e a capa da loja.
- **STO-FR-011** Minha loja mostra o link do catálogo e o QR code, com "Copiar link", "Baixar QR code" (imagem), "Compartilhar" e "Ver como cliente".
- **STO-FR-012** O lojista escolhe se novos veículos já vêm marcados para divulgar na vitrine CajuGo (padrão: sim).
- **STO-FR-013** O lojista pode alterar o endereço do catálogo no máximo uma vez a cada 30 dias, com aviso; o endereço antigo continua levando à loja por 90 dias.
- **STO-FR-014** Todo lojista recebe, ao criar a conta, um código pessoal de indicação (ex.: `RICARDO10`) e um link `/i/{codigo}` que leva ao cadastro [5c] com o código aplicado; vendedores e indicadores recebem o seu no cadastro deles (specs 008 e 010).
- **STO-FR-015** Quem já tem conta (ex.: vendedor ou indicador) e informa o mesmo e-mail é convidado a entrar ("Se você já tem conta, entre para continuar"); conectado, o cadastro pede só os dados da loja e adiciona o papel de lojista à mesma conta.
- **STO-FR-016** A página de termos e privacidade [12i] existe com as abas Termos e Privacidade, com o texto inicial do rascunho do PRD identificado como versão inicial, e é o destino do link do aceite no cadastro.

## Requisitos não funcionais
- **STO-NFR-001** A landing [5b] segue o checklist de SEO (`docs/SEO.md` §6): conteúdo no HTML do servidor, título e descrição únicos, canônica, JSON-LD e Open Graph.
- **STO-NFR-002** Menu, landing, cadastro e Minha loja funcionam em 390 px, com alvos de toque de pelo menos 44 px e campos com rótulo.

## Requisitos de segurança e privacidade
- **STO-SEC-001** Um lojista nunca vê nem altera Minha loja de outra loja; a loja editada é sempre a da sessão.
- **STO-SEC-002** O cadastro público tem proteção contra robôs (campo isca) e limite de tentativas por rede, e nunca cria conta de admin ou suporte.
- **STO-SEC-003** O usuário da loja não altera Minha loja nem o endereço do catálogo.
- **STO-SEC-004** Logo e capa só aceitam imagens (jpg, png, webp, heic) de até 15 MB, enviadas com autorização do servidor para a pasta da própria loja; nome e metadados do arquivo do usuário são descartados.
- **STO-SEC-005** O CPF, o CNPJ e o celular usados para checar autoindicação nunca aparecem para quem indicou nem em página pública.

## Critérios de aceite
### STO-FR-001
- **Dado** um visitante na home
- **Quando** ele abre o menu
- **Então** vê Comprar veículos, Produtos (Catálogo, Rede Caju), Caju Indica, Favoritos e Entrar
- **E** um vendedor conectado vê o próprio nome e "Rede Caju" no lugar de "Entrar"

### STO-FR-002
- **Dado** um visitante na landing [5b]
- **Quando** ele toca em "Prosseguir"
- **Então** vai para o cadastro [5c]

### STO-FR-003
- **Dado** um visitante com todos os campos válidos
- **Quando** ele toca em "Continuar para pagamento"
- **Então** a conta de lojista e a loja são criadas, ele fica conectado e vai para a tela de pagamento
- **E** entrar de novo com o e-mail e a senha leva à mesma tela, enquanto a loja não estiver ativa

### STO-FR-004
- **Dado** o formulário de cadastro
- **Quando** o nome da loja tem 1 letra, o WhatsApp tem 8 dígitos, a senha tem 6 caracteres ou os termos não foram aceitos
- **Então** cada erro aparece no campo e nada é criado

### STO-FR-005
- **Dado** a loja "Silva Autocar" já usando o endereço `silvautocar`
- **Quando** outro visitante digita o nome "Silva Autocar"
- **Então** a sugestão aparece e o campo mostra "Indisponível"
- **E** ao mudar para `silvautocar-campinas` mostra "Disponível"
- **E** `Silva_Autocar` e `-silva` são recusados

### STO-FR-006
- **Dado** um cadastro concluído
- **Quando** o admin ou o próprio lojista consulta a loja
- **Então** o status é "cadastrada" e o endereço não pode ser usado por outra loja

### STO-FR-007
- **Dado** um indicador com o código `RICARDO10`
- **Quando** um visitante abre o link de indicação e chega ao cadastro
- **Então** o código vem preenchido e aparece "Indicação de Ricardo aplicada"
- **E** um código inexistente mostra "Código não encontrado" e não impede concluir o cadastro sem código
- **E** um código de quem tem o mesmo e-mail ou o mesmo celular do visitante mostra que autoindicação não vale
- **E** com o código aceito, a indicação aparece como "Cadastrada" para quem indicou (sem dados pessoais do indicado)

### STO-FR-008
- **Dado** um lojista em Minha loja
- **Quando** ele altera o "Sobre a loja", o Instagram e o endereço (rua, número, bairro e CEP) e salva
- **Então** os novos dados aparecem ao reabrir a tela
- **E** um CEP com menos de 8 dígitos é recusado

### STO-FR-009
- **Dado** um lojista em Minha loja
- **Quando** ele define segunda a sexta 8h–18h, sábado 8h–12h e domingo "Fechado" e salva
- **Então** o horário fica guardado assim
- **E** um intervalo com fim antes do início é recusado

### STO-FR-010
- **Dado** um lojista em Minha loja
- **Quando** ele envia um logo e uma capa válidos
- **Então** as novas imagens aparecem na tela

### STO-FR-011
- **Dado** a loja com endereço `silvautocar`
- **Quando** o lojista toca em "Copiar link" e em "Baixar QR code"
- **Então** o link copiado é o do catálogo da loja e o QR code baixado abre esse mesmo link

### STO-FR-012
- **Dado** a preferência "Divulgar novos veículos na CajuGo" desligada
- **Quando** o lojista salva
- **Então** a preferência continua desligada ao reabrir

### STO-FR-013
- **Dado** a loja no endereço `silvautocar`
- **Quando** o lojista muda para `silva-autocar`, confirma o aviso e salva
- **Então** o link novo passa a ser `silva-autocar`
- **E** quem abre o endereço antigo é levado ao novo durante 90 dias
- **E** uma nova troca nos 30 dias seguintes é recusada, informando a partir de quando é possível

### STO-FR-014
- **Dado** um lojista recém-cadastrado chamado Ricardo
- **Quando** ele consulta o seu código
- **Então** tem um código pessoal único (ex.: `RICARDO10`) e o link `/i/ricardo10`
- **E** abrir esse link leva ao cadastro [5c] com o código aplicado

### STO-FR-015
- **Dado** uma indicadora com conta e o e-mail `ana@x.com`
- **Quando** ela preenche o cadastro de loja com `ana@x.com`
- **Então** vê "Se você já tem conta, entre para continuar", sem confirmar se o e-mail existe
- **E** depois de entrar, o cadastro pede só os dados da loja e, ao concluir, a conta passa a ter os papéis de indicadora e lojista
- **E** uma conta da equipe CajuGo não consegue abrir loja (AUT-SEC-009)

### STO-FR-016
- **Dado** o cadastro [5c]
- **Quando** o visitante toca no link dos termos
- **Então** abre a página de termos com as abas Termos e Privacidade e a indicação de versão inicial

### STO-SEC-001
- **Dado** os lojistas A e B conectados
- **Quando** B tenta salvar Minha loja informando a loja de A
- **Então** quem muda é a loja de B (a da sessão) e nada de A é alterado

### STO-SEC-002
- **Dado** um robô preenchendo o campo isca, ou a mesma rede enviando cadastros acima do limite
- **Quando** o cadastro é enviado
- **Então** nenhuma conta é criada e a rede recebe aviso para aguardar
- **E** nenhum cadastro público cria papel de admin ou suporte

### STO-SEC-003
- **Dado** um usuário da loja conectado
- **Quando** ele tenta abrir ou salvar Minha loja ou mudar o endereço
- **Então** vê "Sem permissão" e nada muda

### STO-SEC-004
- **Dado** um lojista enviando logo
- **Quando** o arquivo é SVG, GIF, PDF ou tem mais de 15 MB, ou a imagem é apontada para a pasta de outra loja
- **Então** o envio é recusado e o logo não muda

### STO-SEC-005
- **Dado** um cadastro recusado por autoindicação
- **Quando** quem indicou consulta as suas indicações
- **Então** não vê CPF, CNPJ nem celular de ninguém

## Pendências
Nenhuma. Respostas do `/clarify` (2026-11-08): código pessoal antecipado da 010 (só código, link e registro da indicação); autoindicação por e-mail e celular aqui e por CPF/CNPJ na 004; conta existente entra e adiciona a loja (mensagem neutra); termos com o rascunho do PRD como versão inicial; troca de endereço no máximo 1 vez a cada 30 dias; endereço em campos separados.
