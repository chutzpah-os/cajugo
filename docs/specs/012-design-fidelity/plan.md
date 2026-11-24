---
spec: 012
status: approved
---

# Plano · 012 Fidelidade ao design nas telas já entregues

## Resumo técnico
A 012 é só apresentação: nenhuma regra de serviço, schema, permissão, action ou rota muda (DSG-FR-016: o conteúdo continua o das specs). O trabalho acontece em três camadas:

1. **Base visual em `src/ui/`** (DSG-FR-013): componentes novos e acertos nos que já existem, todos seguindo o `DESIGN.md` §3. Depois deles, as telas param de montar a aparência à mão.
2. **Moldura das áreas** (`AreaShell`/`PanelNav`; DSG-FR-001..003, 017):
   - **celular:** cada página monta o seu cabeçalho (escuro, com KPIs, ou claro, com "ADMIN"), e a moldura só cuida da navegação inferior e dos avisos;
   - **desktop:** a sidebar escura, com o card da identidade (a loja, o vendedor ou o "ADMIN").
3. **Telas, por grupo** (DSG-FR-004..012, 014..016): cada tela é refeita sobre a base, com a captura aberta ao lado.

**Como a fidelidade é conferida** (DSG-NFR-001): um script do Playwright tira as capturas das telas entregues em 390 e 1280 px, com o seed dos e2e. Elas são comparadas uma a uma com `docs/design/telas/`, e o resultado vai para `comparacao.md` (tela, captura, ok ou diferença justificada). As imagens não entram no git: o repositório é público e ficaria pesado. O script recria as imagens quando for preciso.

## Impacto
| Camada | Mudança |
|---|---|
| Banco / migration | Nenhuma |
| `src/ui/` | Novos:<br>• `icons.tsx` (SVG em linha, traço 2, estilo Lucide; sem dependência nova)<br>• `page-header.tsx` (`DarkHeader`, `LightHeader`)<br>• `kpi.tsx`<br>• `initials.tsx` (sigla em quadrado `ink`)<br>• `key-value.tsx`<br>• `settings-list.tsx`<br>• `data-table.tsx` (tabela do desktop que vira lista no celular)<br>• `store-card.tsx` (card de loja/assinatura com rodapé)<br><br>Acertos:<br>• `Badge` (largura do texto, `self-start`)<br>• `ConfirmSheet` (alça, ícone de 48 px na cor do tipo, ordem dos botões do [6f])<br>• `Button` (variante pequena de 40 px com ícone)<br>• `Toggle` (44 × 26)<br>• `EmptyState`<br>• `PanelNav` (sidebar escura, contadores, gaveta do "Mais") |
| `src/domains/auth/components/` | `AreaShell`:<br>• tira o cabeçalho global claro (logo + "Sair") e deixa o cabeçalho para a página;<br>• slot novo `identity` (desktop: card da loja/vendedor; celular: avatar no cabeçalho), montado pela rota, como `banner` e `navCounts`;<br>• "Sair" e "Trocar de painel" vão para a Conta e para o menu do avatar |
| `src/domains/*/components/` | Telas refeitas sobre a base (1c, 15b, 3a–3c, 4b, 4c, 10b, 7a–7h, 8a–8e, 9a, 9b, 9d, 9f, 14c, 14e, 12a–12h, 1a, 1b, 6c, 6d, 10a, 10c, 11a, 14a, 14b, 14d, 15a, 5b–5d, 2a, 6e, 6f). Os serviços que já devolvem o dado ficam iguais; quando uma captura pede um número que a tela ainda não tem (ex.: "Próxima fatura" no [15b], "Contatos no mês"), ele vem de uma função de leitura que já existe (`billing.accountView`, `leads`), sem regra nova |
| `src/app/*/layout.tsx` | Passam o `identity` (painel: nome, sigla e status da assinatura da loja; rede: nome do vendedor; indica: nome; admin: "ADMIN") |
| Seed dos e2e | Fotos de carro (DSG-NFR-004): as 7 imagens de `docs/design/carexamplesimages` sobem uma vez para o Cloudinary do staging, em `e2e/cars/car-1…7`, com o script `pnpm e2e:photos` (upload assinado pela API, com `fetch`; idempotente). O seed usa esses ids em vez de `sample` |
| Scripts | `pnpm design:shots`: capturas das telas em 390 e 1280 px para `test-results/design/` (no `.gitignore`), com a lista de telas × capturas do design em `tests/design/screens.ts` |
| Documentos | `DESIGN.md` §8 (padrões do desktop sem captura, DSG-FR-017); `TESTING.md` (rotina de comparação visual); `docs/specs/012-design-fidelity/comparacao.md` |

## Base: contratos dos componentes novos
```ts
// src/ui/page-header.tsx
DarkHeader({ eyebrow, title, avatar?: { initials, label }, children? /* KPIs, card da assinatura */ })
LightHeader({ badge?: "ADMIN", avatar?, tabs?: { href, label, current }[], back?: { href, label } })
// src/ui/kpi.tsx
Kpi({ value, label, hint?, hintTone?: "ok" | "warn" | "caju", tone?: "dark" | "light" })
// src/ui/initials.tsx
Initials({ name, size?: 36 | 44 | 48 })          // sigla de 2 letras, quadrado ink, raio 11
// src/ui/store-card.tsx
StoreCard({ name, subtitle, badge, footer, action })   // [1d], [4b], [7f]
// src/ui/key-value.tsx
KeyValue({ rows: [label, value][] })              // [6g], [3c], [10c]
// src/ui/data-table.tsx
DataTable({ columns, rows, mobile: (row) => ReactNode })  // ≥ 1024 px tabela; < 1024 cards
// src/ui/panel-nav.tsx (mudança)
PanelNav({ items, identity })                     // sidebar ink; identity no topo
```
Os componentes não buscam dado: recebem pronto da página (ARCHITECTURE §3, `src/ui` sem domínio).

## Mapa requisito → solução
| Requisito | Solução |
|---|---|
| DSG-FR-001 | `DarkHeader` no topo das páginas do lojista e do vendedor (nome da loja/pessoa, título, avatar com a sigla pelo `identity`). `PanelNav` com a barra inferior fixa, `main` com espaço para ela (altura + área segura) e o botão flutuante 16 px acima dela |
| DSG-FR-002 | `LightHeader` com o logo, o selo "ADMIN" e o avatar nas páginas do admin; [4b] usa o `DarkHeader` com o MRR e os contadores |
| DSG-FR-003 | Sidebar `ink` no `PanelNav` (≥ 1024 px): logo, card do `identity`, itens com `Count`, item ativo em `ink-2`. Cabeçalho do conteúdo: eyebrow (data ou loja), título e ação à direita |
| DSG-FR-004 | [1c] refeito: `DarkHeader` com 3 `Kpi` e o card da assinatura (selo); busca com ícone; chips; card de gestão novo (selo à direita, divisória, toggle e legenda, Vendido, editar com ícone); botão flutuante |
| DSG-FR-005 | [15b]: `DataTable` com as colunas da captura e os 4 KPIs (Publicados, Contatos no mês, Vendidos no mês, Próxima fatura); "Novo veículo" no alto, à direita |
| DSG-FR-006 | [3a], [3b] e [3c] refeitos pelas capturas do Turno 03; [3c] com o card escuro da assinatura, Faturas, links, Sair e "Cancelar assinatura" discreto por último (o bloco do cancelamento da 011b entra no lugar da captura) |
| DSG-FR-007 | [4b]: `DarkHeader` com o MRR e os contadores; card do plano com "Editar plano" em texto; chips; `StoreCard` com a sigla, "dono · desde mês/ano", o selo e o rodapé com a ação |
| DSG-FR-008 | [4c], [10b], [7h], [14c], [14e], [12a] e [8f] refeitos pelas capturas; filas no padrão do card da captura |
| DSG-FR-009 | Páginas públicas: [1a], [1b], [6d], [11a], [12a–12d], [12g], [14a], [14b], [14d], [15a], a página da loja, [5b] e [5c]. Os mesmos Server Components, só a marcação muda; checagem de SEO (`SEO.md` §6) a cada tela |
| DSG-FR-010 | [5d] (MVP), [6c], [10a], [10c], [12e], [12f] e [12h] |
| DSG-FR-011 | [2a] e [6e] pelas capturas do Turno 02/06; `ConfirmSheet` novo com a variante do [6f] (vendido verde, cancelar laranja, suspender amarelo, ocultar neutro) |
| DSG-FR-012 | Rede Caju e Caju Indica: [7a–7h], [8a–8e], [9a], [9b], [9d], [9f] |
| DSG-FR-013 | Base em `src/ui` (acima), com testes de componente para medidas e classes |
| DSG-FR-014 | Os textos do `DESIGN.md` §6/§8 em constantes perto do componente; teste do texto exato nas telas onde se aplicam |
| DSG-FR-015 | Telas sem captura (Nova senha, página da loja com capa, extrato [7d] se diferente, Crédito [8e]) seguem a tela desenhada mais parecida; a escolha fica em `comparacao.md` |
| DSG-FR-016 | Na comparação, a diferença por conteúdo de spec é anotada como "conteúdo da spec NNN"; a aparência segue a captura |
| DSG-FR-017 | Leads, Minha loja, Conta, telas do vendedor e do indicador e filas do admin em 1280 px: sidebar escura, KPIs em cards brancos, `DataTable` nas listas longas e formulários em 2 colunas |
| DSG-NFR-001 | `pnpm design:shots` + `comparacao.md` (uma linha por tela, 390/1280, ok ou diferença justificada) |
| DSG-NFR-002 | `audit()` dos e2e em todas as telas mexidas, em 390 e 1280 px; contraste dos pares de cor do §2.1 (já atendem) |
| DSG-NFR-003 | Páginas públicas continuam Server Components; sem imagem nova acima da dobra, além do que a captura pede; build de produção e LCP conferidos no fechamento |
| DSG-NFR-004 | `pnpm e2e:photos` + o seed com `e2e/cars/car-N` |
| DSG-SEC-001 | Nenhum dado novo nas telas: as páginas usam os mesmos serviços (saída montada à mão); os testes de isolamento e de mascaramento que já existem continuam passando, e entram testes de componente para CPF/CNPJ mascarado e chave Pix escondida nos cards novos |

## Modelo de dados
Sem mudança.

## Estratégia de testes
| Requisito | Unitário (componente) | Integração | e2e |
|---|---|---|---|
| DSG-FR-013 | `Badge` (largura do texto), `Kpi`, `Initials`, `KeyValue`, `DataTable` (tabela × cards), `ConfirmSheet` (alça, ícone, ordem), `PanelNav` (sidebar escura, identidade, contador) | — | — |
| DSG-FR-001..003 | `AreaShell`/`PanelNav` com `identity` | — | barra inferior sem cobrir o último item; sidebar escura com a identidade em 1280 px |
| DSG-FR-004..012, 017 | cada tela: estrutura e ordem (títulos, seções, ações) com `renderToStaticMarkup` | — | os e2e existentes, atualizados para a estrutura nova; `audit()` em 390 e 1280 |
| DSG-FR-014..016 | textos exatos | — | — |
| DSG-NFR-001 | — | — | `pnpm design:shots` + `comparacao.md` |
| DSG-SEC-001 | mascaramento nos cards novos | testes de isolamento existentes | — |

Os e2e que dependem de texto ou de ordem são ajustados na mesma task da tela, nunca depois.

## Ordem de entrega (do `/clarify`)
1. **Base:** componentes, moldura, fotos do seed e o script das capturas.
2. **Painel do lojista:** 1c/15b, 3a–3c, fatura e Pix, 2a/6e/6f.
3. **Admin já entregue:** 4b, 4c e as filas. A 012b começa depois daqui.
4. **Rede Caju e Caju Indica.**
5. **Públicas:** vitrine, veículo, loja, landing e cadastro, com o SEO.

São cerca de 25 tasks. Se o `/tasks` passar de 25, a sugestão é dividir: **012** (fases 1–3) e **012c** (fases 4–5). A 012b pode começar depois da fase 3.

## Riscos e alternativas descartadas
- **Risco: e2e quebrados por texto e estrutura.** Cada task de tela atualiza os testes da tela dela; o `pnpm check` e o spec e2e da tela rodam antes do commit.
- **Risco: regressão de SEO nas públicas.** A fase 5 fica por último e roda o checklist do `SEO.md` §6 em cada página; o HTML do servidor continua com título, canônica e JSON-LD.
- **Risco: o desktop sem captura ficar "inventado".** Segue o DSG-FR-017 e fica registrado em `comparacao.md`; o `DESIGN.md` §8 ganha o padrão.
- **Descartado: teste de regressão visual por pixel** (ex.: `toHaveScreenshot`). As capturas do design são desenhos, não telas renderizadas; a comparação por pixel daria falso negativo sempre. A conferência é estrutural (testes) e visual (lado a lado, registrada).
- **Descartado: biblioteca de ícones** (lucide-react). Seria dependência nova; uns 20 ícones em SVG em linha resolvem.
- **Descartado: guardar as capturas da tela entregue no git.** O repositório é público e ficaria pesado; o script as recria.

## Decisões (aprovadas em 2026-11-24)
- **D1.** O cabeçalho sai da moldura e vai para a página (escuro ou claro, conforme a captura). "Sair" e "Trocar de painel" ficam na Conta e no menu do avatar, como no design.
- **D2.** Slot `identity` montado pela rota para a sidebar e o avatar, como já é com `banner` e `navCounts`.
- **D3.** Ícones em SVG próprio, sem dependência nova.
- **D4.** Fotos de carro no seed por um script de upload único ao Cloudinary do staging (`pnpm e2e:photos`, com as variáveis que já existem no `.env.local`).
- **D5.** A comparação visual é registrada em `comparacao.md`, e as imagens ficam fora do git.

## Conformidade
- [x] Todos os requisitos estão no mapa (17 FR, 4 NFR, 1 SEC)
- [x] Nenhuma action, rota, schema ou permissão muda (API.md e SECURITY.md sem desvio)
- [x] Sem migration; sem dependência nova
- [x] SEO das páginas públicas preservado (DSG-NFR-003, checklist do `SEO.md` §6 na fase 5)
- [x] D1–D5 aprovadas em 2026-11-24 ("faça todo o design… eu te autorizo")
