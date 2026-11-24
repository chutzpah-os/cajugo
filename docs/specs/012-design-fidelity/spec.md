---
id: 012
slug: design-fidelity
title: Fidelidade ao design nas telas já entregues
status: in-progress
owner: dono do produto
created: 2026-11-24
---

# 012 · Fidelidade ao design nas telas já entregues

## Contexto
As specs 001–011b entregaram o comportamento das telas, mas a aparência se afastou do design aprovado (`docs/design/DESIGN.md` e as capturas em `docs/design/telas/`). Na comparação de 2026-11-24 em 390 e 1280 px, os desvios se repetem:
- **Painel do lojista** [1c, 3a, 3c] e **Assinaturas** [4b]: falta o cabeçalho escuro com os KPIs. A Conta não tem o card escuro da assinatura. Os cards de loja e de assinatura não têm a sigla em quadrado escuro.
- **Selos:** esticam na largura toda do card, em vez de ter a largura do texto.
- **Navegação inferior:** cobre o conteúdo e o botão "+ Novo veículo".
- **Desktop** [15b, 15c]: a sidebar é clara e sem a identidade da loja. Meus veículos aparece como lista de cards, e não como a tabela do design.

O dono do produto pediu que o design seja seguido **de forma fiel**. Esta spec adequa ao design tudo o que já foi entregue, sem mudar nenhuma regra de negócio, e deixa a base visual (cabeçalhos, sidebar, cards e selos) para as próximas telas.

Sucesso: cada tela entregue, lado a lado com a captura correspondente em 390 px (e em 1280 px nas telas com versão desktop), tem a mesma estrutura, a mesma ordem dos elementos, os mesmos componentes e os mesmos textos-padrão.

## Atores
- **Lojista**, **usuário da loja**, **vendedor**, **indicador**, **admin**, **suporte** e **visitante**: veem as mesmas telas de hoje, com a aparência do design.

## Fora de escopo
- Regras de negócio, permissões, dados mostrados e rotas: nada muda.
- Telas ainda não implementadas: [4a], [1d], [6g] e [15c] ficam na 012b; [13a–13d] na 009b; [9e], [8f] e [8g] na 010b.
- Telas que a fase 2 desenha de outro jeito: [5d] com cartão, [9c] com código por celular, [6b] com e-mail. Valem as versões do MVP descritas no `DESIGN.md`.
- Nome da marca nas capturas: algumas mostram "CajuCar", e vale **CajuGo**.

## Requisitos funcionais
- **DSG-FR-001** No celular, os painéis do lojista e do vendedor têm o **cabeçalho escuro** do design (subtítulo com o nome da loja ou da pessoa, título da tela e avatar com a sigla), e a barra de navegação inferior fica fixa, com 4 itens (o ativo em `caju`, com a barrinha acima do rótulo), sem cobrir conteúdo nem o botão flutuante.
- **DSG-FR-002** No celular, as telas do admin têm o **cabeçalho claro** do design (logo, selo "ADMIN" e avatar com a sigla), exceto Assinaturas [4b], que usa o cabeçalho escuro com o MRR e os três contadores.
- **DSG-FR-003** No desktop (a partir de 1024 px), os painéis do lojista [15b] e do admin [15c] têm a **sidebar escura**: logo; no lojista, o card da loja (sigla, nome, "Plano Catálogo · status"); itens com o contador de pendências. O conteúdo traz a data ou o nome da loja, o título e a ação principal no alto, à direita.
- **DSG-FR-004** Meus veículos [1c] segue o design: no cabeçalho escuro, 3 KPIs e o card da assinatura (plano, preço, status e próxima cobrança, com o selo); busca com ícone; chips com contagem; card de gestão (miniatura, nome, selo à direita, ano · km, preço, divisória, toggle "Divulgar na CajuGo" com a legenda, **Vendido** e editar com ícone); botão flutuante "+ Novo veículo".
- **DSG-FR-005** Meus veículos no desktop [15b] é uma **tabela**: Veículo (miniatura e nome), Ano · km, Preço, Situação (selo), Vitrine CajuGo (toggle e legenda) e as ações. Acima da tabela, 4 KPIs: Publicados, Contatos no mês, Vendidos no mês e Próxima fatura.
- **DSG-FR-006** Leads [3a], Minha loja [3b] e Conta [3c] seguem as capturas do Turno 03. Na Conta, a ordem é: perfil; card escuro da assinatura (status, preço, próxima cobrança, pagamento e a nota de cancelamento); Faturas; links; Sair; e **Cancelar assinatura** em texto `caju-deep`, discreto, por último.
- **DSG-FR-007** Assinaturas [4b] segue o design: cabeçalho escuro com o MRR e os contadores; card do plano com **Editar plano** em texto `caju-ink`; chips de status; card de assinatura (sigla, nome, "dono · desde mês/ano", selo, rodapé com a informação do status e a ação: Detalhes, Suspender, Reativar ou `wa.me`).
- **DSG-FR-008** A Conta admin [4c] e as filas do admin já entregues ([10b], [7h], [14c], [14e], [12a], [8f]) seguem as capturas dos Turnos 04, 07, 08, 10 e 14.
- **DSG-FR-009** A vitrine e as páginas públicas já entregues seguem as capturas dos Turnos 01, 05, 11, 12, 14 e 15:
  - [1a], [1b], [6d], [11a], [12a–12d], [12g], [14a], [14b], [14d], [15a];
  - a página da loja, a landing [5b] e o cadastro [5c].
- **DSG-FR-010** O pagamento e o Pix seguem as capturas dos Turnos 06, 10 e 12: [5d] versão MVP, [6c], [10a], [10c], [12e], [12f] e [12h].
- **DSG-FR-011** O cadastro e a edição de veículo [2a, 6e] e as confirmações [6f] seguem as capturas dos Turnos 02 e 06. As confirmações abrem como bottom sheet com a alça, o ícone de 48 px na cor do tipo, o título em pergunta, o texto do efeito e os botões na ordem do design.
- **DSG-FR-012** As telas da Rede Caju e do Caju Indica já entregues seguem as capturas dos Turnos 07, 08 e 09: [7a–7h], [8a–8e], [9a], [9b], [9d] e o login [9f].
- **DSG-FR-013** Os componentes base seguem o `DESIGN.md` §3 em todas as telas:
  - selo do tamanho do texto, em caixa alta;
  - botões (primário, escuro, contorno, pequeno, WhatsApp);
  - campos de 50 px;
  - chips em pílula;
  - toggle de 44 × 26;
  - KPI;
  - card de loja com a sigla em quadrado `ink`;
  - linha chave–valor;
  - estado vazio tracejado;
  - tipografia Archivo, com JetBrains Mono na placa, no endereço do catálogo e nas chaves (§2.2).
- **DSG-FR-014** Os textos-padrão do `DESIGN.md` §6 e §8 aparecem como escritos lá, nas telas onde se aplicam.
- **DSG-FR-015** Tela entregue sem captura própria (por exemplo, Nova senha, página pública da loja com capa ou extrato do vendedor) usa os padrões do `DESIGN.md` §8 da tela desenhada mais parecida, registrada na comparação.

- **DSG-FR-016** Quando a captura mostra algo que uma spec posterior decidiu de outro jeito, vale a **captura na aparência** (estrutura, componente, posição, estilo) e a **spec no conteúdo** (o que aparece e o que a ação faz). Exemplos:
  - [3c] mostra "Pix manual" onde a captura tem "Pix automático", e não tem o "Alterar";
  - [4b] mostra os filtros Cancelamento agendado e Canceladas, como chips do mesmo estilo;
  - no painel do lojista, o item da navegação é "Leads" (PRD) e o KPI do desktop é "Contatos no mês" (captura [15b]).
- **DSG-FR-017** Telas do painel do lojista, do vendedor, do indicador e do admin sem captura de desktop seguem o padrão de [15b]/[15c] a partir de 1024 px: sidebar escura, título e ação principal no alto, KPIs em cards brancos, listas longas em tabela e cards e formulários em colunas largas (até 2), sem só esticar a versão mobile.

- **DSG-FR-018** (pedido do dono do produto, 2026-11-24) A busca por marca e por cidade faz parte da própria vitrine, sem levar a outra tela:
  - os links "Buscar por marca" e "Buscar por cidade" saem da vitrine; as páginas de descoberta da 006b continuam no ar só para o Google;
  - os filtros de lista são **checkbox com tipo e subtipo**: Marca → Modelos, Estado → Cidades, além de Câmbio e Combustível;
  - o tipo marcado vale para todos os subtipos, e os subtipos aparecem embaixo do tipo marcado;
  - com mais de 5 linhas, a lista rola dentro do grupo.

- **DSG-FR-019** (pedido do dono do produto, 2026-11-24) Leads [3a] tem também os filtros **Vendido** e **Perdido**, com a contagem, depois de Negociando: a soma dos chips bate com Todos.

## Requisitos não funcionais
- **DSG-NFR-001** Para cada tela desta spec, fica registrada a comparação lado a lado (captura do design × tela entregue) em 390 px e, quando há versão desktop, em 1280 px, sem nenhuma diferença de estrutura, ordem ou componente que não esteja justificada por escrito.
- **DSG-NFR-002** A adequação não piora a acessibilidade: alvos de toque ≥ 44 px, sem rolagem horizontal, campos com rótulo e contraste mínimo de 4,5:1 (`DESIGN.md` §7) continuam valendo em todas as telas.
- **DSG-NFR-003** A adequação não piora o desempenho das páginas públicas: o LCP continua abaixo de 2,5 s em 4G, e as regras de SEO continuam valendo (`SEO.md`).

- **DSG-NFR-004** Os dados de teste usados na comparação (seed dos e2e e capturas da tela entregue) mostram fotos de carros, como as de `docs/design/carexamplesimages`, e não a foto genérica de hoje.

## Requisitos de segurança e privacidade
- **DSG-SEC-001** A mudança visual não mostra nenhum dado novo: o que hoje é mascarado ou escondido (CPF/CNPJ, chave Pix, celular de vendedor não parceiro, motivo da suspensão no público) continua assim em todas as telas, e a loja B continua sem ver nada da loja A.

## Critérios de aceite
### DSG-FR-001
- **Dado** o lojista em Meus veículos em 390 px
- **Quando** ele rola a lista até o fim
- **Então** o cabeçalho escuro mostra o nome da loja, "Meus veículos" e o avatar com a sigla
- **E** a barra inferior fica fixa, sem cobrir o último card nem o "+ Novo veículo"

### DSG-FR-002
- **Dado** o admin em 390 px
- **Quando** ele abre a Conta admin e depois Assinaturas
- **Então** a Conta tem o cabeçalho claro com o logo, o selo "ADMIN" e o avatar
- **E** Assinaturas tem o cabeçalho escuro com o MRR e os contadores Em dia, Atrasadas e Suspensas

### DSG-FR-003
- **Dado** o lojista e o admin em 1280 px
- **Quando** abrem os painéis
- **Então** veem a sidebar escura; o lojista também vê o card da loja com a sigla, o nome e "Plano Catálogo · em dia"
- **E** os itens com pendência mostram o contador

### DSG-FR-004
- **Dado** a loja com veículos publicados, rascunho e vendido
- **Quando** o lojista abre Meus veículos em 390 px
- **Então** a tela tem a estrutura da captura [1c], e o selo de cada card tem a largura do texto, à direita do nome

### DSG-FR-005
- **Dado** a mesma loja
- **Quando** o lojista abre Meus veículos em 1280 px
- **Então** vê a tabela com as colunas Veículo, Ano · km, Preço, Situação, Vitrine CajuGo e ações, e os 4 KPIs com Próxima fatura

### DSG-FR-006
- **Dado** a loja ativa
- **Quando** o lojista abre a Conta em 390 px
- **Então** vê, nesta ordem: o perfil, o card escuro da assinatura com a nota de cancelamento, as Faturas, os links, Sair e "Cancelar assinatura" discreto por último

### DSG-FR-007
- **Dado** lojas em dia, atrasadas e suspensas
- **Quando** o admin abre Assinaturas em 390 px
- **Então** cada card mostra a sigla, "dono · desde mês/ano", o selo e o rodapé com a informação e a ação do status

### DSG-FR-008
- **Dado** o admin
- **Quando** abre a Conta admin e as filas de pagamentos, vendedores, aprovação, denúncias, alertas e regras do Caju Indica
- **Então** cada tela tem a estrutura da captura correspondente

### DSG-FR-009
- **Dado** um visitante
- **Quando** abre a vitrine, um veículo, os filtros, o menu, os favoritos, o simulador, a página da loja, a landing e o cadastro, em 390 e 1280 px
- **Então** cada tela tem a estrutura da captura correspondente

### DSG-FR-010
- **Dado** um lojista no fluxo de pagamento
- **Quando** passa por [5d], [6c], [10a], [10c] e pelos estados [12e], [12f] e [12h]
- **Então** cada tela tem a estrutura da captura correspondente

### DSG-FR-011
- **Dado** o lojista
- **Quando** cadastra, edita e marca um veículo como vendido
- **Então** [2a] e [6e] seguem as capturas do Turno 02 e 06, e a confirmação de vendido abre como bottom sheet com o ícone verde e o texto do efeito

### DSG-FR-012
- **Dado** um vendedor e um indicador
- **Quando** abrem as telas deles
- **Então** cada tela tem a estrutura da captura correspondente dos Turnos 07–09

### DSG-FR-013
- **Dado** qualquer tela entregue
- **Quando** mostra um selo, um botão, um campo, um chip, um toggle ou um KPI
- **Então** o elemento tem as medidas e as cores do `DESIGN.md` §3

### DSG-FR-014
- **Dado** a confirmação de cancelamento, a de vendido e a nota da parcela
- **Quando** aparecem
- **Então** os textos são os do `DESIGN.md` §6

### DSG-FR-015
- **Dado** a tela Nova senha, que não tem captura
- **Quando** é adequada
- **Então** segue o padrão de [6a]/[9f] e a escolha fica registrada na comparação

### DSG-SEC-001
- **Dado** a loja B logada e a vitrine pública
- **Quando** as telas novas aparecem
- **Então** o CPF/CNPJ continua mascarado, a chave Pix continua escondida e nada da loja A aparece para a loja B

### DSG-FR-016
- **Dado** a captura [3c] com "Pagamento: Pix automático" e "Alterar"
- **Quando** a Conta é adequada
- **Então** o card escuro da assinatura tem a estrutura e o estilo da captura, mostra "Pix manual" e não tem "Alterar"

### DSG-FR-017
- **Dado** o lojista em Leads em 1280 px
- **Quando** abre a tela
- **Então** vê a sidebar escura, o título com os KPIs em cards brancos e os leads em tabela ou em cards largos, e não a coluna mobile esticada

### DSG-FR-018
- **Dado** a vitrine com BMW (X1 e 320i), Fiat, lojas em Aracaju/SE e Recife/PE
- **Quando** o visitante marca BMW e desmarca o 320i, e marca Sergipe
- **Então** a lista mostra só BMW X1 de Aracaju, a BMW aparece "em parte", e nenhuma outra tela abre
- **E** um grupo com mais de 5 linhas rola dentro dele

### DSG-FR-019
- **Dado** a loja com um lead Vendido
- **Quando** o lojista abre Leads
- **Então** vê o chip "Vendido 1" e, ao tocar, só o lead vendido

## Pendências
Nenhuma. Resolvidas no `/clarify` de 2026-11-24, com as opções recomendadas (instrução do dono do produto de seguir sem parar):
- captura na aparência, spec no conteúdo (DSG-FR-016);
- telas sem captura de desktop seguem o padrão de [15b]/[15c] (DSG-FR-017);
- ordem de entrega: primeiro a base (componentes, cabeçalhos, navegação e sidebar) e os painéis do lojista e do admin, que a 012b reaproveita; depois as páginas públicas, cuidando do SEO (DSG-NFR-003);
- fotos de carro nos dados de teste (DSG-NFR-004);
- fontes: Archivo e JetBrains Mono já carregam, e a regra entrou em DSG-FR-013.
