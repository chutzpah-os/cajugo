# CajuGo — PRD (Product Requirements Document)

Versão 2.0 · 23/10/2026 · MVP de teste (incorpora o PRD v2: Rede Caju, Caju Indica, Pix com comprovante)
Referência visual: `design/CajuGo Telas.dc.html` e as capturas em `design/telas/` (ids de tela entre colchetes, ex.: [7e]).
Documentos complementares: `design/DESIGN.md` (UI/UX), `ARCHITECTURE.md` (stack e modelo de dados), `API.md` (rotas).

---

## 1. Visão geral

CajuGo é uma plataforma de veículos com três produtos sobre a **mesma base de estoque**:

| Produto | Para quem | Modelo |
|---|---|---|
| **Catálogo** | Lojistas | Assinatura R$ 100/mês, sem fidelidade. Catálogo próprio com link e QR code + vitrine CajuGo + contatos no WhatsApp. |
| **Rede Caju** | Vendedores independentes (e lojistas que querem mais canais) | Grátis para o vendedor. O lojista paga a comissão do vendedor (definida por ele) + **taxa CajuGo de 1%** por carro vendido via vendedor. |
| **Comprar veículos** (vitrine CajuGo) | Compradores | Grátis. Busca unificada de várias lojas, simulador de parcela, favoritos, contato direto com a loja. |

Programa transversal: **Caju Indica** — qualquer pessoa indica lojas para o Catálogo e ganha 30% da mensalidade da loja indicada por até 3 meses.

A CajuGo (admin e suporte) gerencia lojas, assinaturas, pagamentos, vendedores, veículos, denúncias, indicações e regras.

### 1.1 Princípio central
**Estoque único e sincronizado.** O lojista atualiza o veículo uma vez; catálogo da loja, vitrine CajuGo e links dos vendedores refletem a mudança na hora. Vendido sai de todos os lugares.

### 1.1b SEO é o principal ativo
É pela busca que compradores descobrem os veículos, as lojas e os serviços da CajuGo. Toda página pública (veículo, loja, vitrine, páginas de descoberta por marca/modelo/cidade, landings) é feita para ser encontrada e clicada: regras em `SEO.md`.

### 1.2 Problema
- Lojistas pequenos e médios dependem de marketplaces caros ou de redes sociais sem organização de estoque.
- Não têm um link único, bonito e atualizado para mandar aos clientes.
- Manter o mesmo carro atualizado em vários lugares gera anúncios de carros já vendidos.
- Vendedores independentes vendem carros de várias lojas sem estoque atualizado nem comissão combinada.

### 1.3 Proposta de valor
- **Lojista:** catálogo profissional + vitrine com tráfego da CajuGo, preço fixo e baixo, leads no WhatsApp e, se quiser, uma rede de vendedores que só custa quando vende.
- **Vendedor:** vitrine inteira para divulgar, link por veículo que identifica a venda e comissão combinada com cada loja parceira; não paga nada.
- **Comprador:** busca unificada de várias lojas, informações padronizadas, simulador e favoritos.
- **CajuGo:** receita recorrente (assinaturas) + taxa por venda via Rede Caju; crescimento por indicação (Caju Indica).

### 1.4 Fase de teste (este MVP)
- **Pagamentos manuais por Pix**, com comprovante e conferência humana (sem gateway) — §5.6.
- **Curadoria manual** de vendedores pelo admin.
- **Custo zero de infraestrutura:** login só com e-mail e senha; avisos pelo painel e por botões de WhatsApp (`wa.me`) enviados por uma pessoa, sem envio automático pago.
- Mobile first (390 px), com versões desktop da vitrine, do painel do lojista e do admin [15a–15c].
- **Lançamento do MVP inclui Catálogo, vitrine, Rede Caju e Caju Indica.**

### 1.5 Métricas de sucesso do teste
| Métrica | Meta inicial sugerida |
|---|---|
| Lojas pagantes ativas | 50 nos primeiros 3 meses |
| % de comprovantes conferidos em até 1 dia útil | ≥ 95% |
| Leads por veículo publicado | acompanhar |
| Vendas atribuídas à Rede Caju; vendedores aprovados ativos | acompanhar |
| Lojas vindas do Caju Indica | acompanhar |
| Anúncios de veículos vendidos ainda visíveis / reclamações de "carro já vendido" | 0 |
| Tempo para cadastrar 1º veículo após ativar | < 10 min (mediana) |
| Churn mensal | < 5% |

### 1.6 Marca e nomenclatura
- Produto: **CajuGo** (antes CajuCar). Logo: círculo `#E8551E` com ponto `#F5B400` + wordmark "caju**go**".
- Canal de vendas: **Rede Caju**. Indicação: **Caju Indica**. Vocabulário completo em `GLOSSARY.md`.
- Menu da home [11a]: Comprar veículos · Produtos (Catálogo, Rede Caju) · Caju Indica · Favoritos · Entrar.

### 1.7 Endereços
Tudo por caminho no domínio principal (ADR 0009): concentra a autoridade de busca no CajuGo (`docs/SEO.md`). Só o domínio muda quando o próprio for registrado.

| | Agora | Com domínio próprio |
|---|---|---|
| Vitrine CajuGo | `cajugo.vercel.app` | `cajugo.com.br` |
| Catálogo da loja | `cajugo.vercel.app/loja/{slug}` (ex.: `/loja/silvautocar`) | `cajugo.com.br/loja/{slug}` |
| Veículo da loja | `cajugo.vercel.app/loja/{slug}/v/{id}` | `cajugo.com.br/loja/{slug}/v/{id}` |
| Veículo na vitrine (link do vendedor) | `cajugo.vercel.app/v/{id}?ref={codigo}` | `cajugo.com.br/v/{id}?ref={codigo}` |
| Link Caju Indica | `cajugo.vercel.app/i/{codigo}` | `cajugo.com.br/i/{codigo}` |

- Na troca de domínio, os links antigos redirecionam (301): QR codes impressos e links já enviados continuam funcionando.
- O link e o QR code mostrados ao lojista ([3b], [5e]) usam sempre o domínio vigente.
- Slug: `[a-z0-9-]`, sem hífen no início ou no fim. Como fica sob `/loja/`, não colide com rotas do sistema e dispensa lista de reservados.

---

## 2. Papéis de usuário

| Papel | Quem é | Login no MVP |
|---|---|---|
| **Visitante / comprador** | Navega, favorita, simula, contata loja, denuncia anúncio. | Não precisa (favoritos ficam no aparelho; sincronizam se tiver conta) |
| **Lojista** (dono) | Assina o Catálogo; gerencia veículos, leads, loja, vendedores parceiros, comissão e fatura. | E-mail e senha |
| **Usuário da loja** | Equipe do lojista, com permissão de veículos e leads. | E-mail e senha |
| **Vendedor** (Rede Caju) | Divulga veículos da vitrine e ganha comissão das lojas parceiras. | E-mail e senha |
| **Indicador** (Caju Indica) | Qualquer pessoa que indica lojas. | E-mail e senha (cadastro rápido [9b]) |
| **Admin CajuGo** | Lojas, assinaturas, pagamentos, vendedores, veículos, denúncias, indicações, regras. | E-mail e senha |
| **Suporte CajuGo** | Admin com permissões reduzidas (leitura + ações de suporte). | E-mail e senha |

**Conta única:** a mesma pessoa pode ter vários papéis (ex.: vendedor e indicador; lojista e indicador). O login [9f] mostra os painéis disponíveis e permite trocar. Ao entrar, abre o último painel usado. **Contas da equipe CajuGo (admin e suporte) são separadas** e não acumulam papéis de lojista, vendedor ou indicador; o primeiro admin é criado pelo dono fora do site.
Login por **celular com código** (aba "Celular" de [9f], tela [9c]) é **fase 2**: tem custo por mensagem.

### 2.1 Matriz de permissões

| Ação | Visit. | Lojista | Usuário loja | Vendedor | Indicador | Admin | Suporte |
|---|---|---|---|---|---|---|---|
| Ver vitrine, favoritar, simular, contatar loja | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Denunciar anúncio | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| Cadastrar/editar veículos da própria loja | | ✓ | ✓ | | | ✓ (qualquer) | |
| Marcar vendido / confirmar venda e quem vendeu | | ✓ | ✓ | | | ✓ | |
| Ligar/desligar "Divulgar na CajuGo" | | ✓ | ✓ | | | ✓ (ocultar) | |
| Ver/gerenciar leads da loja | | ✓ | ✓ | | | leitura | leitura |
| Editar dados públicos da loja | | ✓ | | | | ✓ | |
| Definir comissão; aprovar/convidar/avaliar/denunciar vendedores | | ✓ | | | | | |
| Enviar comprovante e ver fatura | | ✓ | | | | leitura | leitura |
| Pedir parceria a loja; gerar link de veículo | | | | ✓ | | | |
| Gerar link Caju Indica | | ✓ | | ✓ | ✓ | ✓ (campanhas) | |
| Resgatar saldo por Pix | | | | ✓ | ✓ | | |
| Confirmar/recusar comprovante Pix | | | | | | ✓ | |
| Aprovar/bloquear vendedores | | | | | | ✓ | |
| Aprovar/ocultar veículos; moderar denúncias | | | | | | ✓ | ✓ |
| Criar/suspender/reativar lojas; marcar Pix de resgate pago | | | | | | ✓ | |
| Editar regras (Config), plano e equipe CajuGo | | | | | | ✓ | |

---

## 3. Escopo

### 3.1 No MVP (tudo pronto no lançamento)
1. **Vitrine pública** com busca, filtros, ordenação, favoritos, simulador, denúncia e banner Caju Indica [1a, 1b, 6d, 9a, 11a, 14a, 14b, 14d, 15a].
2. **Catálogo por loja** (mesmo layout da vitrine, com identidade da loja).
3. **Onboarding do lojista:** landing → cadastro (com código Caju Indica opcional) → Pix manual com comprovante → em análise → ativo [5b, 5c, 5d, 6c, 8d, 10a, 5e].
4. **Painel do lojista:** veículos, divulgação, leads, loja, conta, fatura, crédito Caju Indica [1c, 2a, 6e, 3a–3c, 8e, 10c, 15b].
5. **Rede Caju completa** [7a–7h, 13a–13d].
6. **Caju Indica completo** [8a–8g, 9a–9e].
7. **Login único com e-mail e senha** [9f], com recuperação manual de senha [6b].
8. **Pix manual:** comprovante, conferência, recusa, atraso, suspensão, cancelamento [6c, 10a–10c, 12e–12h].
9. **Admin:** painel, lojas, assinaturas, pagamentos, vendedores, veículos (aprovação e denúncias), indicações, regras [1d, 4a–4c, 6g, 7h, 8f, 8g, 10b, 14c, 14e, 15c].
10. **SEO:** páginas públicas renderizadas no servidor, URLs amigáveis, dados estruturados, sitemap e **páginas de descoberta** por marca, modelo e cidade (`SEO.md`).
11. **Estados e casos:** vazio, erro, carregamento, veículo indisponível, termos e privacidade [12a–12d, 12i].
12. **Regras numéricas editáveis** pelo admin (tabela `Config`, §5.14).

### 3.2 Fora do MVP (fase 2+)
- Gateway de pagamento (cartão, Pix automático, boleto) e recibos/NF automáticos.
- Login por celular com código (SMS/WhatsApp) [9c, aba "Celular" de 9f].
- Envio automático de WhatsApp/SMS/push (no MVP o aviso aparece no painel e uma pessoa envia pelo botão `wa.me`).
- Recuperação de senha automática por e-mail.
- Pagamento de comissão intermediado pela plataforma.
- Financiamento real com banco (o simulador é estimativa).
- Chat interno; app nativo; impulsionamento pago de anúncios; múltiplos planos.
- Consulta de placa; motos e caminhões (o modelo já prevê `tipo`).

---

## 4. Jornadas e fluxos

### 4.1 Comprador — encontrar e contatar
1. Acessa a vitrine (§1.7) [1a] ou o catálogo de uma loja.
2. Busca, filtra [6d] ou cai em "busca sem resultado" [12a] (sugestões + "Avisar quando chegar").
3. Abre o veículo [1b]: galeria, preço, ficha, itens, loja; **Simular** [14b]; ♡ favoritar [14a]; **Denunciar** [14d].
4. Contata a loja por **WhatsApp** ou **formulário** → vira **lead** [3a] com origem "via CajuGo", "Seu catálogo" ou "via vendedor {nome}".
5. Link antigo de veículo vendido/oculto abre [12d] com parecidos.

### 4.2 Onboarding do lojista
[5b] Landing → [5c] Cadastro (código Caju Indica opcional, [8d]) → [5d] Pagamento → [6c] chave Pix/QR + **comprovante** → [10a] Em análise (já pode cadastrar rascunhos) → admin confirma em [10b] → [5e] Ativo → [2a] primeiro veículo.

### 4.3 Lojista — dia a dia e mensalidade
1. **Meus veículos** [1c] → cadastra [2a] → publica (ou fica pendente de aprovação, se ligada) → liga/desliga **Divulgar na CajuGo**.
2. Recebe lead → aviso no painel [3a] → responde pelo WhatsApp → avança status.
3. Vendeu → **Confirmar venda** [7g] (quem vendeu, valor) → sai de todos os lugares.
4. **Mensalidade:** aviso de vencimento em 3 dias (no painel; o admin também avisa pelo WhatsApp) → [10c] Fatura (mensalidade + taxas Rede Caju − crédito Caju Indica) → comprovante → [10b] confirmação. Recusa → [12e]. Atraso > tolerância → suspensão [12f/12g] → pagamento confirmado → reativação.
5. Cancelar [12h] a qualquer momento.

### 4.4 Venda via Rede Caju
Vendedor se cadastra [7a] → admin aprova [7h] → parceria aprovada [7f] ou convite [13a] → vendedor compartilha link [7c] → comprador vira lead marcado com o vendedor [3a] → lojista confirma a venda [7g] (vendedor e valor) → comissão "A receber" no extrato do vendedor [7d] e taxa de 1% na próxima fatura [10c] → lojista paga o vendedor por fora → vendedor marca "Recebi".

### 4.5 Caju Indica
Indicador gera link [8a/9d] → loja indicada abre [8c] → cadastro com código [8d] → 1º pagamento confirmado → indicação "Ativa" → a cada mensalidade confirmada da indicada (até 3), crédito de R$ 30 → lojista: abatido na fatura [8e]; vendedor/indicador: saldo → resgate Pix ≥ R$ 50 [9e] → admin paga [8g].

### 4.6 Moderação de veículo
(Se aprovação prévia ligada) lojista publica → fila [14c] → Aprovar / Pedir ajuste. Comprador denuncia [14d] → fila [14e] → Manter / Ocultar (loja avisada com o motivo).

### 4.7 Administrador
Painel [4a] com pendências → Pagamentos Pix [10b] → Lojas [1d]/[6g] → Assinaturas [4b] → Vendedores [7h] → Aprovação [14c] e Denúncias [14e] → Indicações [8g] → Regras [4c, 8f]. Desktop [15c] com sidebar e contadores de pendências.

---

## 5. Regras de negócio e máquinas de estado

### 5.1 Assinatura do Catálogo
- R$ 100/mês, vencimento no dia da 1ª confirmação (ex.: dia 26). Sem fidelidade.
- A loja só fica **ativa** após o admin confirmar o 1º comprovante. Antes disso o lojista já pode cadastrar veículos como **rascunho** [10a].
- Aviso de vencimento 3 dias antes: no painel do lojista e na lista do admin, com botão `wa.me` para o admin avisar.
- **Tolerância de atraso: 5 dias** (`Config`, a confirmar). Depois, a loja fica **suspensa**: catálogo e veículos ocultos ao público [12g, sem expor o motivo]; dados preservados; edição permitida; painel com alerta e botão de pagar [12f].
- Reativação automática quando o admin confirmar o pagamento.
- **Cancelamento** [12h]: sem multa; loja no ar até o fim do período pago; depois os veículos saem do ar; dados guardados 90 dias para reativar; crédito Caju Indica não usado expira; pode desfazer até o fim do período.
- Slug reservado no cadastro; liberado se não houver 1º pagamento confirmado em 7 dias.

### 5.2 Status da loja
```
cadastrada ──comprovante enviado──▶ pagamento_em_analise ──admin confirma──▶ ativa
     ▲                                     │ admin recusa                     │ vence sem pagamento
     └─────────────(reenvio)───────────────┘                                  ▼
ativa ◀──pagamento confirmado── em_atraso ──tolerância──▶ suspensa ──pagamento confirmado──▶ ativa
ativa ──cancela──▶ cancelamento_agendado ──fim do período──▶ cancelada ──90 dias──▶ arquivada
```
| Status | Catálogo da loja | Vitrine e links de vendedor | Painel do lojista |
|---|---|---|---|
| cadastrada / pagamento_em_analise | fora do ar | fora | rascunhos + tela de pagamento [10a] |
| ativa | no ar | conforme veículos | completo |
| em_atraso | no ar (tolerância) | no ar | completo + alerta de fatura |
| suspensa | "Catálogo temporariamente indisponível" [12g] | fora | alerta + pagar [12f]; edição permitida |
| cancelamento_agendado | no ar até o fim do período | no ar | completo + aviso + desfazer |
| cancelada / arquivada | fora do ar | fora | somente Conta (reassinar) |

### 5.3 Status do veículo
```
rascunho ──publicar──▶ (pendente_aprovacao) ──aprovar──▶ publicado ──vender──▶ vendido
    ▲                        │ pedir ajuste                 │  ▲ ocultar/mostrar (admin)
    └──────despublicar───────┴──────────────────────────────┘  oculto
publicado ──excluir──▶ excluído (soft delete) · vendido ──reabrir (até 7 dias)──▶ publicado
```
| Status | Catálogo da loja | Vitrine CajuGo e links de vendedor | Pode divulgar? |
|---|---|---|---|
| rascunho | não | não | "Publique para liberar" |
| pendente_aprovacao | não | não | aguardando revisão |
| publicado | sim | sim, **se** `divulgar_cajugo` e loja no ar | sim |
| oculto (admin, com motivo) | sim | não | — |
| vendido | não ([12d] no link antigo) | não | "Removido de todos os catálogos" |
| excluído | não | não | — |

- `divulgar_cajugo`: padrão vem de Minha loja [3b].
- Alterações de preço/dados propagam em tempo real (cache visível ≤ 60 s).

### 5.4 Status do lead
```
novo ──▶ em_contato ──▶ negociando ──▶ vendido
   └──────────┴─────────────┴────────▶ perdido
```
- Avanço em um toque no card [3a]; "Perdido" pelo menu do card.
- Origem: `cajugo` (vitrine), `catalogo` (link da loja), `vendedor` (link `?ref=`, guarda o vendedor).
- Lead vendido sugere confirmar a venda do veículo [7g] (e vice-versa).

### 5.5 Sincronização (fonte única de estoque)
- Catálogo da loja, vitrine e links de vendedores leem o **mesmo registro** do veículo; a vitrine é uma consulta filtrada, não uma cópia.
- Visível na vitrine: `status = publicado AND divulgar_cajugo AND loja no ar (ativa, em_atraso, cancelamento_agendado)`.
- Vendido/oculto sai de todos os lugares em segundos.

### 5.6 Pagamento por Pix manual
No MVP não há gateway: nenhum dado de cartão, nenhuma cobrança automática, nenhum webhook.
- **Chave Pix da CajuGo** e favorecido configurados em `Config` (valor a definir). A tela [6c] mostra chave (com Copiar), **QR estático** com o valor, passos e o **upload do comprovante** (imagem ou PDF). "Enviar comprovante" só habilita com arquivo.
- Após o envio: pagamento "Comprovante enviado" e loja "Pagamento em análise" [10a].
- **Admin [10b]:** fila de comprovantes (loja, valor, referência, horário), com **alerta quando o valor difere do esperado**. Confere no extrato bancário e:
  - **Confirmar:** fatura paga; ativa ou reativa a loja; define o próximo vencimento; abre botão `wa.me` para avisar o lojista.
  - **Recusar:** motivo obrigatório (ex.: valor divergente) → lojista vê [12e] (motivo, valor faltante, novo upload); a loja segue no ar até o limite de tolerância.
- Prazo de conferência: **1 dia útil** (`Config`, a confirmar).
- **Registro sem comprovante** (exceção, ex.: dinheiro): o admin pode registrar o pagamento direto em [6g]; fica no log de auditoria.
- **Fatura mensal** [10c] = mensalidade + taxas CajuGo de vendas via vendedor do período − crédito Caju Indica.
- Recibo e nota fiscal: fora do sistema no MVP.

### 5.7 Rede Caju
- Vendedor **não paga**.
- **Curadoria:** cadastro [7a] entra "Em análise"; o admin verifica CPF, antecedentes e documentos e **aprova** [7h]. Só aprovados aparecem para as lojas. Admin pode bloquear/desbloquear.
- Vendedor pede parceria [7c]; lojista **aprova/recusa** [7f] ou **convida** pela lista de disponíveis [13a].
- Um vendedor pode ter várias lojas parceiras e divulgar toda a vitrine, mas **só ganha comissão de lojas parceiras**.
- **Comissão** [7e]: definida pela loja — % do preço ou valor fixo; padrão da loja + ajuste por veículo; toggle "Aceitar vendedores independentes".
- **Taxa CajuGo: 1%** do valor final, só em vendas via vendedor, lançada na fatura seguinte (`Config`).
- **Link do vendedor** por veículo (`/v/{id}?ref={codigo}`); leads vindos dele ficam marcados com o vendedor.
- **Atribuição** [7g]: ao marcar vendido, o sistema sugere o vendedor do link; o lojista confirma (vendedor do link / outro parceiro / venda da loja), informa o valor final e se já pagou a comissão.
- **Pagamento da comissão:** o lojista paga direto ao vendedor (Pix do vendedor), fora da plataforma; o vendedor marca "Recebi" [7d].
- Status da comissão: Em análise → A receber → Paga.
- Perfil do vendedor [13b]: vendas na CajuGo, lojas, nota média, histórico com a loja, avaliações. Lojista pode avaliar, encerrar parceria e **denunciar** [13d] (cobrou por fora, informação falsa, comportamento inadequado, uso indevido do nome da loja, outro); análise do admin em até 2 dias úteis.

### 5.8 Caju Indica
- Indica **somente lojas** para o Catálogo (não há indicação de vendedores).
- Quem indica: lojistas, vendedores, indicadores e admin (links de campanha, sem recompensa).
- Recompensa: **30% da mensalidade (R$ 30) por mês, por até 3 meses**, enquanto a loja continuar assinando, a partir do **1º pagamento confirmado** da indicada.
- Pausa se a indicada atrasar/for suspensa; retoma ao regularizar, sem estender o prazo.
- Recebimento: **lojista** → crédito abatido na fatura (sobra passa para o mês seguinte); **vendedor/indicador** → saldo resgatável por Pix a partir de **R$ 50** [9e]; o admin marca o Pix como pago [8g].
- Código/link pessoal (ex.: `RICARDO10`, `/i/ricardo10`), aplicado pelo link [8c] ou digitado no cadastro [8d] ("Indicação de {nome} aplicada").
- Status da indicação: Convite → Cadastrada (aguardando 1º pagamento) → Ativa ⇄ Pausada → Encerrada.
- **Antifraude:** CPF único por resgate; autoindicação bloqueada (mesmo CPF/CNPJ/celular).
- CPF e chave Pix do indicador só são pedidos no primeiro resgate.

### 5.9 Simulador de parcelas [14b]
- Entrada 0/20/30/50%; prazo 24/36/48/60x; taxa padrão **1,79% a.m.** (`Config`); fórmula Price.
- Mostra parcela, entrada, valor financiado e total, com o aviso "estimativa sem análise de crédito".
- CTA: enviar a simulação à loja pelo WhatsApp (mensagem pronta).
- Cards e página do veículo mostram "a partir de R$ X/mês" se o lojista ativar "Exibir parcela estimada".

### 5.10 Favoritos [14a]
- Coração em cards e na página do veículo; salvos no aparelho; sincronizados quando a pessoa tem conta e entra.
- Selos "Baixou R$ X" (preço menor que o do momento em que favoritou) e "Vendido" (leva a sugestões). Estado vazio próprio.
- Aviso de queda de preço por WhatsApp: fase 2.

### 5.11 Busca sem resultado [12a]
- Sugere limpar filtros ou buscar só a marca e oferece **"Avisar quando chegar"**: guarda contato + filtros (`AlertaBusca`).
- MVP: quando entra um veículo compatível, o alerta aparece para o admin com botão `wa.me` para avisar a pessoa; envio automático é fase 2.

### 5.12 Aprovação prévia e denúncias
- Toggle global "Aprovar veículos antes de publicar" [4c] (padrão: desligado).
- Fila [14c] com checagens automáticas: nº de fotos (mín. **6**, `Config`), preço vs. FIPE (alerta se > 20% abaixo), placa/chassi informados. Ações: **Aprovar** ou **Pedir ajuste** (loja avisada com o motivo).
- Qualquer pessoa denuncia anúncio [14d]: já vendido, preço não real, fotos de outro carro, suspeita de golpe. Anônima para a loja.
- Fila [14e] agrupa denúncias por anúncio: **Manter** (arquiva) ou **Ocultar** (sai da vitrine; loja recebe o motivo).

### 5.13 Outras máquinas de estado
- **Pagamento:** Aguardando → Comprovante enviado → Confirmado | Recusado → (reenvio) Comprovante enviado.
- **Vendedor:** Em análise → Ativo ⇄ Bloqueado.
- **Parceria:** Pedido/Convite → Ativa → Encerrada (ou Recusada).
- **Comissão:** Em análise → A receber → Paga.
- **Indicação:** Convite → Cadastrada → Ativa ⇄ Pausada → Encerrada.
- **Recompensa:** Prevista → Creditada → Abatida/Resgatada.
- **Resgate:** Solicitado → Pago.
- **Denúncia:** Aberta → Mantido | Oculto (veículo) / Bloqueado (vendedor).

### 5.14 Regras configuráveis (`Config`)
Nenhuma regra numérica fica fixa no código; o admin edita em [4c] e [8f]:

| Regra | Valor provisório |
|---|---|
| Chave Pix e favorecido da CajuGo | [a definir] |
| Prazo de conferência do comprovante | 1 dia útil |
| Tolerância de atraso antes da suspensão | 5 dias |
| Taxa CajuGo por venda via vendedor | 1% |
| Caju Indica: % da mensalidade · meses · resgate mínimo | 30% · 3 · R$ 50 |
| Caju Indica: programa ativo; quem pode indicar | sim; lojistas, vendedores, indicadores |
| Taxa do simulador | 1,79% a.m. |
| Aprovação prévia · mínimo de fotos | desligada · 6 |
| Retenção de dados após cancelamento | 90 dias |

### 5.15 Critérios de aceite principais do MVP
Viram requisitos e testes nas specs (`SDD.md`):
- Marcar um veículo como vendido o remove do catálogo, da vitrine e dos links de vendedores em segundos, e o link antigo abre [12d].
- Uma loja só fica pública depois da confirmação do 1º Pix; fica oculta após a tolerância de atraso e volta quando o pagamento é confirmado.
- Vendedor só aparece para lojas depois de aprovado pelo admin e só recebe comissão de lojas parceiras.
- Venda confirmada via vendedor gera comissão "A receber" e a taxa CajuGo na próxima fatura da loja.
- Indicação só rende depois do 1º pagamento confirmado da loja indicada, por no máximo 3 meses, pausando em atraso.
- Crédito Caju Indica do lojista reduz a fatura; saldo de indicador ou vendedor só é resgatado a partir do mínimo.
- Todas as regras numéricas são editáveis pelo admin.

---

## 6. Telas (inventário)

| Id | Tela | Público | Rota sugerida |
|---|---|---|---|
| 1a | Vitrine / catálogo da loja | Visitante | `/` e `/loja/{slug}` |
| 1b | Página do veículo (simular, denunciar) | Visitante | `/v/{id}-{marca}-{modelo}` e `/loja/{slug}/v/{id}` |
| 1c | Meus veículos | Lojista | `/painel/veiculos` |
| 1d | Lojas / Veículos CajuGo / Usuários | Admin | `/admin/lojas`, `/admin/veiculos`, `/admin/usuarios` |
| 2a | Novo / editar veículo | Lojista | `/painel/veiculos/novo`, `/painel/veiculos/{id}` |
| 3a · 3b · 3c | Leads · Minha loja · Conta | Lojista | `/painel/leads`, `/painel/loja`, `/painel/conta` |
| 4a · 4b · 4c | Painel · Assinaturas · Conta (vitrine, aprovação, taxa Rede Caju, Pix, prazos) | Admin | `/admin`, `/admin/assinaturas`, `/admin/conta` |
| 5a | Menu (substituído por 11a) | — | — |
| 5b · 5c · 5d | Landing lojista · Cadastro · Pagamento | Lojista | `/lojistas`, `/lojistas/cadastro`, `/lojistas/pagamento` |
| 5e | Assinatura ativa + onboarding | Lojista | `/painel/veiculos` (estado vazio) |
| 6a | Entrar (substituída por 9f) | — | — |
| 6b | Recuperar senha (manual) | Todos | `/recuperar` |
| 6c | Pix manual: chave, QR estático, comprovante | Lojista | `/lojistas/pagamento/pix` |
| 6d | Filtros e ordenação | Visitante | overlay em `/` e `/loja/{slug}` |
| 6e · 6f · 6g | Editar veículo · Diálogos · Detalhe da loja | Lojista/Admin | `/painel/veiculos/{id}`, overlay, `/admin/lojas/{id}` |
| 7a–7d | Cadastro · Painel · Vitrine/compartilhar · Extrato | Vendedor | `/rede/cadastro`, `/rede`, `/rede/vitrine`, `/rede/extrato` |
| 7e–7g | Comissão · Vendedores · Confirmar venda | Lojista | `/painel/rede/comissao`, `/painel/rede/vendedores`, overlay |
| 7h | Vendedores (aprovar, bloquear) | Admin | `/admin/vendedores` |
| 8a–8e | Caju Indica: página · indicações · landing do link · cadastro com código · crédito | Lojista/Público | `/painel/indica`, `/painel/indica/indicacoes`, `/i/{codigo}`, `/lojistas/cadastro?codigo=`, `/painel/indica/credito` |
| 8f · 8g | Regras do programa · Indicações e pagamentos | Admin | `/admin/indica/regras`, `/admin/indica` |
| 9a | Vitrine com banner e rodapé Caju Indica | Visitante | `/` |
| 9b · 9d · 9e | Cadastro rápido · Painel · Resgate Pix | Indicador | `/indica/cadastro`, `/indica`, `/indica/resgate` |
| 9c | Código por celular (**fase 2**) | — | — |
| 9f | Login único (MVP: só e-mail e senha) | Todos | `/entrar` |
| 10a · 10c | Pagamento em análise · Fatura do mês | Lojista | `/painel/pagamento`, `/painel/fatura` |
| 10b | Pagamentos Pix a confirmar | Admin | `/admin/pagamentos` |
| 11a | Menu da home | Visitante | overlay em `/` |
| 12a–12d | Busca sem resultado · Sem conexão · Carregando · Veículo indisponível | Visitante | estados |
| 12e–12h | Comprovante recusado · Loja suspensa (lojista e público) · Cancelar assinatura | Lojista/Público | estados / overlay |
| 12i | Termos e privacidade | Todos | `/termos` |
| 13a · 13b · 13d | Vendedores disponíveis · Perfil · Denunciar vendedor | Lojista | `/painel/rede/disponiveis`, `/painel/rede/vendedores/{id}`, overlay |
| 13c | Conta do vendedor | Vendedor | `/rede/conta` |
| 14a · 14b · 14d | Favoritos · Simulador · Denunciar anúncio | Visitante | `/favoritos`, overlay, overlay |
| 14c · 14e | Aprovação prévia · Denúncias | Admin | `/admin/aprovacao`, `/admin/denuncias` |
| 15a · 15b · 15c | Vitrine · Painel do lojista · Admin (desktop 1280) | — | mesmas rotas, ≥ 1024 px |

Navegação:
- Lojista (mobile): **Veículos · Leads · Minha loja · Conta** (Rede Caju, Caju Indica e Fatura acessados pela Conta e pelos atalhos).
- Vendedor: **Início · Vitrine · Extrato · Conta**.
- Admin (mobile): **Painel · Lojas · Assinaturas · Conta**; desktop [15c]: sidebar com Visão geral, Lojas, Assinaturas, Pagamentos Pix, Veículos, Rede Caju, Caju Indica, Conta (com contadores de pendências).

---

## 7. Requisitos funcionais por tela

### [1a] Catálogo
**Modos**
- **CajuGo**: cabeçalho com logo CajuGo; título "Carros usados e seminovos à venda"; contador "X anúncios de Y lojas"; cada card mostra "Anunciado por {loja}".
- **Lojista**: cabeçalho com logo/sigla, nome e cidade da loja + "catálogo CajuGo"; título "Estoque {loja}"; contador "X veículos disponíveis"; card sem linha de loja.

**Elementos**
- Cabeçalho fixo: logo, favoritos (♡ → [14a]), menu (☰ → [11a]).
- Busca: "Buscar marca, modelo ou versão" (busca textual em marca, modelo, versão).
- Chips horizontais: **Filtros** (com contador de filtros ativos) + Marca, Preço, Ano, Km, Câmbio (cada um abre bottom sheet).
- Ordenação: Mais relevantes (padrão), Menor preço, Maior preço, Mais recentes, Menor km, Ano mais novo.
- Card do veículo: foto de capa (contador 1/N), favoritar, selo opcional (ex.: "Abaixo da FIPE", "Único dono"), MARCA MODELO, versão, ano fab/modelo, km, cidade (UF), [loja], preço, "a partir de R$ X/mês*", botão **Ver detalhes**.
- **Carregar mais veículos** (paginação de 20 em 20; ou scroll infinito).
- Rodapé: "*Valor estimado. Simule a sua parcela."

**Regras**
- Selo "Abaixo da FIPE" só se `preco < valor_fipe` (quando FIPE disponível).
- Parcela estimada exibida somente se o lojista ativou "Exibir parcela estimada" [2a]. Fórmula sugerida: entrada 20%, 48x, taxa configurável pelo admin.
- Favoritos: §5.10 (no aparelho; sincronizados com conta).
- Vitrine CajuGo mostra banner e rodapé **Caju Indica** [9a].
- Relevância (MVP): recência de publicação + completude do anúncio (nº de fotos, descrição).

**Estados**: carregando (skeleton de cards) [12c], busca sem resultado [12a], sem conexão / erro com "Tentar de novo" [12b].
**Desktop** [15a]: header com busca e menu, filtros laterais, grid de 3 colunas, card Caju Indica.

### [1b] Página do veículo
- Galeria em carrossel (swipe), contador 1/N, botões voltar, compartilhar (Web Share API; fallback copiar link), favoritar.
- Selos (Abaixo da FIPE, Aceita troca…).
- Título "MARCA **MODELO**" + versão em caixa alta.
- Bloco de preço: preço, "a partir de R$ X/mês*", link **Simular** → simulador [14b].
- Ficha: Cidade (linha inteira), Ano, KM, Câmbio, Carroceria, Combustível, Final de placa, Cor, Aceita troca, Único dono, IPVA pago (+ Licenciado, Revisões na concessionária, Garantia de fábrica, Blindado quando = Sim).
- "Sobre este carro" (descrição livre).
- "Itens do veículo" (chips).
- Card da loja: sigla/logo, nome, cidade, **Ver estoque da loja**.
- Formulário "Envie uma mensagem à loja": Nome*, E-mail*, Telefone*, Mensagem (pré-preenchida "Olá, tenho interesse no veículo. Por favor entre em contato.") → **Enviar mensagem**.
- **Denunciar anúncio** → [14d].
- Barra fixa inferior: **WhatsApp** (abre `wa.me/{numero}?text=` com mensagem contendo veículo e link) e **Ver parcelas** (→ [14b]).
- Aberta por link de vendedor (`?ref={codigo}`): o código é guardado e o lead criado leva o vendedor.

**Regras**
- Clique em WhatsApp também gera lead (origem + veículo + "via WhatsApp"; sem nome se não informado).
- Formulário: validação de e-mail e telefone BR; anti-spam (honeypot + rate limit por IP); confirmação "Mensagem enviada. A loja vai responder em breve."
- Veículo vendido/oculto acessado por link direto: tela [12d] "Este veículo já foi vendido" + parecidos.
- Final de placa: somente o último dígito; placa completa nunca é exibida.

### [5a] Menu (substituído por [11a])
> Versão antiga do menu; vale [11a].

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
- FAQ: CNPJ? Cancelar? Comissão? Rede Caju (vendedores)?
- Barra fixa: "R$ 100/mês · Plano Catálogo" + **Prosseguir** → [5c].

### [5c] Cadastro (1/2)
Campos:
| Campo | Tipo | Validação |
|---|---|---|
| Nome da loja | texto | obrigatório, 2–60 |
| Cidade | autocomplete cidade/UF | obrigatório |
| WhatsApp da loja | telefone BR | obrigatório, máscara (99) 99999-9999 |
| Endereço do catálogo (slug) | texto com prefixo do endereço vigente (§1.7: `cajugo.vercel.app/loja/`) | obrigatório, `[a-z0-9-]{3,40}`, sem hífen no início/fim, único; sugestão automática a partir do nome; feedback "Disponível"/"Indisponível" em tempo real |
| Seu nome | texto | obrigatório |
| E-mail | e-mail | obrigatório, único |
| Celular | telefone BR | obrigatório |
| Senha | senha | ≥ 8 caracteres |
| Código de indicação | texto (opcional) | validado ao vivo: "Indicação de {nome} aplicada" [8d]; preenchido sozinho quando vem do link [8c]; bloqueia autoindicação |
| Aceite de termos | checkbox | obrigatório (link para [12i]) |
- Barra de progresso 2 segmentos; voltar → [5b].
- **Continuar para pagamento** (desabilitado até válido).

### [5d] Pagamento (2/2)
- Resumo: Plano Catálogo, R$ 100/mês, loja, vencimento no dia da 1ª confirmação, "Sem fidelidade", ✓ "Você pode cancelar a assinatura a qualquer momento."
- Forma de pagamento: **só Pix** (manual, §5.6). Cartão e Pix automático ficam para a fase 2.
- CPF ou CNPJ para nota fiscal (validação de dígitos).
- CTA **Pagar com Pix · R$ 100** → [6c].
- Enquanto a loja não estiver ativa, o login leva a esta tela ou a [10a].

### [5e] Catálogo vazio + onboarding
- Aparece quando o admin confirma o 1º comprovante [10b].
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
- Card: sigla, nome, tempo relativo, veículo · preço, selo de status, selo de origem ("via CajuGo" / "Seu catálogo" / "via vendedor {nome}"), mensagem, ações **WhatsApp**, **Ligar** (`tel:`), **→ próximo status**.
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
- Assinatura: Plano Catálogo, status, R$ 100/mês, próxima cobrança, **Como pagar** (chave Pix da CajuGo + WhatsApp do suporte; "Alterar forma de pagamento" é fase 2), texto "Você pode cancelar a assinatura a qualquer momento. O catálogo fica no ar até o fim do mês já pago."
- **Fatura do mês** → [10c]; faturas anteriores com mês, valor, status (Recibo/NF fora do sistema no MVP).
- Atalhos: **Rede Caju** (comissão [7e], vendedores [7f]) e **Caju Indica** ([8a], crédito [8e]).
- Notificações: no MVP os avisos aparecem no painel; toggles de WhatsApp/e-mail/push aparecem como "em breve".
- Links: Dados pessoais, Alterar senha, Usuários da loja, Central de ajuda, Termos de uso e privacidade.
- **Sair**; **Cancelar assinatura** → [12h].

### [4a] Painel admin
- Saudação + mês.
- KPIs: Lojas ativas, Receita mensal (MRR), Veículos na vitrine, Leads no mês (com variação vs. mês anterior).
- "Precisa de atenção": comprovantes a conferir [10b], vencimentos em 3 dias (com `wa.me`), assinaturas atrasadas, vendedores em análise [7h], veículos a aprovar [14c], denúncias [14e], Pix de resgate a pagar [8g], alertas de busca a avisar (cada item abre a lista filtrada).
- Origem dos leads (barra Vitrine CajuGo × Catálogos).
- Lojas com mais leads (top 3–10).

### [1d] Lojas / Veículos CajuGo / Usuários (admin)
- Abas.
- **Lojas**: KPIs (assinaturas ativas, receita mensal), **Nova loja** (admin cria loja e conta do dono com senha temporária, passada manualmente), card com sigla, nome, dono · cidade, selo de plano, "N veículos · M na CajuGo", **Gerenciar** (detalhe da loja: dados, veículos, leads, assinatura, ações).
- **Veículos CajuGo**: texto explicativo; lista com miniatura, nome, loja · preço, **Ocultar** (pede motivo; notifica o lojista). Filtros sugeridos: denunciados, pendentes de aprovação.
- **Usuários**: lista com sigla, nome, loja/info, selos de papel (Lojista, Usuário da loja, Vendedor, Indicador, Admin, Suporte).

### [4b] Assinaturas (admin)
- Cabeçalho: MRR; contagem Em dia / Atrasadas / Suspensas.
- Card do plano: "Plano Catálogo · R$ 100/mês · cobrança todo dia X" + **Editar plano** (mudança de preço vale para novas cobranças; aviso no painel e por `wa.me` 30 dias antes).
- Filtros: Todas, Em dia, Atrasadas, Suspensas.
- Card: loja, dono, desde, selo; linha de informação conforme status:
  - Em dia → "Próxima cobrança dd/mm · R$ 100" + **Detalhes**
  - Atrasada → "Em atraso N dias · R$ 100" + botão `wa.me` (cobrar) · **Suspender**
  - Em análise → "Comprovante enviado dd/mm" + **Conferir** (→ [10b])
  - Suspensa → "Catálogo e vitrine · Fora do ar" + **Reativar**

### [4c] Conta admin
- Perfil (papel Admin).
- Equipe CajuGo + **Convidar** (papéis Admin, Suporte).
- Vitrine CajuGo: nome, endereço (domínio), WhatsApp de atendimento.
- Toggle **Aprovar veículos antes de publicar** + mínimo de fotos.
- **Rede Caju:** "Taxa CajuGo por carro vendido via vendedor (%)" + link para [7h]. Sem selos "em breve".
- **Pagamento:** chave Pix e favorecido, prazo de conferência, tolerância de atraso, taxa do simulador (`Config`, §5.14).
- **Caju Indica:** link para as regras [8f].
- Links: Dados pessoais, Alterar senha, Logs de atividade.
- **Sair**.

---

### [6a] Entrar (substituída por [9f])
> Vale o login único [9f]. Regras que continuam (detalhadas na spec `001-auth`): 5 tentativas erradas em 15 min bloqueiam a conta por 15 min (e há limite por rede); mensagem genérica "E-mail ou senha incorretos"; sessão vale enquanto houver uso a cada 30 dias (admin e suporte: 1 dia); senha temporária expira em 24 h.

### [6b] Recuperar senha
**MVP (manual, sem e-mail):**
- Texto: "Para criar uma nova senha, fale com o suporte CajuGo." + botão **Falar no WhatsApp** (abre `wa.me` com o WhatsApp de atendimento de [4c] e a mensagem "Esqueci minha senha. E-mail da conta: ").
- O admin confere a identidade e define uma **senha temporária** em [6g]; passa a senha ao lojista pelo WhatsApp.
- No próximo login com a senha temporária, o sistema leva à tela **Nova senha** (senha + confirmar senha) antes de liberar o painel.

**Fase 2 (automático por e-mail):** campo E-mail → **Enviar link**; sempre exibe "Link enviado"; link de uso único válido por 1 hora; reenvio após 60 s. Exige provedor de e-mail (SMTP próprio no Supabase Auth).

### [6c] Pix manual (chave, QR e comprovante)
- Aberto por **Pagar com Pix** em [5d], pela fatura [10c] ou pelo alerta de suspensão [12f].
- Valor a pagar (mensalidade ou total da fatura), **chave Pix da CajuGo** com **Copiar**, **QR code estático** com o valor, favorecido e "Como pagar" em passos.
- **Anexar comprovante** (foto ou PDF, até 10 MB) com pré-visualização; **Enviar comprovante** só habilita com arquivo.
- Nota: "Conferimos o comprovante em até 1 dia útil."
- Após o envio → [10a].

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
| Marcar como vendido | Lojista | Sai do catálogo, da vitrine e dos links de vendedor na hora; desfazer em até 7 dias | Nota: leads abertos viram "Perdido", exceto o comprador escolhido. Se a loja aceita vendedores, abre [7g] no lugar deste diálogo | Marcar como vendido (escuro) |
| Cancelar assinatura | Lojista | Catálogo e vitrine ficam no ar até o fim do mês pago; sem multa | Motivo opcional (lista) | Cancelar assinatura (vermelho) · Manter assinatura |
| Suspender loja | Admin | Catálogo e veículos saem do ar; lojista vê o alerta [12f] e pode pagar | Nota com dias e valor em atraso; botão `wa.me` para avisar | Suspender loja (vermelho) |
| Ocultar veículo | Admin | Sai só da vitrine, continua no catálogo da loja; lojista avisado com o motivo | Motivo obrigatório (lista) | Ocultar da vitrine (escuro) |

Todas as confirmações geram registro em `LogAtividade`.

### [6g] Detalhe da loja (admin)
- Aberto por **Gerenciar** em [1d] ou pelos itens do Painel [4a].
- Cabeçalho: voltar para Lojas, sigla, nome, cidade, "cliente desde", selo de status da assinatura, link do catálogo.
- KPIs: Veículos, Na CajuGo, Leads no mês.
- **Dono**: nome, e-mail, celular, CPF/CNPJ.
- **Assinatura**: plano, próxima cobrança, total pago, link **Faturas**, comprovantes enviados e **Registrar pagamento sem comprovante** (exceção, §5.6).
- **Rede Caju:** aceita vendedores?, comissão padrão, parceiros, vendas no mês.
- **Veículos**: primeiros itens com **Ocultar** (→ [6f]) e **Ver todos (N)**.
- Ações: Editar dados da loja, Ver catálogo público, **Definir senha temporária** (mostra a senha uma única vez para o admin copiar; obriga a troca no próximo login), Histórico de atividade, **Suspender loja** (→ [6f]; vira **Reativar** quando suspensa).

### [7a] Cadastro do vendedor (Rede Caju)
- Campos: nome, CPF (dígitos válidos, único), celular, e-mail, cidade, chave Pix, senha, aceite dos termos [12i].
- Ao enviar: status **Em análise**; tela de confirmação explica a curadoria. Vendedor não paga nada.

### [7b] Painel do vendedor
- KPIs: a receber, vendas do mês, cliques nos links.
- Lojas parceiras com status (Parceiro / Pendente / Sem parceria); últimas vendas.
- Navegação: Início · Vitrine · Extrato · Conta.

### [7c] Vitrine do vendedor
- Todos os veículos da vitrine. Loja parceira: mostra **"Você ganha R$ X"** e **Compartilhar** (link `/v/{id}?ref={codigo}` + WhatsApp). Loja não parceira: **Pedir parceria**.

### [7d] Extrato do vendedor
- Filtros: Todas · A receber · Em análise · Pagas. Cada venda: veículo, loja, valor da comissão, status; botão **Recebi** em "A receber".

### [7e] Configurar comissão (lojista)
- Toggle **Aceitar vendedores independentes**.
- Tipo: % do preço ou valor fixo; valor padrão; prévia do cálculo (comissão + taxa CajuGo de `Config`); ajuste por veículo; informativo da taxa CajuGo.

### [7f] Gerenciar vendedores (lojista)
- Pedidos de parceria (Aprovar / Recusar), parceiros ativos, link **Encontrar vendedores** → [13a].

### [7g] Confirmar venda (lojista)
- Substitui o "Vendido" simples quando a loja aceita vendedores.
- Valor final; **quem vendeu**: vendedor sugerido pelo link / outro parceiro / venda da loja; mostra comissão e taxa CajuGo; toggle **Já paguei a comissão**.
- Ao confirmar: cria `Venda`, comissão do vendedor "A receber" (ou "Paga"), taxa na próxima fatura, veículo sai de todos os lugares.

### [7h] Vendedores (admin)
- KPIs; **cadastros em análise primeiro** (verificar CPF, antecedentes, documentos → **Aprovar**), ativos (**Bloquear**), bloqueados (**Desbloquear**), denúncias recebidas [13d].

### [8a] Caju Indica (lojista)
- Headline "Ganhe 30% da mensalidade de cada loja indicada"; "Por até 3 meses, enquanto a loja continuar assinando. Começa a contar no 1º pagamento dela."
- Código pessoal, link, **Copiar**, **WhatsApp**; "Como funciona"; atalhos para indicações [8b] e crédito [8e]. Não existe indicação de vendedor.

### [8b] Minhas indicações
- Filtros: Todas · Rendendo · Cadastradas · Pausadas. Cada uma: loja, status, quanto já rendeu e quantos meses faltam.

### [8c] Landing pública do link
- Quem indicou; card do Catálogo (R$ 100/mês) → cadastro [5c] com o código aplicado.

### [8d] Cadastro com código
- Campo de código validado ao vivo ("Indicação de {nome} aplicada"); erro claro se inválido ou autoindicação.

### [8e] Crédito do lojista
- Crédito disponível para a próxima fatura; demonstrativo (mensalidade − crédito); movimentações.

### [8f] Regras do Caju Indica (admin)
- Programa ativo; recompensa (%), duração (meses), a partir de (1º pagamento); quem pode indicar (toggles); forma de pagamento; links de campanha (+ **Novo link**).

### [8g] Indicações e pagamentos (admin)
- KPIs; filtros Todas · Aguardando · Válidas · Pix a pagar; **Marcar Pix pago** (com `wa.me` para avisar).

### [9a] Vitrine com Caju Indica
- Banner e rodapé "Indique uma loja e ganhe" na vitrine → [9b] ou [8a].

### [9b] Cadastro rápido de indicador
- Nome, celular, e-mail e senha (MVP sem código por celular). CPF e chave Pix só no primeiro resgate.

### [9c] Código por celular (fase 2)
> Fora do MVP: depende de SMS/WhatsApp pago.

### [9d] Painel do indicador
- Saldo, barra até o resgate mínimo, link e código, indicações, movimentações.

### [9e] Resgate por Pix
- Disponível com saldo ≥ R$ 50 (`Config`). CPF (único), tipo e chave Pix, confirmação. Status Solicitado → Pago [8g].

### [9f] Login único
- MVP: só **E-mail e senha** (a aba "Celular" do desenho é fase 2). Link **Esqueci minha senha** → [6b].
- Após autenticar: vai ao painel do papel principal; se a conta tem vários papéis, permite trocar.
- Redirecionamentos: lojista sem pagamento confirmado → [5d]/[10a]; loja suspensa → [12f]; senha temporária → Nova senha.
- Rodapé "Ainda não tem conta?": Divulgar meus veículos [5b] · Rede Caju [7a] · Caju Indica [9b].

### [10a] Pagamento em análise (lojista)
- "Comprovante recebido. Estamos conferindo." + prazo; pode cadastrar veículos como rascunho; após confirmação → [5e].

### [10b] Pagamentos Pix (admin)
- KPIs (aguardando conferência, confirmados no mês, lojas em atraso); lembrete "Confira no extrato se o valor caiu na chave".
- Cada comprovante: loja, referência (1ª mensalidade / mês / taxas), valor, horário, arquivo (abre em visualização privada); **alerta "Valor diferente do esperado"**.
- **Confirmar** (ativa/reativa a loja; botão `wa.me` para avisar) · **Recusar** (motivo obrigatório).

### [10c] Fatura do mês (lojista)
- Mensalidade R$ 100 + taxas CajuGo de vendas via vendedor − crédito Caju Indica = total; vencimento; status; **Pagar com Pix** → [6c].

### [11a] Menu da home
- Comprar veículos · Produtos (Catálogo, Rede Caju) · Caju Indica · Favoritos · Entrar (logado: avatar + painéis disponíveis).

### [12a]–[12d] Estados públicos
- **[12a] Busca sem resultado:** sugestões (limpar filtros, buscar só a marca) + **Avisar quando chegar** (§5.11).
- **[12b] Sem conexão / erro:** mensagem + **Tentar de novo**; erro de ação aparece em barra inferior sem sair da tela.
- **[12c] Carregando:** skeleton no formato do conteúdo.
- **[12d] Veículo indisponível:** "Este veículo já foi vendido" + parecidos.

### [12e] Comprovante recusado (lojista)
- Motivo, valor faltante, novo upload e reenvio.

### [12f] Loja suspensa (lojista) e [12g] (público)
- **Lojista:** alerta com dias de atraso e valor, botão **Pagar agora** → [6c]; edição continua permitida.
- **Público:** "Catálogo temporariamente indisponível", sem expor o motivo.

### [12h] Cancelar assinatura
- Consequências: no ar até o fim do período pago, depois oculto; dados guardados 90 dias; crédito Caju Indica expira. Motivo opcional, confirmação e **Desfazer** até o fim do período.

### [12i] Termos e privacidade
- Abas Termos / Privacidade cobrindo: o que é a CajuGo; assinatura e atraso; responsabilidade pelos anúncios; Rede Caju (comissão e taxa); Caju Indica; dados coletados, uso e compartilhamento; direitos LGPD; contato do encarregado (`privacidade@cajugo.com.br`). Texto é rascunho para revisão jurídica.

### [13a] Vendedores disponíveis (lojista)
- Só vendedores aprovados pela CajuGo; filtros (perto, mais vendas, melhor avaliados); **Ver perfil**; **Convidar**.

### [13b] Perfil do vendedor
- Verificado, estatísticas, vendas para a loja com status da comissão, avaliações; **Avaliar**, **Encerrar parceria**, **Denunciar** [13d].

### [13c] Conta do vendedor
- Chave Pix, avisos (toggles "em breve" no MVP), links (dados, lojas, Caju Indica, termos), sair.

### [13d] Denunciar vendedor
- Motivos (cobrou por fora, informação falsa, comportamento inadequado, uso indevido do nome da loja, outro) + descrição → fila do admin [7h].

### [14a] Favoritos
- Lista dos favoritos com selos "Baixou R$ X" e "Vendido"; estado vazio.

### [14b] Simulador de parcelas
- Entrada 0/20/30/50%, prazo 24/36/48/60x, taxa de `Config`; parcela, entrada, financiado, total, aviso de estimativa; CTA enviar simulação à loja pelo WhatsApp.

### [14c] Aprovação prévia (admin)
- Fila com checagens automáticas (fotos ≥ mínimo, preço vs. FIPE, placa/chassi). **Aprovar** · **Pedir ajuste** (motivo; loja avisada).

### [14d] Denunciar anúncio
- Motivos: já vendido, preço não real, fotos de outro carro, suspeita de golpe; descrição opcional; anônima para a loja; honeypot + rate limit.

### [14e] Denúncias (admin)
- Agrupadas por anúncio; **Manter** (arquiva) · **Ocultar** (status oculto; loja recebe o motivo).

### [15a]–[15c] Desktop (1280)
- **[15a] Vitrine:** header com busca e menu, filtros laterais, grid de 3 colunas, card Caju Indica.
- **[15b] Painel do lojista:** sidebar com as seções do lojista; listas em tabela/cards largos.
- **[15c] Admin:** sidebar (Visão geral, Lojas, Assinaturas, Pagamentos Pix, Veículos, Rede Caju, Caju Indica, Conta) com contadores de pendências; KPIs; filas de comprovantes e de aprovação com ações inline.


## 8. Modelo de dados

Ver `ARCHITECTURE.md` §4 (tabelas do Postgres, em inglês).

---

## 9. Integrações

| Integração | Uso | MVP |
|---|---|---|
| WhatsApp (`wa.me` deep link) | Contato comprador → loja; avisos enviados por uma pessoa (admin/lojista) com mensagem pronta | Sim |
| Pix (chave + QR estático gerado no sistema) | Pagamento da assinatura e das taxas; conferência manual | Sim |
| Supabase Auth (e-mail e senha) | Login de todos os papéis | Sim |
| Cloudinary | Fotos, logo, capa e comprovantes (privados) | Sim |
| Tabela FIPE | Marca/modelo/versão, referência de preço, alerta de preço na aprovação | Recomendado |
| Gateway de pagamento (Stripe ou outro) | Cartão, Pix automático, webhooks, recibos | Fase 2 |
| WhatsApp Business API / SMS | Login por código, avisos automáticos | Fase 2 |
| E-mail transacional | Avisos e recuperação de senha automática | Fase 2 (ou antes, se escolhido) |
| Emissão de NFS-e | Nota da mensalidade | Manual, fora do sistema |
| Consulta de placa; analytics | — | Fase 2 |

---

## 10. API

Ver `API.md` §5 (mapa de rotas).

---

## 11. Notificações

**No MVP nada é enviado automaticamente.** Cada evento aparece como **aviso no painel** de quem recebe e, quando é preciso avisar fora do sistema, como um **botão `wa.me`** com a mensagem pronta para o admin ou o lojista enviar. Envio automático por WhatsApp/SMS/e-mail é fase 2.

| Evento | Para | No MVP |
|---|---|---|
| Novo lead (com vendedor, se houver) | Lojista | Aviso no painel [3a] |
| Vencimento em 3 dias; atraso; suspensão; reativação | Lojista | Aviso no painel; admin avisa por `wa.me` (lista em [4a]/[4b]) |
| Comprovante confirmado / recusado (com motivo) | Lojista | Aviso no painel; `wa.me` na confirmação [10b] |
| Pedido de parceria; parceria aprovada/recusada; convite | Lojista / Vendedor | Aviso no painel |
| Venda confirmada com comissão | Vendedor | Aviso no painel [7b] |
| Cadastro aprovado/bloqueado | Vendedor | Aviso no painel; `wa.me` em [7h] |
| Indicação ativou; crédito/saldo recebido; Pix de resgate pago | Indicador / Lojista | Aviso no painel; `wa.me` em [8g] |
| Veículo precisa de ajuste / foi ocultado (motivo) | Lojista | Aviso no painel |
| Denúncia analisada | Lojista que denunciou vendedor | Aviso no painel |
| "Avisar quando chegar" | Comprador | Admin avisa por `wa.me` (§5.11) |
| Queda de preço de favorito | Comprador | Fase 2 (no MVP só o selo "Baixou R$ X") |
| Código de login | Todos | Fase 2 |

---

## 12. Requisitos não funcionais

- **Mobile first**: 390 px; desktop ≥ 1024 px com vitrine em grid de 3 e painéis com sidebar [15a–15c].
- **Sincronização de estoque** em segundos (cache visível ≤ 60 s).
- **Estados obrigatórios em toda lista:** carregando (skeleton), vazio, erro com "Tentar de novo"; erro de ação em barra inferior sem sair da tela.
- **Rascunhos de formulário** salvos localmente.
- **Performance**: LCP < 2,5 s em 4G; imagens responsivas; listagem com SSR/ISR para SEO.
- **SEO (principal ativo)**: ver `SEO.md` — renderização no servidor, títulos e descrições únicos, URL amigável e canônica, JSON-LD (`Car`/`Offer`, `AutoDealer`, `BreadcrumbList`), Open Graph para WhatsApp, sitemap, Core Web Vitals, Search Console.
- **Segurança**: ver `SECURITY.md` (Supabase Auth, cookie httpOnly, papel por loja, rate limit, comprovantes privados).
- **LGPD**: consentimento; acesso, correção e exclusão; exclusão de dados de lojas canceladas após 90 dias; CPF e chave Pix só quando necessários; encarregado `privacidade@cajugo.com.br`; termos [12i].
- **Auditoria**: `LogAtividade` para ações de admin e mudanças de status (loja, pagamento, veículo, vendedor, indicação, resgate).
- **Acessibilidade**: alvos ≥ 44 px; contraste ≥ 4,5:1; labels em todos os campos.
- **Internacionalização**: pt-BR; BRL; datas dd/mm/aaaa.

### 12.1 Pendências de decisão
1. Valores provisórios de `Config` (§5.14): chave Pix e favorecido, prazo de conferência, tolerância, resgate mínimo, taxa CajuGo, taxa do simulador.
2. Fonte de dados FIPE (API gratuita ou lista manual).
3. Usuários da loja: o lojista convida pelo [3c] (convite com senha temporária, sem e-mail no MVP)?
4. Documentos exigidos do vendedor na curadoria (CPF, antecedentes: quais e como enviar).
5. Revisão jurídica dos termos [12i] (Rede Caju, Caju Indica, LGPD).
6. Gateway de pagamento na fase 2: Stripe ou outro.
7. **Antecipar o domínio próprio** (`cajugo.com.br`)? A autoridade de busca acumulada em `cajugo.vercel.app` não é nossa (`docs/SEO.md` §3). O formato do endereço das lojas já está decidido: `/loja/{slug}` (ADR 0009).
