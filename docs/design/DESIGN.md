# CajuGo — Documento de Design (UI/UX)

Versão 2.0 · 23/10/2026 · MVP (incorpora as telas 7a–15c do PRD v2)
Fonte visual: `CajuGo Telas.dc.html` (nesta pasta, telas 1a–6g) e as capturas em `telas/` (todas, incluindo 7a–15c); ids entre colchetes.
Requisitos de produto: `../PRD.md`.

---

## 1. Princípios

1. **Mobile first.** Tudo é desenhado em 390 × 844 e ampliado para desktop depois.
2. **O carro é o protagonista.** Foto grande, preço forte, ficha escaneável. Pouco ornamento.
3. **Uma ação principal por tela**, sempre em laranja caju e, quando for fluxo, fixa no rodapé.
4. **Estado sempre visível.** Selos de status (Publicado, Em dia, Novo…) e legendas explicam o que acontece ("Visível na vitrine CajuGo", "Removido de todos os catálogos").
5. **Sem surpresa no dinheiro.** Preço do plano, cobrança e "cancele a qualquer momento" aparecem antes e depois de assinar.
6. **Referência de mercado:** padrões de marketplace automotivo brasileiro (cards com foto, ano/km/cidade, preço + parcela, ficha técnica em grade), com identidade própria.

---

## 2. Fundamentos visuais

### 2.1 Cores
| Token | Hex | Uso |
|---|---|---|
| `ink` | `#1C1B20` | Texto principal, botões secundários sólidos, cabeçalhos escuros, chips ativos |
| `ink-2` | `#2B2930` | Cards sobre fundo escuro |
| `ink-3` | `#3A3840` | Avatares/superfícies em fundo escuro |
| `text-2` | `#4A4750` | Texto secundário |
| `text-3` | `#6B6872` | Legendas, rótulos de ficha |
| `text-4` | `#8A857D` | Placeholder, ícones de navegação |
| `on-dark-2` | `#B7B3BC` | Texto secundário em fundo escuro |
| `bg` | `#F4F2EF` | Fundo das telas (neutro quente) |
| `surface` | `#FFFFFF` | Cards, seções |
| `line` | `#E6E2DC` | Bordas de card, divisores de seção |
| `line-2` | `#EFECE7` | Divisores internos de lista |
| `field` | `#D9D4CC` | Borda de input e chips inativos |
| `field-dash` | `#C9C3BA` | Bordas tracejadas (upload, estado vazio) |
| `caju` | `#E8551E` | CTA principal, toggles ligados, item ativo da nav, destaque do logo |
| `caju-ink` | `#C8431A` | Links e ações em texto |
| `caju-deep` | `#B23C12` | Texto sobre `caju-soft` |
| `caju-soft` | `#FDEBE3` | Fundo de selos/ícones laranja |
| `caju-tint` | `#FFF6F1` | Fundo de opção selecionada |
| `castanha` | `#F5B400` | Ponto amarelo do logo, destaque em fundo escuro |
| `ok` / `ok-soft` | `#146B45` / `#E3F3EA` | Sucesso, "Em dia", "Abaixo da FIPE", "Publicado", "Pago" |
| `warn` / `warn-soft` | `#8A5A00` / `#FFF3D1` | "Atrasada", "Em contato" |
| `info` / `info-soft` | `#1E4E9C` / `#E6EEFB` | "Negociando" |
| `neutral-soft` | `#EEECEA` | "Rascunho", "Suspensa", "Em breve" |
| `whatsapp` | `#1FA855` | Botão WhatsApp |
| `canvas` | `#E9E6E1` | Fundo do documento de telas (não é do produto) |

### 2.2 Tipografia
- **Archivo** (400, 500, 600, 700, 800) para toda a interface.
- **JetBrains Mono** 500 para placa, slug/URL do catálogo e etiquetas técnicas.

| Estilo | Tamanho / peso | Uso |
|---|---|---|
| Display | 32 / 800, -0.03em | Título da landing |
| H1 | 24–26 / 800, -0.02em | Título de tela, título do veículo |
| Preço grande | 24–28 / 800 | Preço no card e na página do veículo |
| H2 | 16–20 / 800 | Título de seção |
| Título de card | 15–18 / 800 | Nome do veículo/loja/lead |
| Corpo | 15 / 400–500 | Inputs, parágrafos |
| Corpo pequeno | 13–14 / 400–600 | Metadados, descrições |
| Legenda | 11–12 / 500–700 | Rótulos de ficha, notas |
| Selo | 10–11 / 700, caixa alta, +0.03em | Status e selos |

Nome do veículo em caixa alta (MARCA MODELO). Na página do veículo, modelo em laranja: "FIAT **500**".

### 2.3 Espaçamento, raios e sombras
- Espaçamento base 4: 4, 6, 8, 10, 12, 14, 16, 20, 24.
- Margem lateral das telas: **16 px** (landing: 20 px).
- Raios: selo 5–6; chip 17–19 (pílula); input 10; botão 12; card 14–16; folha superior 20; FAB 27.
- Sombras: só no FAB (`0 10px 24px -8px rgba(232,85,30,.6)`) e no knob do toggle. Cards usam borda `line`, sem sombra.

### 2.4 Iconografia
Traço 1,8–2,4 px, cantos arredondados, 14–22 px (estilo Lucide/Feather). Ícones usados: coração, menu, busca, filtro, chevrons, calendário, velocímetro, pin, compartilhar, lápis, +, X, WhatsApp, telefone, bandeira (denúncia), cadeado, check, carro.

### 2.5 Imagens
- Proporção do card: 390 × 220 (≈ 16:9); galeria: 300 px de altura; miniaturas 88 × 68 e 64 × 50.
- `object-fit: cover`; fundo de fallback listrado neutro (`#E4E0D9`/`#DDD8D0`) enquanto carrega ou sem foto.
- Contador "1/N" em pílula escura translúcida no canto inferior esquerdo.

---

## 3. Componentes

| Componente | Especificação |
|---|---|
| **Botão primário** | 50 px de altura, raio 12, fundo `caju`, texto branco 15/700. Estado desabilitado: opacidade 0,4. |
| **Botão escuro** | Igual, fundo `ink` ("Ver detalhes", "Ver parcelas", "Buscar dados"). |
| **Botão contorno** | Borda 1,5 px `ink`, fundo transparente ("Carregar mais", "Salvar rascunho", "Ver estoque da loja"). |
| **Botão WhatsApp** | Fundo `whatsapp`, ícone + "WhatsApp". |
| **Botão pequeno** | 34–40 px, raio 9–10, borda `field` ("Vendido", "Recibo", editar). |
| **FAB** | 54 px, pílula, `caju`, "+ Novo veículo", 16 px acima da nav. |
| **Input** | 50 px, raio 10, borda `field`, padding 14; rótulo 13/600 acima com gap 6; texto de ajuda 12 `text-3`; placeholder `text-4`. Select tem chevron à direita. Foco: borda 1,5 `ink`. Erro: borda e ajuda em `caju-deep`. |
| **Input com prefixo** | Prefixo em fundo `bg` com divisória ("cajugo.vercel.app/loja/"; com domínio próprio, "cajugo.com.br/loja/"). |
| **Input de preço** | 56 px, borda 1,5 `ink`, "R$" em `text-3` + valor 20/800. |
| **Textarea** | Altura mínima 92–132, contador à direita abaixo. |
| **Chip de filtro** | 34–36 px, pílula; inativo: fundo branco, borda `field`; ativo: fundo e borda `ink`, texto branco; contagem com opacidade 0,6. |
| **Chip de item (multisseleção)** | 38 px, pílula; selecionado mostra "✓ " + fundo `ink`. |
| **Segmentado Sim/Não** | Trilho `bg` raio 10 com 2 botões de 52 × 34; ativo "Sim": fundo `ink`/texto branco; ativo "Não": fundo branco/texto `ink`. |
| **Toggle** | 44 × 26, knob 20; ligado `caju`, desligado `field`; transição 0,2 s. Sempre com título + legenda à esquerda; a linha inteira é clicável. |
| **Checkbox** | 22 px, raio 6; marcado fundo `ink` com check branco. |
| **Selo** | Caixa alta 10–11/700, padding 3–4 × 7–8, raio 6, pares de cor da tabela 2.1. |
| **Card de veículo (vitrine)** | Branco, borda `line`, raio 16; foto 220 px; corpo com padding 14/16 e gap 10; ordem: selo → nome/versão → metadados com ícones → loja (vitrine) → preço/parcela → botão. |
| **Card de veículo (gestão)** | Miniatura + nome + selo de status + ano·km + preço; divisória; toggle "Divulgar na CajuGo" + ações. |
| **Card de lead** | Avatar com sigla, nome, tempo, veículo, selos status/origem, balão da mensagem em `bg`, ações. |
| **Card de loja / assinatura** | Sigla em quadrado `ink` raio 11, nome, dono · cidade, selo; rodapé com informação + ação. |
| **KPI** | Número 20–22/800 + rótulo 11–12; em fundo escuro usa `ink-2`; em claro usa branco com borda. |
| **Cabeçalho escuro** | Fundo `ink`, padding superior 52 (área de status), subtítulo `on-dark-2` 12 + título 24/800. Usado nas telas de lojista e em Assinaturas. |
| **Cabeçalho claro** | Branco com borda inferior; logo + selo "Admin" nas telas admin; título + ação nas telas de formulário. |
| **Barra de progresso** | Segmentos de 4 px, raio 2, gap 6; concluído `caju`, pendente `line`. |
| **Barra fixa inferior** | Branca, borda superior `line`, padding 12/16/28; 1–2 botões. |
| **Navegação inferior** | 4 itens em grade; ativo em `caju` com barrinha de 22 × 4 acima do rótulo; inativo `text-3`. |
| **Gaveta (menu)** | 318 px pela direita, overlay `rgba(28,27,32,.55)`. |
| **Estado vazio** | Card com borda tracejada `field-dash`, ícone em quadrado `caju-soft`, título 17/800, texto 14, CTA primário. |
| **Lista de configurações** | Linhas de 52 px com divisória `line-2` e chevron. |
| **Bottom sheet** | Fundo branco, raio 20 no topo, alça 40 × 4 `field`; overlay `rgba(28,27,32,.55)`; título 18–20/800; rodapé com 1–2 botões. Usado em filtros [6d] e confirmações [6f]. |
| **Opção de rádio (lista)** | 44 px, raio 10, borda 1,5 `field`; selecionada: borda `ink`, fundo `bg`, ponto 10 px `ink`. |
| **Slider** | Trilho 4 px `line`, preenchido `caju`, manopla 24 px branca com borda 2 px `caju`. |
| **Aviso de status em pílula** | 32 px, pílula, par de cores do status + ponto de 8 px ("Aguardando pagamento · expira em 29:12"). |
| **Linha de seção editável** | 60 px, título 15/700 + resumo 13 `text-3` truncado + "Editar" em `caju-ink`. |
| **Linha chave–valor** | 40 px, chave `text-3` à esquerda, valor 600 à direita, divisória `line-2`. |
| **Logo** | "caju" em `ink` + "go" em `caju`, 21/800, -0.03em; símbolo: círculo `caju` com ponto `castanha` (a castanha do caju). |

---

## 4. Padrões de UX

- **Toque**: alvos ≥ 44 px; ações destrutivas nunca ficam no mesmo lugar do CTA principal.
- **Rolagem**: cabeçalhos com busca/filtros fixos no catálogo; barras de ação fixas no rodapé em formulários, página do veículo e landing.
- **Filtros**: chips abrem bottom sheet com opções e "Aplicar"; contador no chip "Filtros".
- **Feedback**: toast curto após salvar/enviar ("Veículo publicado", "Mensagem enviada"); autosave com "Rascunho salvo" no cabeçalho do formulário.
- **Confirmações**: marcar vendido, cancelar assinatura, suspender loja, ocultar veículo → diálogo com texto do efeito ("O veículo sai do seu catálogo e da vitrine CajuGo").
- **Carregamento**: skeletons no formato do conteúdo (cards, linhas); nunca spinner de tela cheia após o primeiro carregamento.
- **Erros**: mensagem abaixo do campo; erro de rede em faixa com "Tentar novamente".
- **Estados desabilitados** explicam o motivo na legenda (ex.: "Publique para liberar").
- **Links profundos**: toda tela pública tem URL compartilhável; o compartilhamento usa o menu nativo do celular.
- **Desktop**: catálogo em grade de 2–4 colunas com filtros em coluna lateral; página do veículo com galeria larga e coluna fixa de preço + formulário; painéis com navegação lateral em vez da barra inferior.

---

## 5. Telas em detalhe

Para cada tela: objetivo · estrutura (de cima para baixo) · interações · estados.

### [1a] Catálogo
**Objetivo:** encontrar um veículo rápido.
**Estrutura:** cabeçalho fixo (logo ou identidade da loja, ♡, ☰) → busca → chips de filtro → título + contador + ordenação → cards de veículo → "Carregar mais veículos" → nota da parcela.
**Interações:** ☰ abre [5a]; card/"Ver detalhes" abre [1b]; ♡ favorita; chips abrem bottom sheets.
**Estados:** modo CajuGo × Lojista (ver PRD §7); skeleton; vazio; erro.

### [1b] Página do veículo
**Objetivo:** decidir e contatar.
**Estrutura:** galeria 300 px com voltar/compartilhar/♡ e contador → folha branca sobreposta (raio 20) com selos, título, versão, bloco de preço com "Simular" → ficha em grade de 2 colunas (Cidade em linha inteira) → Sobre este carro → Itens (chips) → card da loja → formulário de mensagem → denunciar → barra fixa WhatsApp + Ver parcelas.
**Interações:** swipe na galeria; tocar na foto abre tela cheia com zoom; WhatsApp abre o app; formulário envia lead.
**Estados:** enviando/enviado/erro no formulário; veículo indisponível.

### [5a] Menu (substituído por [11a])
**Objetivo:** entrada para login e para vender com a CajuGo.
**Estrutura:** logo + fechar → Entrar (contorno) → card escuro "Para lojistas · Divulgar meus veículos" → links.
**Interações:** toque fora ou X fecha; card leva a [5b].

### [5b] Landing lojistas
**Objetivo:** converter lojista em assinante em uma rolagem curta.
**Estrutura:** hero escuro (logo, Entrar, título, subtítulo, foto) → "O que você recebe" (4 itens numerados) → card do plano com borda 2 px `ink` → FAQ → barra fixa com preço + Prosseguir.
**Tom de texto:** direto, sem jargão; foco em "seu link", "sua vitrine", "sem comissão", "cancele quando quiser".

### [5c] Cadastro 1/2
**Objetivo:** criar conta e loja com o mínimo de campos.
**Estrutura:** cabeçalho com voltar, título "Criar conta da loja", "1 de 2" e barra de progresso → seção "Sua loja" (nome, cidade, WhatsApp, endereço do catálogo com prefixo e "Disponível") → seção "Responsável" (nome, e-mail, celular, senha, aceite de termos) → barra fixa "Continuar para pagamento".
**Micro-interações:** slug sugerido ao digitar o nome; verificação ao vivo; máscara de telefone; mostrar/ocultar senha.

### [5d] Pagamento 2/2
**Objetivo:** assinar com confiança.
**Estrutura (MVP):** cabeçalho com "2 de 2" → card escuro de resumo (plano, R$ 100/mês, vencimento, sem fidelidade, ✓ cancelar a qualquer momento) → forma de pagamento: só Pix → CPF/CNPJ → barra fixa "Pagar com Pix · R$ 100" → [6c].
**Fase 2:** seleção Pix automático | cartão (é o que o desenho antigo da tela mostra).

### [5e] Catálogo vazio + onboarding
**Objetivo:** levar ao primeiro veículo.
**Estrutura:** cabeçalho escuro + banner verde "Assinatura ativa. Sua loja está no ar." com link → checklist "Primeiros passos" → estado vazio com CTA → nav (Veículos ativo).

### [1c] Meus veículos
**Objetivo:** controlar estoque e divulgação.
**Estrutura:** cabeçalho escuro com 3 KPIs e card da assinatura → busca → chips de status → cards de gestão → FAB → nav.
**Interações:** toggle Divulgar; Vendido (confirmação); editar abre [2a].

### [2a] Novo veículo
**Objetivo:** cadastrar completo em poucos minutos no celular.
**Estrutura:** cabeçalho (X, "Novo veículo", "Rascunho salvo") → Fotos (capa 2×2 + miniaturas + Adicionar) → Identificação (placa + Buscar dados; marca, modelo, versão, anos) → Ficha técnica (grade 2 colunas) → Preço (input grande, card FIPE verde, toggle parcela) → Condições (Sim/Não) → Itens (chips) → Descrição → Divulgação (card com toggle destacado + WhatsApp) → barra fixa Salvar rascunho / Publicar.
**Ordem pensada para velocidade:** fotos primeiro (o lojista já está com o carro na frente), depois dados que a placa/FIPE podem preencher sozinhos.

### [3a] Leads
**Objetivo:** responder rápido e acompanhar negociações.
**Estrutura:** cabeçalho escuro com 2 KPIs → chips de status → cards de lead → nav (Leads ativo).
**Interações:** WhatsApp abre conversa com mensagem pronta citando o veículo; avanço de status em um toque.

### [3b] Minha loja
**Objetivo:** deixar a vitrine da loja bonita e fácil de compartilhar.
**Estrutura:** capa 170 px com "Trocar capa" → logo sobreposto + nome + cidade → Ver como cliente / Compartilhar → card laranja-claro com QR e link → Informações públicas → Horário → Preferências (toggle) → Salvar → nav.

### [3c] Conta
**Objetivo:** transparência de cobrança e configurações pessoais.
**Estrutura:** perfil → card escuro da assinatura (status, preço, próxima cobrança, pagamento, alterar, nota de cancelamento) → Faturas → Notificações de novo lead (toggles) → links → Sair + "Cancelar assinatura" (texto em `caju-deep`, discreto) → nav.

### [4a] Painel admin
**Objetivo:** saúde do negócio em 5 segundos.
**Estrutura:** cabeçalho claro com logo + "Admin" + saudação → KPIs 2×2 → "Precisa de atenção" (contador colorido + título + detalhe + chevron) → barra de origem de leads → top lojas → nav (Painel ativo).

### [1d] Lojas / Veículos CajuGo / Usuários
**Estrutura:** cabeçalho claro com abas sublinhadas (ativa: borda inferior 2,5 px `caju`) → conteúdo da aba → nav (Lojas ativo).

### [4b] Assinaturas
**Estrutura:** cabeçalho escuro com MRR e 3 contadores → card do plano com "Editar plano" → chips de status → cards de assinatura com ação contextual (Detalhes / Suspender / Reativar) → nav.

### [4c] Conta admin
**Estrutura:** perfil → Equipe CajuGo (+ Convidar) → Vitrine CajuGo (campos + toggle de aprovação + mínimo de fotos) → Rede Caju (taxa CajuGo %, link para vendedores; sem selo "Em breve") → Pagamento (chave Pix, prazos, taxa do simulador) → Caju Indica (link para regras) → links → Sair → nav.

### [6a] Entrar (substituída por [9f])
**Objetivo:** entrar em 2 campos.
**Estrutura:** voltar + logo → título "Entrar" + subtítulo → E-mail (foco) → Senha com "Mostrar" → "Esqueci minha senha" à direita → botão primário → espaço → divisória e "Ainda não tem conta de lojista?" + botão contorno "Divulgar meus veículos".
**Estados:** erro de credenciais abaixo da senha; bloqueio temporário; carregando no botão.

### [6b] Recuperar senha
**MVP:** voltar → título "Recuperar senha" → texto "Para criar uma nova senha, fale com o suporte CajuGo." → botão WhatsApp. (A tela desenhada, com e-mail e "Link enviado", fica para a fase 2.)
**Nova senha** (após login com senha temporária): título "Crie uma nova senha" → Senha → Confirmar senha → botão primário "Salvar e entrar".

### [6c] Pix manual
**Objetivo:** pagar e mandar o comprovante sem sair do fluxo.
**Estrutura:** cabeçalho "Pague com Pix" → card com valor 30/800, QR estático 200 px, chave Pix em JetBrains Mono com botão escuro "Copiar", favorecido → "Como pagar" em passos numerados → área de upload tracejada (`field-dash`) "Anexar comprovante" (foto ou PDF) com pré-visualização → nota "Conferimos o comprovante em até 1 dia útil." → rodapé "Enviar comprovante" (primário, desabilitado até ter arquivo).
**Estados:** copiado; arquivo anexado; enviando; enviado → [10a].

### [6d] Filtros
**Estrutura:** bottom sheet a partir de 96 px do topo → Ordenar por → Marca (+ Ver todas) → Preço de/até → Ano de/até → Km (slider) → Câmbio → Combustível → rodapé Limpar / Ver N veículos.
**Interações:** chips de seleção múltipla mostram "✓"; ordenação é seleção única; contagem atualiza ao vivo; arrastar a alça para baixo fecha.

### [6e] Editar veículo
**Objetivo:** ajustar um anúncio publicado sem rolar um formulário longo.
**Estrutura:** cabeçalho com "Alterado há N min" → resumo do anúncio com selos → faixa com 3 métricas → lista de seções editáveis → toggle "Divulgar na CajuGo" → ações (vendido em verde, despublicar neutro, excluir em `caju-deep`) → rodapé Ver anúncio / Salvar alterações.

### [6f] Diálogos de confirmação
**Padrão:** bottom sheet → ícone 48 px em quadrado (cor pelo tipo: verde vendido, laranja cancelar, amarelo suspender, neutro ocultar) → título em pergunta → texto do efeito concreto → nota ou lista de motivos → botão de confirmação (vermelho `caju-deep` para ações que tiram algo do ar por decisão de pagamento; escuro para as demais) → botão contorno para voltar.
**Regra de texto:** sempre dizer o que acontece com o catálogo da loja e com a vitrine CajuGo.

### [6g] Detalhe da loja (admin)
**Estrutura:** cabeçalho claro com "← Lojas" → identidade da loja + selo de status + link → 3 KPIs → card Dono (chave–valor) → card Assinatura (chave–valor + Faturas) → card Veículos (miniaturas + Ocultar + Ver todos) → lista de ações com "Suspender loja" em `caju-deep` por último → nav (Lojas ativo).

---

## 6. Textos-padrão (microcopy)

| Contexto | Texto |
|---|---|
| Nota de parcela | *Valor estimado. Simule a sua parcela. |
| Mensagem padrão do lead | Olá, tenho interesse no veículo. Por favor entre em contato. |
| Legenda toggle — publicado ligado | Visível na vitrine CajuGo |
| — publicado desligado | Só no seu catálogo |
| — rascunho | Publique para liberar |
| — vendido | Removido de todos os catálogos |
| Divulgação no cadastro | O veículo aparece também na vitrine CajuGo. Vendas e edições feitas aqui atualizam os dois catálogos. |
| Placa | A placa não aparece no anúncio. Só o final é exibido. |
| Fotos | Arraste para reordenar. A primeira foto é a capa do anúncio. |
| Cancelamento | Você pode cancelar a assinatura a qualquer momento. O catálogo fica no ar até o fim do mês já pago. |
| Pix | Pague com Pix usando a chave ou o QR abaixo e envie o comprovante. |
| Sucesso da assinatura | Assinatura ativa. Sua loja está no ar. |
| Catálogo vazio | Seu catálogo está vazio · Cadastre o primeiro veículo para ele aparecer no seu link e, se quiser, na vitrine CajuGo. |
| Vitrine admin | Veículos liberados pelos lojistas. Alterações e vendas feitas pela loja atualizam esta lista automaticamente. |
| Aprovação prévia | Anúncios liberados pelos lojistas entram numa fila de revisão. |
| Recuperar senha (MVP) | Para criar uma nova senha, fale com o suporte CajuGo. |
| Link enviado | Confira sua caixa de entrada e o spam. O link vale por 1 hora. |
| Pix (após envio) | Assim que confirmarmos o pagamento, sua loja entra no ar. |
| Confirmar vendido | O veículo sai do seu catálogo, da vitrine CajuGo e dos links dos vendedores na hora. Você pode desfazer em até 7 dias. |
| Confirmar cancelamento | Seu catálogo e seus veículos na vitrine ficam no ar até {data}, fim do mês já pago. Depois disso saem do ar. Não há multa. |
| Confirmar suspensão | O catálogo da loja e os veículos dela na vitrine CajuGo saem do ar. O lojista vê um alerta no painel e pode pagar para reativar. |
| Confirmar ocultar | O veículo continua no catálogo da loja. O lojista é avisado com o motivo. |

---

## 7. Acessibilidade

- Contraste mínimo 4,5:1 para texto (os pares de selo da tabela 2.1 atendem).
- Toggles e segmentados com `role="switch"`/`radiogroup` e `aria-checked`.
- Galeria com `aria-label` "Foto X de N" e botões anterior/próximo acessíveis por teclado no desktop.
- Todo ícone isolado tem rótulo acessível (favoritar, compartilhar, menu, fechar, editar).
- Foco visível (anel 2 px `ink` com 2 px de afastamento).
- Não depender só de cor: selos sempre têm texto.

---

## 8. Telas adicionadas no MVP v2

| Turno | Telas | Resumo |
|---|---|---|
| 7 · Rede Caju | 7a–7h | Cadastro do vendedor (em análise), painel, vitrine com comissão e link, extrato, configuração de comissão do lojista, gestão de parceiros, confirmação de venda com taxa CajuGo, admin de vendedores |
| 8 · Caju Indica | 8a–8g | Página do lojista, acompanhamento, landing do link, cadastro com código, extrato de crédito, regras e pagamentos no admin |
| 9 · Conta de indicador | 9a–9f | Banner e rodapé na vitrine, cadastro rápido, código por celular (fase 2), painel, resgate Pix, login único (substitui 6a; no MVP só a aba "E-mail e senha") |
| 10 · Pix manual | 10a–10c | Pagamento em análise, fila de comprovantes no admin, fatura do mês |
| 11 · Menu | 11a | Menu da home: Comprar veículos, Produtos (Catálogo, Rede Caju), Caju Indica, Favoritos, Entrar |
| 12 · Estados e casos | 12a–12i | Busca sem resultado, sem conexão, carregamento, veículo indisponível, comprovante recusado, loja suspensa (lojista e público), cancelar assinatura, termos e privacidade |
| 13 · Rede Caju (lojista) | 13a–13d | Vendedores disponíveis, perfil do vendedor, conta do vendedor, denúncia |
| 14 · Comprador e moderação | 14a–14e | Favoritos, simulador, aprovação prévia (admin), denunciar anúncio, denúncias (admin) |
| 15 · Desktop | 15a–15c | Vitrine, painel do lojista e admin em 1280 px |

Requisitos detalhados de cada tela: `../PRD.md` §7. Capturas: `telas/`.

**Padrões reaproveitados:** cabeçalho escuro com KPIs (painéis), cabeçalho branco com voltar (telas internas), bottom sheet (diálogos, simulador, denúncias), selos de status (verde `ok` = confirmado/ativo; amarelo `warn` = pendente/em análise; laranja `caju-soft`/`caju-deep` = problema/recusado; cinza `neutral-soft` = neutro), campos de 50 px, CTA laranja fixo no rodapé, área de upload tracejada (comprovante), botões `wa.me` em verde `whatsapp` para os avisos manuais.

**Desktop (≥ 1024 px):** vitrine com header (busca + menu), filtros em coluna lateral e grid de 3 colunas [15a]; painéis do lojista e do admin com **sidebar** no lugar da barra inferior, contadores de pendências e filas com ações inline [15b, 15c].

**Microcopy novo:**
| Contexto | Texto |
|---|---|
| Pagamento em análise | Comprovante recebido. Estamos conferindo. |
| Pix manual | Conferimos o comprovante em até 1 dia útil. |
| Comprovante recusado | Não conseguimos confirmar o pagamento: {motivo}. Envie um novo comprovante. |
| Loja suspensa (público) | Catálogo temporariamente indisponível. |
| Veículo indisponível | Este veículo já foi vendido. Veja outros parecidos. |
| Caju Indica | Ganhe 30% da mensalidade de cada loja indicada. |
| Caju Indica (detalhe) | Por até 3 meses, enquanto a loja continuar assinando. Começa a contar no 1º pagamento dela. |
| Código aplicado | Indicação de {nome} aplicada. |
| Vendedor (loja parceira) | Você ganha R$ {valor}. |
| Vendedor em análise | Recebemos seu cadastro. Vamos conferir seus dados e avisar quando estiver aprovado. |
| Simulador | Estimativa sem análise de crédito. |
| Busca sem resultado | Não achamos esse veículo agora. Quer que a gente avise quando chegar? |

---

## 9. Entregáveis e próximos passos de design

Desenhados: 1a–1d, 2a, 3a–3c, 4a–4c, 5a–5e, 6a–6g (6f com 4 variações), 7a–7h, 8a–8g, 9a–9f, 10a–10c, 11a, 12a–12i, 13a–13d, 14a–14e, 15a–15c.

Fluxos completos de ponta a ponta (PRD §4):
- Comprador: 11a → 1a → 6d/12a → 1b → 14b/14a/14d → WhatsApp/formulário.
- Onboarding do lojista: 5b → 5c (8d) → 5d → 6c → 10a → 5e → 2a.
- Mensalidade: 10c → 6c → 10a/12e → 12f/12g (atraso).
- Rede Caju: 7a → 7h → 7c/13a → 7f → 3a → 7g → 7d.
- Caju Indica: 8a/9d → 8c → 8d → 8e/9e → 8g.
- Admin: 4a/15c → 10b · 7h · 14c · 14e · 8g · 6g → 6f; 4b; 4c/8f.

A desenhar:
- Nova senha (após senha temporária) e a versão de 6b sem e-mail.
- Página pública da loja com capa, logo e horário (hoje é o 1a em modo Lojista).
- Galeria em tela cheia.
- Convite de usuário da loja e aceite.
- Versão do login [9f] só com e-mail e senha (o desenho tem a aba Celular, fase 2).
