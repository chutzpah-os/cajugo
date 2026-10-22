# CajuGo — PRD (Product Requirements Document)

Versão 1.2 · MVP · outubro/2026
Referência visual: `design/CajuGo Telas.dc.html` (ids de tela entre colchetes, ex.: [1a]).
Documentos complementares: `design/DESIGN.md` (UI/UX), `ARCHITECTURE.md` (stack e modelo de dados), `API.md` (rotas).

---

## 1. Visão geral

CajuGo é um SaaS de catálogo de veículos para lojistas. Cada lojista assina um plano mensal (R$ 100/mês) e recebe:

1. **Catálogo próprio** da loja, público, com link e QR code (`cajugo.com.br/{slug-da-loja}`).
2. **Painel de gestão** para cadastrar veículos, acompanhar leads e configurar a loja.
3. **Opção de divulgar** cada veículo na **vitrine CajuGo** (catálogo central, `cajugo.com.br`), que reúne veículos de todas as lojas sem distinção de loja na listagem.

Tudo que o lojista faz no próprio catálogo é refletido na vitrine CajuGo em tempo real (edição, preço, venda, remoção).

A CajuGo (administradores) gerencia lojas, assinaturas, a vitrine central e usuários.

### 1.1 Problema
- Lojistas pequenos e médios dependem de marketplaces caros ou de redes sociais sem organização de estoque.
- Não têm um link único, bonito e atualizado para mandar aos clientes.
- Manter o mesmo carro atualizado em vários lugares gera anúncios de carros já vendidos.

### 1.2 Proposta de valor
- Para o **lojista**: catálogo profissional + vitrine com tráfego da CajuGo, preço fixo e baixo, sem comissão sobre vendas, leads direto no WhatsApp.
- Para o **comprador**: busca unificada de veículos de várias lojas, com informações padronizadas.
- Para a **CajuGo**: receita recorrente (assinaturas) e, no futuro, comissão via rede de vendedores.

### 1.3 Objetivos do MVP (métricas de sucesso)
| Métrica | Meta inicial sugerida |
|---|---|
| Lojas assinantes ativas | 50 nos primeiros 3 meses |
| Conversão landing → assinatura | ≥ 8% |
| % de veículos divulgados na vitrine | ≥ 60% |
| Tempo para cadastrar 1º veículo após assinar | < 10 min (mediana) |
| Anúncios de veículos vendidos ainda visíveis | 0 (sincronização) |
| Churn mensal | < 5% |

---

## 2. Papéis de usuário

| Papel | Quem é | MVP? |
|---|---|---|
| **Visitante / Comprador** | Qualquer pessoa navegando no catálogo CajuGo ou de uma loja. Não precisa de conta. | Sim |
| **Lojista** | Dono da loja. Assina o plano, gerencia catálogo, leads, loja e conta. | Sim |
| **Usuário da loja** (opcional) | Funcionário convidado pelo lojista para cadastrar veículos/atender leads. | Opcional (ver §12) |
| **Administrador CajuGo** | Equipe interna. Gerencia lojas, assinaturas, vitrine, usuários. | Sim |
| **Suporte CajuGo** | Equipe interna com permissões reduzidas (leitura + ações de suporte). | Sim (papel simples) |
| **Vendedor** | Pessoa que indica clientes ou fecha vendas de veículos da vitrine CajuGo e ganha comissão. | **Fase 2** (só aparece como "em breve") |

### 2.1 Matriz de permissões

| Ação | Visitante | Lojista | Usuário loja | Admin | Suporte | Vendedor (F2) |
|---|---|---|---|---|---|---|
| Ver vitrine CajuGo e catálogos de lojas | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Enviar mensagem / WhatsApp para loja | ✓ | — | — | — | — | ✓ |
| Favoritar veículo | ✓ (local) | — | — | — | — | — |
| Assinar plano | ✓ | — | — | — | — | — |
| CRUD de veículos da própria loja | — | ✓ | ✓ | ✓ (qualquer loja) | — | — |
| Marcar veículo como vendido | — | ✓ | ✓ | ✓ | — | — |
| Ligar/desligar "Divulgar na CajuGo" | — | ✓ | ✓ | ✓ (ocultar) | — | — |
| Ver/gerenciar leads da loja | — | ✓ | ✓ | ✓ (leitura) | ✓ (leitura) | — |
| Editar dados públicos da loja | — | ✓ | — | ✓ | — | — |
| Gerenciar assinatura/pagamento da loja | — | ✓ | — | ✓ | ✓ (leitura) | — |
| Convidar usuários da loja | — | ✓ | — | ✓ | — | — |
| Criar/suspender/reativar lojas | — | — | — | ✓ | — | — |
| Ocultar veículo da vitrine CajuGo | — | — | — | ✓ | ✓ | — |
| Moderar denúncias | — | — | — | ✓ | ✓ | — |
| Editar plano (preço, dia de cobrança) | — | — | — | ✓ | — | — |
| Gerenciar equipe CajuGo | — | — | — | ✓ | — | — |
| Configurar vitrine (nome, domínio, aprovação) | — | — | — | ✓ | — | — |

---

## 3. Escopo

### 3.1 No MVP
- Vitrine CajuGo pública (listagem + busca + filtros + página do veículo).
- Catálogo público por loja (mesmo layout da vitrine, com identidade da loja).
- Menu da vitrine com "Entrar" e "Divulgar meus veículos".
- Landing page curta do plano para lojistas.
- Cadastro de loja + responsável.
- Pagamento recorrente (Pix automático ou cartão de crédito).
- Painel do lojista: Veículos, Novo/Editar veículo, Leads, Minha loja, Conta.
- Painel admin: Painel (dashboard), Lojas, Veículos CajuGo, Usuários, Assinaturas, Conta.
- Sincronização lojista → vitrine.
- Formulário de contato e botão de WhatsApp na página do veículo.
- Denúncia de anúncio.

### 3.2 Fora do MVP (fase 2+)
- Módulo de vendedores com comissão (cadastro, links de indicação, rastreio de vendas, pagamento).
- Chat interno.
- Simulação real de financiamento com banco parceiro (no MVP o valor "a partir de R$ X/mês" é estimativa calculada).
- App nativo (MVP é web mobile-first, responsivo; pode ser PWA).
- Múltiplos planos.
- Integração automática com FIPE e consulta de placa (recomendado no MVP se houver API disponível; senão, preenchimento manual — ver §9).
- Vídeo 360°, videochamada, delivery.
- Motos/caminhões (MVP: carros; o modelo de dados já deve prever `tipo_veiculo`).

---

## 4. Jornadas do usuário

### 4.1 Comprador — encontrar e contatar
1. Acessa `cajugo.com.br` → **Vitrine CajuGo** [1a].
2. Busca por marca/modelo ou aplica filtros (Marca, Preço, Ano, Km, Câmbio).
3. Rola cards; toca em **Ver detalhes** → **Página do veículo** [1b].
4. Vê galeria, preço, ficha, descrição, itens e loja.
5. Contata a loja por **WhatsApp** (barra fixa) ou **formulário** ("Enviar mensagem").
6. O contato vira **lead** no painel da loja [3a], com origem "via CajuGo".
7. Opcional: "Ver estoque da loja" → catálogo da loja.

Variação: comprador chega pelo link da loja (`/autocentersilva`) → **Catálogo da loja** [1a, modo Lojista] → lead com origem "Seu catálogo".

### 4.2 Lojista — assinar
1. Na vitrine, abre o **menu (☰)** [5a].
2. Toca em **Divulgar meus veículos** → **Landing** [5b].
3. Lê benefícios, preço, FAQ → **Prosseguir**.
4. **Cadastro (1/2)** [5c]: dados da loja, slug do catálogo (validação de disponibilidade), responsável, senha, aceite de termos → **Continuar para pagamento**.
5. **Pagamento (2/2)** [5d]: escolhe Pix automático ou cartão, informa CPF/CNPJ para nota → **Gerar Pix / Assinar**.
6. Pagamento confirmado → conta ativada → **Catálogo da loja (vazio)** com onboarding [5e].
7. **Cadastrar primeiro veículo** → [2a].

### 4.3 Lojista — operar no dia a dia
1. Entra em **Meus veículos** [1c].
2. Cadastra veículo [2a] → Publicar (ou Salvar rascunho).
3. Liga/desliga **Divulgar na CajuGo** por veículo.
4. Recebe lead → notificação (WhatsApp/e-mail/push) → **Leads** [3a] → responde por WhatsApp → avança status.
5. Vendeu → **Vendido** no card do veículo → sai do catálogo da loja **e** da vitrine.
6. Ajusta dados da loja em **Minha loja** [3b]; compartilha link/QR.
7. Consulta assinatura/faturas em **Conta** [3c]; pode cancelar a qualquer momento.

### 4.4 Administrador
1. Entra no **Painel** [4a]: indicadores e "Precisa de atenção".
2. **Lojas** [1d]: vê lojas, situação do plano, veículos, gerencia.
3. **Veículos CajuGo** [1d, aba]: lista do que está na vitrine; pode **Ocultar**.
4. **Usuários** [1d, aba]: lojistas, vendedores (em breve), admins.
5. **Assinaturas** [4b]: filtra Em dia/Atrasadas/Suspensas; **Suspender**/**Reativar**; edita plano.
6. **Conta** [4c]: equipe, configurações da vitrine, aprovação prévia de veículos.

---

## 5. Fluxos e máquinas de estado

### 5.1 Fluxo de assinatura
```
Vitrine [1a] → Menu [5a] → Landing [5b] → Cadastro [5c] → Pagamento [5d]
   → (webhook pagamento confirmado) → Conta ATIVA → Catálogo vazio [5e] → Novo veículo [2a]
   → (pagamento falhou/expirou) → permanece em "Aguardando pagamento" → reenviar Pix / trocar método
```
- Conta criada no passo [5c] com status `aguardando_pagamento`. O lojista pode sair e voltar (login leva a [5d]).
- Slug reservado no cadastro; liberado se não houver pagamento em 7 dias.

### 5.2 Status do veículo
```
rascunho ──publicar──▶ publicado ──marcar vendido──▶ vendido
    ▲                     │  ▲
    └──despublicar────────┘  └──reabrir (desfazer venda, até 7 dias)
publicado ──excluir──▶ excluído (soft delete)
```
| Status | Catálogo da loja | Vitrine CajuGo | Pode divulgar? |
|---|---|---|---|
| rascunho | não | não | toggle desabilitado ("Publique para liberar") |
| publicado | sim | sim, **se** `divulgar_cajugo = true` **e** não oculto por admin **e** (se aprovação ligada) aprovado | sim |
| vendido | não | não | toggle desabilitado ("Removido de todos os catálogos") |
| excluído | não | não | — |

Flags adicionais:
- `divulgar_cajugo` (bool, controlado pelo lojista; padrão vem de Minha loja [3b]).
- `oculto_admin` (bool + motivo, controlado pelo admin).
- `aprovacao_status` (`pendente`/`aprovado`/`reprovado`) — só se "Aprovar veículos antes de publicar" [4c] estiver ligado.

### 5.3 Status da assinatura
```
aguardando_pagamento ──pago──▶ em_dia ──cobrança falhou──▶ atrasada ──N dias ou admin──▶ suspensa
                                  ▲                            │                            │
                                  └──────── pagou ─────────────┘◀──── admin reativa / pagou ─┘
em_dia ──lojista cancela──▶ cancelamento_agendado ──fim do período pago──▶ cancelada
```
| Status | Catálogo da loja | Vitrine | Painel do lojista |
|---|---|---|---|
| aguardando_pagamento | fora do ar | fora | só tela de pagamento |
| em_dia | no ar | conforme veículos | completo |
| atrasada | no ar (tolerância) | no ar | completo + banner de cobrança |
| suspensa | fora do ar | fora | somente Conta (regularizar) |
| cancelamento_agendado | no ar até o fim do período | no ar | completo + aviso |
| cancelada | fora do ar | fora | somente Conta (reassinar) |

- Tolerância sugerida: suspensão automática após **10 dias** de atraso (configurável). Admin pode suspender antes [4b].
- **Cancelamento a qualquer momento**, sem multa. O catálogo fica no ar até o fim do mês já pago (texto exibido em [5d], [3c], FAQ [5b]).
- Dados da loja e veículos são mantidos por 90 dias após cancelamento/suspensão para reativação.

### 5.4 Status do lead
```
novo ──▶ em_contato ──▶ negociando ──▶ vendido
   └──────────┴─────────────┴────────▶ perdido
```
- Botão de avanço no card [3a] ("→ Em contato", "→ Negociando", "→ Vendido").
- "Perdido" disponível via menu do card (a desenhar).
- Ao marcar lead como "vendido", sugerir marcar o veículo como vendido (e vice-versa).

### 5.5 Sincronização lojista → vitrine
- Única fonte de verdade: o registro do veículo da loja. A vitrine é uma **consulta filtrada** (não uma cópia).
- Regra de visibilidade na vitrine:
  `status = publicado AND divulgar_cajugo AND NOT oculto_admin AND loja.assinatura IN (em_dia, atrasada, cancelamento_agendado) AND (aprovacao desligada OR aprovacao_status = aprovado)`
- Cache/CDN da listagem deve ser invalidado em ≤ 60 s após qualquer mudança.

---

## 6. Telas (inventário)

| Id | Tela | Público | Rota sugerida |
|---|---|---|---|
| 1a | Catálogo (vitrine CajuGo / catálogo da loja) | Visitante | `/` e `/{slug}` |
| 1b | Página do veículo | Visitante | `/v/{id}-{marca}-{modelo}` e `/{slug}/v/{id}` |
| 5a | Menu (gaveta) | Visitante | overlay em `/` |
| 5b | Landing lojistas | Visitante | `/lojistas` |
| 5c | Cadastro 1/2 | Visitante | `/lojistas/cadastro` |
| 5d | Pagamento 2/2 | Lojista (pendente) | `/lojistas/pagamento` |
| 5e | Catálogo vazio + onboarding | Lojista | `/painel/veiculos` (estado vazio) |
| 1c | Meus veículos | Lojista | `/painel/veiculos` |
| 2a | Novo / editar veículo | Lojista | `/painel/veiculos/novo`, `/painel/veiculos/{id}` |
| 3a | Leads | Lojista | `/painel/leads` |
| 3b | Minha loja | Lojista | `/painel/loja` |
| 3c | Conta | Lojista | `/painel/conta` |
| 4a | Painel admin | Admin | `/admin` |
| 1d | Lojas / Veículos CajuGo / Usuários | Admin | `/admin/lojas`, `/admin/veiculos`, `/admin/usuarios` |
| 4b | Assinaturas | Admin | `/admin/assinaturas` |
| 4c | Conta admin | Admin | `/admin/conta` |
| 6a | Entrar (login único para lojista e admin) | Todos | `/entrar` |
| 6b | Recuperar senha | Todos | `/recuperar` |
| 6c | Pix gerado · aguardando pagamento | Lojista (pendente) | `/lojistas/pagamento/pix` |
| 6d | Filtros e ordenação (bottom sheet) | Visitante | overlay em `/` e `/{slug}` |
| 6e | Editar veículo (resumo + ações) | Lojista | `/painel/veiculos/{id}` |
| 6f | Diálogos de confirmação | Lojista / Admin | overlay |
| 6g | Detalhe da loja (admin) | Admin | `/admin/lojas/{id}` |

Navegação inferior:
- Lojista: **Veículos · Leads · Minha loja · Conta**.
- Admin: **Painel · Lojas · Assinaturas · Conta** (Lojas contém abas Lojas / Veículos CajuGo / Usuários).

---

## 7. Requisitos funcionais por tela

### [1a] Catálogo
**Modos**
- **CajuGo**: cabeçalho com logo CajuGo; título "Carros usados e seminovos à venda"; contador "X anúncios de Y lojas"; cada card mostra "Anunciado por {loja}".
- **Lojista**: cabeçalho com logo/sigla, nome e cidade da loja + "catálogo CajuGo"; título "Estoque {loja}"; contador "X veículos disponíveis"; card sem linha de loja.

**Elementos**
- Cabeçalho fixo: logo, favoritos (♡), menu (☰ → [5a]).
- Busca: "Buscar marca, modelo ou versão" (busca textual em marca, modelo, versão).
- Chips horizontais: **Filtros** (com contador de filtros ativos) + Marca, Preço, Ano, Km, Câmbio (cada um abre bottom sheet).
- Ordenação: Mais relevantes (padrão), Menor preço, Maior preço, Mais recentes, Menor km, Ano mais novo.
- Card do veículo: foto de capa (contador 1/N), favoritar, selo opcional (ex.: "Abaixo da FIPE", "Único dono"), MARCA MODELO, versão, ano fab/modelo, km, cidade (UF), [loja], preço, "a partir de R$ X/mês*", botão **Ver detalhes**.
- **Carregar mais veículos** (paginação de 20 em 20; ou scroll infinito).
- Rodapé: "*Valor estimado. Simule a sua parcela."

**Regras**
- Selo "Abaixo da FIPE" só se `preco < valor_fipe` (quando FIPE disponível).
- Parcela estimada exibida somente se o lojista ativou "Exibir parcela estimada" [2a]. Fórmula sugerida: entrada 20%, 48x, taxa configurável pelo admin.
- Favoritos no MVP: localStorage do navegador (sem conta).
- Relevância (MVP): recência de publicação + completude do anúncio (nº de fotos, descrição).

**Estados**: carregando (skeleton de cards), vazio ("Nenhum veículo encontrado. Limpe os filtros."), erro (tentar novamente).

### [1b] Página do veículo
- Galeria em carrossel (swipe), contador 1/N, botões voltar, compartilhar (Web Share API; fallback copiar link), favoritar.
- Selos (Abaixo da FIPE, Aceita troca…).
- Título "MARCA **MODELO**" + versão em caixa alta.
- Bloco de preço: preço, "a partir de R$ X/mês*", link **Simular** (MVP: bottom sheet com entrada e prazo, cálculo local).
- Ficha: Cidade (linha inteira), Ano, KM, Câmbio, Carroceria, Combustível, Final de placa, Cor, Aceita troca, Único dono, IPVA pago (+ Licenciado, Revisões na concessionária, Garantia de fábrica, Blindado quando = Sim).
- "Sobre este carro" (descrição livre).
- "Itens do veículo" (chips).
- Card da loja: sigla/logo, nome, cidade, **Ver estoque da loja**.
- Formulário "Envie uma mensagem à loja": Nome*, E-mail*, Telefone*, Mensagem (pré-preenchida "Olá, tenho interesse no veículo. Por favor entre em contato.") → **Enviar mensagem**.
- **Denunciar anúncio do veículo** (motivo + descrição opcional).
- Barra fixa inferior: **WhatsApp** (abre `wa.me/{numero}?text=` com mensagem contendo veículo e link) e **Ver parcelas**.

**Regras**
- Clique em WhatsApp também gera lead (origem + veículo + "via WhatsApp"; sem nome se não informado).
- Formulário: validação de e-mail e telefone BR; anti-spam (honeypot + rate limit por IP); confirmação "Mensagem enviada. A loja vai responder em breve."
- Veículo vendido/oculto acessado por link direto: exibir "Este veículo não está mais disponível" + similares.
- Final de placa: somente o último dígito; placa completa nunca é exibida.

### [5a] Menu
- Gaveta pela direita sobre overlay escuro.
- **Entrar** (→ login; redireciona para painel conforme papel).
- Card destaque "Para lojistas · **Divulgar meus veículos** · Catálogo próprio da sua loja e vitrine na CajuGo por R$ 100/mês · Conhecer →" → [5b].
- Links: Comprar carros, Favoritos, Lojas parceiras, Ajuda.
- Logado: substituir "Entrar" por avatar + "Ir para o painel".

### [5b] Landing lojistas
- Cabeçalho escuro: logo + tag "Lojistas", link "Entrar".
- Título: "Seu estoque online hoje, com vitrine na CajuGo." + subtítulo + imagem.
- "O que você recebe" (4 itens): catálogo com nome da loja; vitrine CajuGo; tudo sincronizado; leads no WhatsApp.
- Card do plano: R$ 100/mês; veículos ilimitados; até 20 fotos por veículo; link e QR code; painel de leads; "Sem fidelidade. Cancele quando quiser."
- FAQ: CNPJ? Cancelar? Comissão?
- Barra fixa: "R$ 100/mês · Plano Catálogo" + **Prosseguir** → [5c].

### [5c] Cadastro (1/2)
Campos:
| Campo | Tipo | Validação |
|---|---|---|
| Nome da loja | texto | obrigatório, 2–60 |
| Cidade | autocomplete cidade/UF | obrigatório |
| WhatsApp da loja | telefone BR | obrigatório, máscara (99) 99999-9999 |
| Endereço do catálogo (slug) | texto com prefixo `cajugo.com.br/` | obrigatório, `[a-z0-9-]{3,40}`, único, lista de reservados; sugestão automática a partir do nome; feedback "Disponível"/"Indisponível" em tempo real |
| Seu nome | texto | obrigatório |
| E-mail | e-mail | obrigatório, único |
| Celular | telefone BR | obrigatório |
| Senha | senha | ≥ 8 caracteres |
| Aceite de termos | checkbox | obrigatório |
- Barra de progresso 2 segmentos; voltar → [5b].
- **Continuar para pagamento** (desabilitado até válido).

### [5d] Pagamento (2/2)
- Resumo: Plano Catálogo, R$ 100/mês, loja, dia de cobrança (= dia da assinatura), "Sem fidelidade", ✓ "Você pode cancelar a assinatura a qualquer momento."
- Forma de pagamento (seleção): **Pix** (automático, todo mês) | **Cartão** (crédito recorrente).
  - Cartão: número, nome impresso, validade, CVV (tokenizado no gateway; nunca trafega pelo backend).
  - Pix: texto explicativo; após confirmar, exibe QR code + copia-e-cola + autorização de Pix automático.
- CPF ou CNPJ para nota fiscal (validação de dígitos).
- CTA dinâmico: "Gerar Pix · R$ 100/mês" / "Assinar · R$ 100/mês".
- "Pagamento processado com segurança".
- Sucesso → [5e]. Falha → mensagem do gateway + tentar novamente/trocar método.

### [5e] Catálogo vazio + onboarding
- Banner verde: "Assinatura ativa. Sua loja está no ar." + link do catálogo.
- "Primeiros passos" (1 de 3): Assinatura ativa ✓; Cadastre seu primeiro veículo; Complete sua loja.
- Estado vazio com **Cadastrar primeiro veículo** → [2a].
- Checklist some quando os 3 passos estiverem completos.

### [1c] Meus veículos (lojista)
- Cabeçalho escuro: nome da loja, "Meus veículos", avatar.
- Indicadores: Publicados · Na CajuGo · Vendidos no mês.
- Card assinatura: "Plano Catálogo · R$ 100/mês · Ativo · próxima cobrança dd/mm" + selo de status.
- Busca por modelo ou placa.
- Filtros com contagem: Todos, Publicados, Rascunhos, Vendidos.
- Card do veículo: miniatura, nome, selo de status, ano · km, preço; toggle **Divulgar na CajuGo** + legenda de estado; botão **Vendido** (se não vendido); **Editar** (lápis).
  - Legendas: "Visível na vitrine CajuGo" / "Só no seu catálogo" / "Publique para liberar" / "Removido de todos os catálogos".
- FAB **Novo veículo** → [2a].
- Regras: marcar vendido pede confirmação e desliga a divulgação; toggle desabilitado para rascunho e vendido.

### [2a] Novo / editar veículo
Seções e campos:

**Fotos** — até 20; primeira = capa; arrastar para reordenar; "Adicionar". Upload com compressão no cliente (máx. 1600px, JPEG/WebP), barra de progresso, remover. Mínimo 1 foto para publicar.

**Identificação**
| Campo | Tipo | Obs. |
|---|---|---|
| Placa | texto (formato Mercosul/antigo) | não exibida publicamente; "Buscar dados" preenche marca/modelo/ano se houver integração |
| Marca | select | lista FIPE |
| Modelo | select | dependente da marca |
| Versão | select (linha inteira) | dependente do modelo/ano |
| Ano fabricação | select | |
| Ano modelo | select | ≥ ano fabricação, ≤ fabricação + 1 |

**Ficha técnica**: Quilometragem (número), Câmbio (Manual/Automático/CVT/Automatizado), Combustível (Flex/Gasolina/Etanol/Diesel/Elétrico/Híbrido/GNV), Carroceria (Hatchback/Sedã/SUV/Picape/Minivan/Cupê/Conversível/Perua), Cor, Portas (2/3/4/5), Motor (1.0, 1.3…), Final de placa (derivado da placa).

**Preço**: Preço de venda (R$, obrigatório); referência FIPE com diferença percentual ("4,6% abaixo"); toggle **Exibir parcela estimada**.

**Condições** (Sim/Não): Aceita troca, Único dono, IPVA pago, Licenciado, Revisões na concessionária, Garantia de fábrica, Blindado.

**Itens do veículo** (multisseleção, contador "N selecionados"): Airbag, Alarme, Ar quente, Ar condicionado, Computador de bordo, Desembaçador traseiro, Freio ABS, Freios ABS com EBD, Limpador traseiro, Travas elétricas, Vidros elétricos, Direção elétrica, Direção com ajuste, Sensor de estacionamento, Câmera de ré, Central multimídia, Bancos de couro, Teto solar, Rodas de liga leve, Piloto automático.

**Descrição**: textarea, máx. 2.000 caracteres, contador.

**Divulgação**: toggle **Divulgar na CajuGo** (padrão da loja) com explicação de sincronização; Contato do anúncio (WhatsApp; padrão = WhatsApp da loja).

**Ações**: fechar (X, confirma descarte se houver alterações), autosave de rascunho ("Rascunho salvo"), **Salvar rascunho**, **Publicar**.

Validação para publicar: ≥1 foto, marca, modelo, versão, anos, km, câmbio, combustível, preço.

### [3a] Leads
- Cabeçalho: "Leads"; indicadores "Novos, sem resposta" e "% vieram da vitrine CajuGo".
- Filtros: Todos, Novo, Em contato, Negociando (+ contagens).
- Card: sigla, nome, tempo relativo, veículo · preço, selo de status, selo de origem ("via CajuGo"/"Seu catálogo"), mensagem, ações **WhatsApp**, **Ligar** (`tel:`), **→ próximo status**.
- Regras: lead "Novo" há mais de 24 h ganha destaque; tocar no veículo abre a edição [2a].

### [3b] Minha loja
- Capa (trocar capa), logo/sigla, nome, cidade · nº de veículos.
- **Ver como cliente** (abre catálogo público) e **Compartilhar** (Web Share).
- Link do catálogo + QR code: Copiar link, Baixar QR code (PNG).
- Informações públicas: Nome da loja, Sobre a loja, Endereço, WhatsApp, Instagram.
- Horário de atendimento (por dia/intervalo; "Fechado").
- Preferências: **Divulgar novos veículos na CajuGo** (padrão do toggle em [2a]).
- **Salvar alterações**.
- Alterar slug: permitido com aviso (links antigos redirecionam por 90 dias).

### [3c] Conta (lojista)
- Perfil: nome, e-mail, papel "Lojista".
- Assinatura: Plano Catálogo, status, R$ 100/mês, próxima cobrança, forma de pagamento, **Alterar forma de pagamento**, texto "Você pode cancelar a assinatura a qualquer momento. O catálogo fica no ar até o fim do mês já pago."
- Faturas: mês, valor, data de pagamento, status, **Recibo** (PDF/NF).
- Notificações de novo lead: WhatsApp, E-mail, Notificação no celular (toggles).
- Links: Dados pessoais, Alterar senha, Usuários da loja, Central de ajuda, Termos de uso e privacidade.
- **Sair**; **Cancelar assinatura** (fluxo: motivo opcional → confirmação com data de fim → status `cancelamento_agendado`; pode desfazer até a data).

### [4a] Painel admin
- Saudação + mês.
- KPIs: Lojas ativas, Receita mensal (MRR), Veículos na vitrine, Leads no mês (com variação vs. mês anterior).
- "Precisa de atenção": assinaturas atrasadas, anúncios denunciados, lojas aguardando ativação (cada item abre a lista filtrada).
- Origem dos leads (barra Vitrine CajuGo × Catálogos).
- Lojas com mais leads (top 3–10).

### [1d] Lojas / Veículos CajuGo / Usuários (admin)
- Abas.
- **Lojas**: KPIs (assinaturas ativas, receita mensal), **Nova loja** (admin cria loja e conta do dono com senha temporária, passada manualmente), card com sigla, nome, dono · cidade, selo de plano, "N veículos · M na CajuGo", **Gerenciar** (detalhe da loja: dados, veículos, leads, assinatura, ações).
- **Veículos CajuGo**: texto explicativo; lista com miniatura, nome, loja · preço, **Ocultar** (pede motivo; notifica o lojista). Filtros sugeridos: denunciados, pendentes de aprovação.
- **Usuários**: lista com sigla, nome, loja/info, selo de papel (Lojista, Vendedor [em breve], Admin).

### [4b] Assinaturas (admin)
- Cabeçalho: MRR; contagem Em dia / Atrasadas / Suspensas.
- Card do plano: "Plano Catálogo · R$ 100/mês · cobrança todo dia X" + **Editar plano** (mudança de preço vale para novas cobranças; aviso por e-mail com 30 dias).
- Filtros: Todas, Em dia, Atrasadas, Suspensas.
- Card: loja, dono, desde, selo; linha de informação conforme status:
  - Em dia → "Próxima cobrança dd/mm · R$ 100" + **Detalhes**
  - Atrasada → "Em atraso N dias · R$ 100" + **Suspender**
  - Suspensa → "Catálogo e vitrine · Fora do ar" + **Reativar**

### [4c] Conta admin
- Perfil (papel Admin).
- Equipe CajuGo + **Convidar** (papéis Admin, Suporte).
- Vitrine CajuGo: nome, endereço (domínio), WhatsApp de atendimento.
- Toggle **Aprovar veículos antes de publicar**.
- **Comissão de vendedores** (em breve): campo "% por venda" desabilitado.
- Links: Dados pessoais, Alterar senha, Gateway de pagamento, Logs de atividade.
- **Sair**.

---

### [6a] Entrar
- Login único; após autenticar, redireciona conforme papel: lojista → `/painel/veiculos`; admin/suporte → `/admin`; lojista com assinatura `aguardando_pagamento` → [5d]; `suspensa`/`cancelada` → [3c].
- Campos: E-mail, Senha (com "Mostrar"). Link **Esqueci minha senha** → [6b].
- Rodapé: "Ainda não tem conta de lojista?" + **Divulgar meus veículos** → [5b].
- Regras: bloqueio temporário após 5 tentativas erradas em 15 min; mensagem genérica "E-mail ou senha incorretos"; sessão lembrada por 30 dias.

### [6b] Recuperar senha
**MVP (manual, sem e-mail):**
- Texto: "Para criar uma nova senha, fale com o suporte CajuGo." + botão **Falar no WhatsApp** (abre `wa.me` com o WhatsApp de atendimento de [4c] e a mensagem "Esqueci minha senha. E-mail da conta: ").
- O admin confere a identidade e define uma **senha temporária** em [6g]; passa a senha ao lojista pelo WhatsApp.
- No próximo login com a senha temporária, o sistema leva à tela **Nova senha** (senha + confirmar senha) antes de liberar o painel.

**Fase 2 (automático por e-mail):** campo E-mail → **Enviar link**; sempre exibe "Link enviado"; link de uso único válido por 1 hora; reenvio após 60 s. Exige provedor de e-mail (SMTP próprio no Supabase Auth).

### [6c] Pix gerado
- Aberto após **Gerar Pix** em [5d].
- Selo "Aguardando pagamento · expira em MM:SS" (validade sugerida: 30 min; ao expirar, botão "Gerar novo Pix").
- Valor da primeira mensalidade, QR code, **Pix copia e cola** com **Copiar** (feedback "Copiado").
- "Como pagar" em 3 passos, incluindo a autorização do Pix automático para as próximas mensalidades.
- Nota: "Você pode cancelar a assinatura a qualquer momento. Esta tela atualiza sozinha quando o pagamento for confirmado."
- A tela consulta o status (polling a cada 5 s ou websocket); ao confirmar via webhook → [5e].
- **Já paguei** força nova verificação; se ainda pendente, mostra "Ainda não recebemos. Pode levar alguns segundos."

### [6d] Filtros e ordenação
- Bottom sheet sobre o catálogo, com alça, título "Filtros" e fechar.
- **Ordenar por** (seleção única): Mais relevantes, Menor preço, Maior preço, Mais recentes, Menor km, Ano mais novo.
- **Marca** (múltipla, com "Ver todas" para lista completa com busca).
- **Preço** (de/até em R$), **Ano** (de/até), **Quilometragem** (slider "Até N km").
- **Câmbio** (múltipla): Automático, Manual, CVT.
- **Combustível** (múltipla): Flex, Gasolina, Diesel, Híbrido, Elétrico.
- Rodapé: **Limpar** e **Ver N veículos** (contagem ao vivo conforme filtros).
- Filtros ativos refletem no contador do chip "Filtros" [1a] e na URL (`?marca=bmw,audi&cambio=automatico`), para compartilhamento.

### [6e] Editar veículo
- Cabeçalho: voltar, "Editar veículo", "Alterado há N min" (autosave).
- Resumo: miniatura, nome, ano · km · preço, selos de status e "Na CajuGo".
- Desempenho do anúncio: Visualizações, Leads, Dias no ar.
- Seções resumidas com **Editar** (cada uma abre a seção correspondente do formulário [2a]): Fotos, Identificação, Ficha técnica, Preço, Condições, Itens, Descrição, Contato.
- Toggle **Divulgar na CajuGo** com legenda de estado.
- Ações: **Marcar como vendido** (→ diálogo [6f]), **Despublicar** (volta a rascunho), **Excluir veículo** (confirmação; soft delete).
- Rodapé: **Ver anúncio** (abre [1b]) e **Salvar alterações**.
- Mudança de preço registra histórico (`VeiculoHistorico`) e atualiza a vitrine na hora.

### [6f] Diálogos de confirmação
Bottom sheet com ícone, título, texto do efeito, conteúdo opcional (nota ou motivos) e 2 botões (confirmar + voltar).

| Diálogo | Quem | Texto do efeito | Extra | Botão |
|---|---|---|---|---|
| Marcar como vendido | Lojista | Sai do catálogo e da vitrine na hora; desfazer em até 7 dias | Nota: leads abertos do veículo viram "Perdido", exceto o comprador escolhido | Marcar como vendido (escuro) |
| Cancelar assinatura | Lojista | Catálogo e vitrine ficam no ar até o fim do mês pago; sem multa | Motivo opcional (lista) | Cancelar assinatura (vermelho) · Manter assinatura |
| Suspender loja | Admin | Catálogo e veículos saem do ar; lojista avisado por e-mail e só acessa Conta | Nota com dias e valor em atraso | Suspender loja (vermelho) |
| Ocultar veículo | Admin | Sai só da vitrine, continua no catálogo da loja; lojista avisado com o motivo | Motivo obrigatório (lista) | Ocultar da vitrine (escuro) |

Todas as confirmações geram registro em `LogAtividade`.

### [6g] Detalhe da loja (admin)
- Aberto por **Gerenciar** em [1d] ou pelos itens do Painel [4a].
- Cabeçalho: voltar para Lojas, sigla, nome, cidade, "cliente desde", selo de status da assinatura, link do catálogo.
- KPIs: Veículos, Na CajuGo, Leads no mês.
- **Dono**: nome, e-mail, celular, CPF/CNPJ.
- **Assinatura**: plano, forma de pagamento, próxima cobrança, total pago, link **Faturas**.
- **Veículos**: primeiros itens com **Ocultar** (→ [6f]) e **Ver todos (N)**.
- Ações: Editar dados da loja, Ver catálogo público, **Definir senha temporária** (mostra a senha uma única vez para o admin copiar; obriga a troca no próximo login), Histórico de atividade, **Suspender loja** (→ [6f]; vira **Reativar** quando suspensa).

## 8. Modelo de dados

Ver `ARCHITECTURE.md` §4 (tabelas do Postgres, em inglês).

---

## 9. Integrações

| Integração | Uso | MVP |
|---|---|---|
| Gateway de pagamento com assinatura recorrente, Pix automático e cartão (ex.: Asaas, Mercado Pago, Efí) | Cobrança, webhooks de status, recibos | Sim (a escolher) |
| Emissão de NFS-e | Nota fiscal da mensalidade | Manual no início |
| Tabela FIPE | Listas marca/modelo/versão, valor de referência, selo "Abaixo da FIPE" | Recomendado |
| Consulta de placa | "Buscar dados" no cadastro | Fase 2 |
| WhatsApp (`wa.me` deep link) | Contato comprador → loja | Sim |
| E-mail transacional (a escolher) | Novo lead, cobranças, avisos | Sim |
| Supabase Auth (e-mail e senha) | Login, recuperação de senha | Sim |
| Cloudinary | Fotos, logo e capa; redimensionamento e CDN | Sim |
| Analytics | Funil landing → assinatura | Fase 2 |

Webhooks do gateway → atualizam `Assinatura.status` e `Fatura`; idempotência obrigatória.

---

## 10. API

Ver `API.md` §5 (mapa de rotas).

---

## 11. Notificações

No MVP o canal é só **e-mail** (e aviso no painel). WhatsApp e push ficam para a fase 2; os toggles em [3c] aparecem como "em breve".

| Evento | Para | Canal |
|---|---|---|
| Novo lead | Lojista (+ usuários da loja) | Conforme preferências [3c] |
| Pagamento confirmado / assinatura ativa | Lojista | E-mail |
| Cobrança falhou / atrasada (D+1, D+5, D+9) | Lojista | E-mail |
| Assinatura suspensa / reativada | Lojista | E-mail |
| Cancelamento agendado / efetivado | Lojista | E-mail |
| Veículo ocultado pelo admin / reprovado | Lojista | E-mail + aviso no painel |
| Nova denúncia | Admin/Suporte | E-mail/painel |
| Nova loja cadastrada | Admin | Painel |
| Alteração de preço do plano | Todos os lojistas | E-mail (30 dias antes) |
| Recuperação de senha | Usuário | Manual pelo WhatsApp no MVP; e-mail na fase 2 |
| Pix gerado / expirado | Lojista | E-mail com o código copia-e-cola |

---

## 12. Requisitos não funcionais

- **Mobile first**: projetado em 390 px; responsivo até desktop (grid de 2–4 colunas no catálogo; página do veículo com coluna lateral de preço/contato ≥ 1024 px).
- **Performance**: LCP < 2,5 s em 4G; imagens responsivas (srcset, WebP/AVIF, lazy-load); listagem com SSR/ISR para SEO.
- **SEO**: páginas públicas renderizadas no servidor; títulos "Marca Modelo Versão Ano – Cidade | CajuGo"; schema.org `Vehicle`/`Offer`; sitemap de veículos e lojas; URLs amigáveis; `noindex` em vendidos.
- **Segurança**: ver `SECURITY.md` (Supabase Auth, cookie de sessão httpOnly, papel por loja, rate limit em formulários públicos, cartão só no gateway).
- **LGPD**: consentimento no formulário de lead; política de privacidade; exclusão de dados a pedido; placa armazenada, nunca exibida; IP de denúncias guardado como hash.
- **Auditoria**: `LogAtividade` para ações de admin e mudanças de status (veículo, assinatura).
- **Acessibilidade**: WCAG 2.1 AA; alvos de toque ≥ 44 px; contraste ≥ 4,5:1; labels em todos os campos.
- **Internacionalização**: pt-BR; moeda BRL; datas dd/mm/aaaa.

### 12.1 Pendências de decisão
1. Usuários da loja (convidar funcionários) entram no MVP? Sugestão: não (fase 2); o link em [3c] fica oculto.
2. Aprovação prévia de veículos na vitrine: ligada ou desligada por padrão? Sugestão: desligada.
3. Dias de tolerância antes da suspensão automática (sugestão: 10).
4. Gateway de pagamento escolhido.
5. Fonte de dados FIPE (API gratuita ou lista manual).
6. Provedor de e-mail transacional.
7. Regras do módulo de vendedores (fase 2).
