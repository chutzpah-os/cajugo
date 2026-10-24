---
id: 002
slug: settings
title: Regras configuráveis e troca de senha
status: clarified
owner: dono do produto
created: 2026-10-23
---

# 002 · Regras configuráveis e troca de senha

## Contexto
O CajuGo depende de vários números e dados que mudam com o negócio: chave Pix, prazos, taxas, mínimos e o WhatsApp de atendimento. Hoje eles estão espalhados ou fixos. Esta spec reúne todos numa única lista de **Config** (GLOSSARY), editável pelo admin em [4c] e [8f], com histórico de quem mudou o quê. É a base das specs seguintes: nenhuma delas pode trazer número fixo (PRD §5.14).
Junto, entra a troca da própria senha, que hoje não existe no site (só por senha temporária).
Sucesso: o admin muda qualquer regra sem pedir deploy, cada mudança fica registrada, e qualquer conta troca a própria senha.

## Atores
- **Admin** (equipe CajuGo): vê e altera as regras.
- **Suporte** (equipe CajuGo): só vê.
- **Lojista, usuário da loja, vendedor, indicador e visitante**: não acessam as telas de regras; só veem os efeitos delas nas outras telas.
- **Qualquer conta conectada**: troca a própria senha.

## Fora de escopo
- O efeito de cada regra nas outras telas: cada spec dona aplica a sua (ex.: tolerância de atraso na 011, taxa CajuGo na 009, regras do Caju Indica na 010, mínimo de fotos e aprovação prévia na 005, taxa do simulador na 007).
- Equipe CajuGo, convite de admin/suporte e logs de atividade gerais da conta [4c] (spec 012).
- Links de campanha do Caju Indica [8f] (spec 010).
- Plano, preço da mensalidade e "Editar plano" [4b] (spec 011).
- Editar nome e endereço (domínio) da Vitrine CajuGo: em [4c] eles só aparecem, porque mudam links, QR codes e SEO e só mudam por deploy.
- Links para a troca de senha nas telas Conta do lojista [3c], do vendedor [13c] e do indicador: entram com essas telas (specs 003, 008 e 010). Nesta spec o link fica em [4c].
- Dados pessoais de [4c] (spec 012).

## Requisitos funcionais
- **CFG-FR-001** O admin vê todas as regras, com o valor atual, agrupadas como em [4c] (Vitrine CajuGo, Rede Caju, Pagamento, Aprovação prévia) e em [8f] (Caju Indica); em Vitrine CajuGo, nome e endereço aparecem só para leitura, e [4c] tem o link para a troca de senha.
- **CFG-FR-002** O admin altera o valor de uma regra e salva; a partir daí o sistema passa a usar o novo valor.
- **CFG-FR-003** Toda regra existe desde o início com o valor provisório do PRD §5.14, exceto chave Pix e favorecido, que começam vazios até o admin preencher; o sistema nunca fica sem valor para as demais regras.
- **CFG-FR-004** Valor fora do formato ou dos limites da regra é recusado, com a mensagem abaixo do campo e sem alterar o valor atual.
- **CFG-FR-005** As regras e seus formatos são: chave Pix (tipo e chave) e favorecido; prazo de conferência do comprovante (dias úteis); tolerância de atraso antes da suspensão (dias); taxa CajuGo por venda via vendedor (%); Caju Indica: programa ativo, quem pode indicar (lojistas, vendedores, indicadores), recompensa (% da mensalidade), duração (meses) e resgate mínimo (R$); taxa do simulador (% ao mês); aprovação prévia (ligada/desligada) e mínimo de fotos; retenção de dados após cancelamento (dias); WhatsApp de atendimento.
- **CFG-FR-006** Cada alteração fica no histórico da regra: quem alterou, quando, valor anterior e valor novo; o admin consulta o histórico de cada regra.
- **CFG-FR-007** A recuperação de senha [6b] passa a usar o WhatsApp de atendimento definido em [4c].
- **CFG-FR-008** Antes de salvar uma nova chave Pix, o admin vê a chave atual e a nova lado a lado e confirma a troca digitando a própria senha.
- **CFG-FR-009** Uma alteração vale só para o que acontecer depois dela: o sistema sabe qual valor de cada regra valia em qualquer data, para que faturas, comissões e recompensas já calculadas mantenham o valor da época.
- **CFG-FR-010** Qualquer conta conectada troca a própria senha informando a senha atual, a nova (mínimo de 8 caracteres) e a confirmação; ao trocar, as sessões dos outros aparelhos são encerradas.

## Requisitos não funcionais
- **CFG-NFR-001** Uma alteração salva passa a valer em todas as telas em até 1 minuto.
- **CFG-NFR-002** As telas de regras e de troca de senha funcionam em 390 px, com alvos de toque de pelo menos 44 px e campos com rótulo.

## Requisitos de segurança e privacidade
- **CFG-SEC-001** Só o admin altera regras; o suporte vê as telas sem os botões e sem conseguir salvar.
- **CFG-SEC-002** Lojista, usuário da loja, vendedor, indicador e visitante não abrem as telas de regras nem alteram regra por nenhum caminho.
- **CFG-SEC-003** O histórico de alterações não pode ser editado nem apagado por ninguém pelo sistema.
- **CFG-SEC-004** A chave Pix e o favorecido não aparecem em nenhuma página pública; só nas telas de pagamento de quem está conectado e nas telas de regras do admin.
- **CFG-SEC-005** A troca da chave Pix com senha errada não salva nada, e as tentativas erradas contam para o bloqueio de login da conta (5 em 15 minutos, spec 001).
- **CFG-SEC-006** Na troca de senha, a senha atual errada não troca nada e as tentativas erradas contam para o mesmo bloqueio; uma conta só troca a própria senha.

## Critérios de aceite
### CFG-FR-001
- **Dado** um admin conectado
- **Quando** ele abre as regras em [4c] e as regras do Caju Indica em [8f]
- **Então** vê cada regra do CFG-FR-005 com o valor atual, nos grupos do desenho

### CFG-FR-002
- **Dado** a tolerância de atraso em 5 dias
- **Quando** o admin muda para 7 e salva
- **Então** a tela mostra 7
- **E** a leitura da regra pelo sistema passa a devolver 7

### CFG-FR-003
- **Dado** um ambiente novo, em que ninguém alterou regras
- **Quando** o sistema lê qualquer regra
- **Então** recebe o valor provisório do PRD §5.14 (ex.: taxa do simulador 1,79% a.m.)
- **E** a chave Pix e o favorecido aparecem para o admin como "não configurados"

### CFG-FR-004
- **Dado** o admin editando as regras
- **Quando** ele informa taxa CajuGo de 150%, mínimo de fotos 0, tolerância de −1 dia ou WhatsApp com 5 dígitos
- **Então** cada valor é recusado com a mensagem no campo
- **E** os valores anteriores continuam valendo

### CFG-FR-005
- **Dado** o admin em [4c] e [8f]
- **Quando** ele confere a lista de regras
- **Então** encontra todas as regras listadas, cada uma com o formato indicado (dias inteiros, porcentagem, valor em reais, ligado/desligado, telefone, chave Pix)

### CFG-FR-006
- **Dado** a taxa CajuGo em 1%
- **Quando** o admin A muda para 1,5% e depois o admin B muda para 2%
- **Então** o histórico da regra mostra as duas mudanças, com quem, quando, de/para, da mais recente para a mais antiga

### CFG-FR-007
- **Dado** o WhatsApp de atendimento alterado em [4c]
- **Quando** alguém abre "Esqueci minha senha" [6b]
- **Então** o botão abre o WhatsApp com o número novo

### CFG-FR-008
- **Dado** uma chave Pix já configurada
- **Quando** o admin informa outra chave e toca em salvar
- **Então** vê a chave atual e a nova lado a lado e precisa digitar a própria senha para confirmar
- **E** se cancelar, a chave atual continua valendo

### CFG-FR-009
- **Dado** a taxa CajuGo em 1% até 10:00 de hoje e alterada para 2% às 10:00
- **Quando** o sistema pergunta o valor da taxa às 09:00 e às 11:00 de hoje
- **Então** recebe 1% e 2%, respectivamente

### CFG-FR-010
- **Dado** um lojista conectado no celular e no computador
- **Quando** ele troca a senha no computador, informando a senha atual certa e uma nova válida
- **Então** passa a entrar só com a nova senha
- **E** a sessão do celular é encerrada

### CFG-FR-010 (validação)
- **Dado** uma conta conectada na troca de senha
- **Quando** a nova senha tem menos de 8 caracteres, a confirmação é diferente ou a nova é igual à atual
- **Então** a troca é recusada com a mensagem no campo e a senha continua a mesma

### CFG-SEC-001
- **Dado** uma conta de suporte
- **Quando** ela abre as telas de regras
- **Então** vê os valores e o histórico, sem botões de salvar
- **E** uma tentativa de salvar por outro caminho é recusada

### CFG-SEC-002
- **Dado** contas de lojista, usuário da loja, vendedor e indicador, e um visitante
- **Quando** cada um tenta abrir as telas de regras ou salvar uma regra
- **Então** vê "sem permissão" (ou o login, no caso do visitante) e nenhuma regra muda

### CFG-SEC-003
- **Dado** um histórico com alterações
- **Quando** qualquer conta, inclusive admin, tenta editá-lo ou apagá-lo
- **Então** não existe ação para isso e o histórico continua igual

### CFG-SEC-005
- **Dado** um admin trocando a chave Pix
- **Quando** ele digita a própria senha errada
- **Então** a chave não muda
- **E** depois de 5 senhas erradas em 15 minutos a conta fica bloqueada como no login

### CFG-SEC-006
- **Dado** uma conta conectada na troca de senha
- **Quando** ela informa a senha atual errada
- **Então** a senha não muda e a tentativa conta para o bloqueio da conta
- **E** não existe caminho para trocar a senha de outra conta por esta tela

### CFG-SEC-004
- **Dado** uma chave Pix configurada
- **Quando** um visitante abre qualquer página pública (vitrine, catálogo, veículo, landings, recuperar senha)
- **Então** a chave Pix e o favorecido não aparecem no conteúdo da página

## Pendências
Nenhuma. Respostas do `/clarify` (2026-10-23): valores provisórios do PRD; mudança vale só daqui para frente; nova chave Pix pede a senha; troca de senha nesta spec, com link em [4c] e nas telas Conta de cada painel quando existirem; alteração vale em até 1 minuto; mensalidade no plano (011); nome e domínio só informativos.
