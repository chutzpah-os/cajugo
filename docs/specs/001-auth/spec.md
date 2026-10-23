---
id: 001
slug: auth
title: Contas, papéis e login
status: in-progress
owner: dono do produto
created: 2026-10-23
---

# 001 · Contas, papéis e login

## Contexto
Lojistas, usuários da loja, vendedores, indicadores e a equipe CajuGo entram pelo mesmo login [9f], com e-mail e senha. Uma conta pode ter vários papéis (ex.: vendedor e indicador) e cada papel leva a um painel diferente. Sem custo de envio no MVP, a recuperação de senha é feita pelo suporte: o admin define uma senha temporária, que obriga a pessoa a criar uma nova no próximo login (PRD §2, [9f], [6b]; ADR 0004 e 0007).

Sucesso: toda pessoa com conta chega ao painel certo em até 2 toques depois de entrar, e nenhuma consegue ver ou usar um painel que não é dela.

## Atores
- **Visitante** (sem conta ou não conectado)
- **Lojista**, **Usuário da loja**, **Vendedor**, **Indicador** (contas com um ou mais papéis)
- **Admin** e **Suporte** (equipe CajuGo)

## Fora de escopo
- Cadastro de cada papel: lojista (spec 003), vendedor (spec 008), indicador (spec 010). Esta spec trata de entrar, sair, trocar de painel e recuperar acesso.
- Login por celular com código [9c] e a aba "Celular" de [9f] (fase 2).
- Recuperação de senha automática por e-mail (fase 2).
- Convite e gestão de usuários da loja e da equipe CajuGo (specs 003 e 012).
- O que cada papel pode fazer dentro do próprio painel (cada spec define o seu).

## Requisitos funcionais
- **AUT-FR-001** A pessoa com conta entra informando e-mail e senha [9f].
- **AUT-FR-002** Com e-mail ou senha errados, a pessoa vê "E-mail ou senha incorretos", sem saber se o e-mail existe.
- **AUT-FR-003** Depois de 5 tentativas erradas para o mesmo e-mail em 15 minutos, aquela conta fica bloqueada para novas tentativas por 15 minutos; além disso, cada rede tem limite de tentativas por minuto. O bloqueio nunca é permanente.
- **AUT-FR-004** A pessoa continua conectada no mesmo aparelho enquanto usar o CajuGo pelo menos uma vez a cada 30 dias (admin e suporte: a cada 1 dia); passado esse tempo sem uso, precisa entrar de novo. Não existe opção "lembrar de mim".
- **AUT-FR-005** A pessoa pode sair; ao sair, aquele aparelho deixa de ter acesso ao painel.
- **AUT-FR-006** Ao entrar, a pessoa vai para o último painel que usou; no primeiro acesso, vai pela ordem lojista → vendedor → indicador entre os papéis que tem. Painéis: lojista e usuário da loja → Meus veículos [1c]; vendedor → Rede Caju [7b]; indicador → Caju Indica [9d]; admin e suporte → painel admin [4a].
- **AUT-FR-007** Quem tem mais de um papel troca de painel sem entrar de novo, escolhendo apenas entre os papéis que a conta tem.
- **AUT-FR-008** O lojista cuja loja ainda não teve o 1º pagamento confirmado é levado à tela de pagamento [5d] ou de pagamento em análise [10a].
- **AUT-FR-009** O lojista cuja loja está suspensa vê o alerta de pagamento [12f] e continua podendo entrar no painel.
- **AUT-FR-010** O lojista cuja loja está cancelada ou arquivada só acessa a Conta [3c].
- **AUT-FR-011** Quem tenta abrir um painel sem estar conectado é levado ao login e, depois de entrar, volta para a página que tentou abrir.
- **AUT-FR-012** Quem está conectado e tenta abrir um painel de um papel que não tem vê uma mensagem de "sem permissão".
- **AUT-FR-013** Em "Esqueci minha senha" [6b], a pessoa vê a orientação para falar com o suporte e um botão que abre o WhatsApp de atendimento com uma mensagem pronta.
- **AUT-FR-014** O admin define uma senha temporária para uma conta [6g]; a senha é gerada pelo sistema, mostrada ao admin uma única vez e deixa de valer se não for usada em 24 horas.
- **AUT-FR-015** Quem entra com senha temporária só consegue criar uma nova senha (senha + confirmação, mínimo de 8 caracteres) antes de usar qualquer painel; ao criar, as outras sessões da conta são encerradas.
- **AUT-FR-016** O usuário da loja cuja loja ainda não teve o 1º pagamento confirmado, está cancelada ou arquivada vê "Loja indisponível, fale com o responsável" e não acessa o painel da loja.

## Requisitos não funcionais
- **AUT-NFR-001** Entrar (do toque em "Entrar" até o painel aberto) leva até 2 s em 4G, no p95.
- **AUT-NFR-002** As telas de login, recuperação e nova senha funcionam em 390 px, com alvos de toque de pelo menos 44 px e campos com rótulo.

## Requisitos de segurança e privacidade
- **AUT-SEC-001** Uma pessoa nunca vê nem altera dados do painel de outra conta ou de outra loja.
- **AUT-SEC-002** Ninguém consegue dar a si mesmo um papel ou uma loja; papéis só mudam por cadastro ou por ação do admin.
- **AUT-SEC-003** Senhas, inclusive a temporária, nunca aparecem em registros, mensagens de erro ou na auditoria; a temporária só aparece na tela do admin no momento em que é gerada.
- **AUT-SEC-004** Só o admin define senha temporária, e cada definição fica na auditoria (quem fez, para qual conta, quando).
- **AUT-SEC-005** Depois do login, a volta para "a página que tentou abrir" só leva a páginas do próprio CajuGo, nunca a um site externo.
- **AUT-SEC-006** A sessão de quem está conectado não fica acessível a scripts da página.
- **AUT-SEC-007** O usuário da loja usa Meus veículos, cadastro e edição de veículos, Leads e Confirmar venda, e não acessa a Conta da loja (assinatura, fatura, pagamento, cancelamento), Minha loja, comissão e vendedores, nem o Caju Indica da loja.
- **AUT-SEC-008** O suporte vê todas as áreas do admin só para leitura e só age em aprovação de veículos e denúncias; não confirma nem recusa comprovante, não suspende nem reativa loja, não aprova nem bloqueia vendedor, não define senha temporária, não marca resgate como pago e não muda regras nem equipe.
- **AUT-SEC-009** Não existe caminho público para virar admin ou suporte: o primeiro admin é criado pelo dono, fora do site, com senha temporária; os demais entram por convite de um admin. Contas da equipe CajuGo não acumulam papéis de lojista, vendedor ou indicador.

## Critérios de aceite

### AUT-FR-001
- **Dado** um lojista com conta ativa
- **Quando** ele informa e-mail e senha corretos e toca em "Entrar"
- **Então** ele fica conectado e vê o painel do seu papel

### AUT-FR-002
- **Dado** uma tentativa com e-mail que não existe e outra com senha errada de um e-mail que existe
- **Quando** cada uma é enviada
- **Então** as duas mostram exatamente "E-mail ou senha incorretos"

### AUT-FR-003
- **Dado** 5 tentativas erradas para o e-mail do lojista A em 15 minutos
- **Quando** é feita a 6ª tentativa, mesmo com a senha certa
- **Então** a entrada é recusada com aviso de bloqueio temporário
- **E** 15 minutos depois o lojista A consegue entrar normalmente
- **E** durante o bloqueio, o lojista B entra normalmente

### AUT-FR-003 (rede)
- **Dado** uma mesma rede tentando entrar com vários e-mails diferentes
- **Quando** passa do limite de tentativas por minuto
- **Então** as novas tentativas dessa rede são recusadas com aviso para aguardar

### AUT-FR-004
- **Dado** um lojista que entrou há 45 dias e usou o painel há 10 dias
- **Quando** ele abre o CajuGo
- **Então** continua conectado, sem pedir login

### AUT-FR-004 (sem uso)
- **Dado** um lojista que não usa o CajuGo há 31 dias
- **Quando** ele abre o painel
- **Então** é levado ao login

### AUT-FR-004 (equipe)
- **Dado** um admin que não usa o CajuGo há 25 horas
- **Quando** ele abre o painel admin
- **Então** é levado ao login

### AUT-FR-005
- **Dado** uma pessoa conectada
- **Quando** ela toca em "Sair"
- **Então** volta à vitrine
- **E** ao tentar abrir o painel é levada ao login

### AUT-FR-006
- **Dado** contas com um único papel: lojista, vendedor, indicador e admin
- **Quando** cada uma entra
- **Então** vai, respectivamente, para Meus veículos [1c], painel da Rede Caju [7b], painel do Caju Indica [9d] e painel admin [4a]

### AUT-FR-006 (vários papéis)
- **Dado** uma conta de vendedor e indicador entrando pela primeira vez
- **Quando** ela entra
- **Então** vai para o painel da Rede Caju (ordem lojista → vendedor → indicador)
- **E** se depois ela usar o Caju Indica, sair e entrar de novo, vai para o Caju Indica

### AUT-FR-007
- **Dado** uma conta com os papéis vendedor e indicador, no painel da Rede Caju
- **Quando** ela escolhe "Caju Indica" na troca de painel
- **Então** vai para o painel do Caju Indica sem entrar de novo
- **E** a troca não oferece papéis que a conta não tem

### AUT-FR-008
- **Dado** um lojista com loja cadastrada e sem pagamento confirmado
- **Quando** ele entra
- **Então** vai para [5d] (se ainda não enviou comprovante) ou [10a] (se já enviou)

### AUT-FR-009
- **Dado** um lojista com loja suspensa
- **Quando** ele entra
- **Então** vê o alerta de pagamento [12f] com o botão de pagar
- **E** consegue abrir Meus veículos

### AUT-FR-010
- **Dado** um lojista com loja cancelada
- **Quando** ele entra ou tenta abrir Meus veículos
- **Então** só a Conta [3c] fica disponível

### AUT-FR-011
- **Dado** um visitante não conectado
- **Quando** ele abre o link da tela de Leads [3a]
- **Então** é levado ao login
- **E** depois de entrar como lojista, abre a tela de Leads

### AUT-FR-012
- **Dado** uma conta só com papel de indicador
- **Quando** ela abre o endereço do painel admin
- **Então** vê "sem permissão" e não vê nenhum dado do admin

### AUT-FR-013
- **Dado** um lojista que esqueceu a senha
- **Quando** ele toca em "Esqueci minha senha"
- **Então** vê a orientação para falar com o suporte
- **E** o botão abre o WhatsApp de atendimento com a mensagem pronta

### AUT-FR-014
- **Dado** um admin no detalhe de uma loja [6g]
- **Quando** ele toca em "Definir senha temporária"
- **Então** vê a senha gerada uma única vez
- **E** ao sair e voltar à tela, a senha não aparece mais

### AUT-FR-014 (expiração)
- **Dado** uma senha temporária gerada há 25 horas e nunca usada
- **Quando** o lojista tenta entrar com ela
- **Então** a entrada é recusada como "E-mail ou senha incorretos"
- **E** o admin consegue gerar uma nova

### AUT-FR-015
- **Dado** um lojista com senha temporária
- **Quando** ele entra
- **Então** só vê a tela de nova senha, e qualquer outro endereço do painel leva de volta a ela
- **E** ao salvar uma nova senha válida, entra no painel
- **E** sessões abertas em outros aparelhos são encerradas

### AUT-FR-016
- **Dado** um usuário da loja cuja loja está cancelada
- **Quando** ele entra ou abre Meus veículos
- **Então** vê "Loja indisponível, fale com o responsável"
- **E** não vê a Conta nem a tela de pagamento da loja

### AUT-SEC-001
- **Dado** o lojista A e o lojista B, ambos conectados
- **Quando** B tenta abrir qualquer página ou dado do painel de A pelo endereço
- **Então** B não vê nem altera nada de A

### AUT-SEC-002
- **Dado** uma conta só com papel de indicador
- **Quando** ela tenta, por qualquer formulário ou troca de painel, obter o papel de lojista, vendedor ou admin, ou uma loja
- **Então** os papéis e a loja da conta continuam os mesmos

### AUT-SEC-003
- **Dado** um admin que gerou uma senha temporária e um lojista que errou a senha
- **Quando** a auditoria e os registros do sistema são consultados
- **Então** nenhuma senha aparece neles

### AUT-SEC-004
- **Dado** uma conta de suporte e uma de lojista
- **Quando** cada uma tenta definir senha temporária para outra conta
- **Então** a ação é recusada
- **E** quando um admin define, a auditoria registra quem, para qual conta e quando

### AUT-SEC-005
- **Dado** um link de login que pede para voltar a um site externo depois de entrar
- **Quando** a pessoa entra
- **Então** vai para o painel do seu papel, não para o site externo

### AUT-SEC-006
- **Dado** uma pessoa conectada
- **Quando** um script da página tenta ler a sessão
- **Então** não consegue

### AUT-SEC-007
- **Dado** um usuário da loja conectado
- **Quando** ele abre Meus veículos, um veículo, Leads e Confirmar venda
- **Então** consegue usar todas essas telas
- **E** quando abre, pelo menu ou pelo endereço, a Conta da loja, a fatura, Minha loja, comissão, vendedores ou o Caju Indica, vê "sem permissão"

### AUT-SEC-008
- **Dado** uma conta de suporte
- **Quando** ela abre lojas, assinaturas, pagamentos, vendedores e indicações
- **Então** vê os dados, sem os botões de ação
- **E** consegue aprovar ou pedir ajuste de veículo e manter ou ocultar anúncio denunciado
- **E** se tentar confirmar comprovante, suspender loja, aprovar vendedor, definir senha temporária, marcar resgate pago ou mudar regras, a ação é recusada

### AUT-SEC-009
- **Dado** o site no ar, sem nenhum admin
- **Quando** qualquer pessoa usa os cadastros públicos (lojista, vendedor, indicador)
- **Então** nenhum deles cria conta de admin ou suporte
- **E** o primeiro admin só existe depois que o dono o cria fora do site, entrando com senha temporária e criando a própria senha

## Pendências
Nenhuma. Respostas incorporadas em 2026-10-23 (`/clarify`): bloqueio por e-mail + rede por 15 min (FR-003); 30 dias sem uso, equipe 1 dia, sem "lembrar de mim" (FR-004); último painel usado (FR-006); senha temporária expira em 24 h (FR-014); permissões do usuário da loja (SEC-007) e do suporte (SEC-008); primeiro admin fora do site e equipe em contas separadas (SEC-009).
