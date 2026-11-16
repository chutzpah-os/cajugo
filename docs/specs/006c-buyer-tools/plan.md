---
spec: 006c
status: approved
---

# Plano · 006c Ferramentas do comprador: simulador e favoritos

## Resumo técnico
Sem banco novo. O **simulador** é um componente de cliente na página do veículo que calcula pela mesma função Price do "a partir de R$ X/mês" (`platform/br/installment.ts`). Os valores das regras [4c] chegam no `vehiclePage`, que já fica em cache com a tag de regras. Os **favoritos** ficam no `localStorage` do aparelho, no domínio `buyers` (já previsto no ARCHITECTURE §3 para favoritos e alertas):
- O coração é uma ilha de cliente: o HTML do servidor sai sempre igual, com o coração desmarcado e do mesmo tamanho, então a página continua em cache e sem CLS.
- [14a] (`/favoritos`) é uma casca estática. A lista vem de uma action pública de leitura, que devolve os cards atuais dos ids guardados e trata como indisponível o que não aparece mais.

## Impacto
| Camada | Mudança |
|---|---|
| Dados | nenhuma migration; nenhuma tabela; a CajuGo não guarda quem favoritou (BUY-SEC-001) |
| `src/platform/br/installment.ts` | `simulateInstallment` (entrada, financiado, parcela, total); `estimatedInstallment` passa a usá-la |
| `src/platform/whatsapp/` | sem mudança: `whatsappLink` já é pura e roda no cliente |
| `src/domains/showcase/` | escopo `{ vehicleIds }` em `publicVisible` (publicado e loja no ar, divulgado ou não: a mesma regra da página do veículo); `favoriteCards(db, ids)`; `vehiclePage` devolve `simulator` (ou `null` sem "Exibir parcela estimada"); `PublicCard` com o coração sobre a foto; página do veículo com "Simular", "Ver parcelas" e coração |
| `src/domains/buyers/` (previsto no ARCHITECTURE §3) | `favorites.ts` (cliente: ler, gravar, assinar; até 200; chave versionada; JSON validado), `actions.ts` (`favoriteCardsAction`), `components/` (`FavoriteButton`, `FavoritesView`) |
| `src/domains/auth/components/site-header.tsx` | link ♡ para `/favoritos` (estático, não personaliza o HTML) |
| `src/app/favoritos/page.tsx` | casca pré-renderizada, `noindex`, fora do sitemap |
| `src/ui/` | reaproveita `Drawer`, `Chip`, `EmptyState`, `Button`; ícone de coração no próprio botão |
| Jobs | nenhum |

## Interfaces dos serviços (módulos profundos)
```ts
// platform/br/installment.ts — uma conta, dois usos (card e simulador, BUY-NFR-003)
simulateInstallment(i: { priceCents; downBps; months; rateBps }):
  { downCents; financedCents; installmentCents; totalCents }   // total = entrada + parcelas
estimatedInstallment(i) = simulateInstallment(i).installmentCents

// domains/showcase/service.ts
type Scope = "showcase" | { storeId } | { discovery } | { vehicleIds: string[] }
favoriteCards(db, ids: string[]): Promise<PublicCard[]>   // só os que a página pública mostra agora
vehiclePage(...) → { ..., simulator: {
  priceCents; downBps; months; rateBps;      // regras [4c] vigentes
  whatsappNumber; title; url                 // para a mensagem pronta (BUY-FR-003)
} | null }                                    // null: sem "Exibir parcela estimada" ou sem preço

// domains/buyers/favorites.ts (cliente; esconde o localStorage)
useFavorite(id): { saved: boolean; toggle(card: FavoriteSnapshot): "added" | "removed" | "full" }
useFavorites(): FavoriteEntry[]               // mais recente primeiro
type FavoriteSnapshot = { id; path; title; priceCents | null }   // o que o aparelho guarda
type FavoriteEntry = FavoriteSnapshot & { savedAt: string }

// domains/buyers/actions.ts
favoriteCardsAction({ ids: uuid[] (1..200) }) → { cards: PublicCard[] }   // leitura pública
```
O `localStorage` fica escondido em `favorites.ts`: chave `cajugo:favorites:v1`; leitura validada por schema (JSON estragado = lista vazia); evento `storage` para outras abas; `useSyncExternalStore` com instantâneo do servidor vazio.

## Mapa requisito → solução
| Requisito | Solução |
|---|---|
| BUY-FR-001 | `vehiclePage.simulator` com as regras [4c]; "Simular" abaixo do preço e "Ver parcelas" na barra fixa abrem o `Drawer`; opções 0/20/30/50% e 24/36/48/60x, mais o valor das regras quando ele não está na lista (D2); sem `simulator`, nenhum dos dois aparece |
| BUY-FR-002 | `Simulator` (cliente) recalcula com `simulateInstallment` a cada troca; mostra parcela, entrada, financiado, total e "Estimativa sem análise de crédito" |
| BUY-FR-003 | `simulationMessage(...)` (puro) + `whatsappLink(whatsappNumber, texto)`: veículo, link, entrada (% e R$), prazo e parcela |
| BUY-FR-004 | `FavoriteButton` (`aria-pressed`) em `PublicCard` (vitrine, descoberta, catálogo da loja e "Carregar mais") e na página do veículo; `useSyncExternalStore` deixa o estado igual em todas as telas e abas |
| BUY-FR-005 | ♡ no `SiteHeader` → `/favoritos`; `FavoritesView` ordena por `savedAt` decrescente e chama `favoriteCardsAction` |
| BUY-FR-006 | `FavoritesView` compara o `priceCents` guardado com o do card atual: menor → "Baixou R$ X" |
| BUY-FR-007 | id ausente na resposta → card "Vendido" com o título guardado, sem preço nem foto, que leva ao `path` do veículo, onde [12d]/[12g] já mostram veículos parecidos (D3) |
| BUY-FR-008 | lista vazia → `EmptyState` com "Ver a vitrine" |
| BUY-NFR-001 | botão do coração 44×44; `Drawer` já testado em 390/1280; e2e nos dois tamanhos |
| BUY-NFR-002 | HTML do servidor igual para todos (coração desmarcado, mesmo tamanho); medição LCP/CLS do build de produção da 006/006b continua valendo e ganha `/favoritos` |
| BUY-NFR-003 | simulador e card chamam a mesma função; teste compara as duas com as regras |
| BUY-NFR-004 | `toggle` devolve `"full"` com 200 e mostra "Você chegou a 200 favoritos"; o schema da action aceita até 200 |
| BUY-SEC-001 | nada é gravado no servidor; a action só lê; nenhum log guarda os ids |
| BUY-SEC-002 | `favoriteCards` monta o card à mão (mesmo `toCards`) e só devolve o que `publicVisible({ vehicleIds })` deixa; o indisponível só mostra o título que o próprio aparelho guardou |

## Modelo de dados
Nenhuma mudança no banco. O aparelho guarda:
```ts
// localStorage "cajugo:favorites:v1"
{ v: 1, items: [{ id: uuid, path: "/v/...", title: "Fiat Argo 2022", priceCents: 7_632_000 | null, savedAt: ISO }] }
```

## Estratégia de testes
| Requisito | Unitário | Integração (PGlite) | e2e (Playwright, staging) |
|---|---|---|---|
| BUY-FR-001 | opções com o valor das regras | `vehiclePage.simulator` nulo sem a opção | abre pelo "Simular" e pelo "Ver parcelas"; sem a opção, não aparece |
| BUY-FR-002 | `simulateInstallment` (valores conhecidos da Price, taxa 0, entrada 50%) | — | troca para 30%/36x e confere os números |
| BUY-FR-003 | `simulationMessage` | — | `href` do WhatsApp com o texto |
| BUY-FR-004 | `favorites.ts`: adicionar, remover, sem duplicar, JSON estragado | — | coração no card e na página, marcado nas duas; catálogo da loja com veículo não divulgado |
| BUY-FR-005 | ordem por `savedAt` | — | ♡ do cabeçalho → 3 favoritos na ordem |
| BUY-FR-006 | selo "Baixou" | — | favorito com preço guardado maior |
| BUY-FR-007 | — | `favoriteCards` sem vendido, rascunho e loja suspensa | veículo vendido do seed mostra "Vendido" e leva à página dele |
| BUY-FR-008 | — | — | estado vazio |
| BUY-NFR-001 | — | — | 390 e 1280 px, `audit()` |
| BUY-NFR-002 | — | — | build de produção: LCP/CLS da vitrine, do veículo e de `/favoritos` |
| BUY-NFR-003 | card = simulador com as regras | — | — |
| BUY-NFR-004 | 201º favorito recusado | schema da action com 201 ids | — |
| BUY-SEC-001 | — | action não grava nada (nenhuma tabela muda) | painel do lojista sem dado de favorito |
| BUY-SEC-002 | — | não divulgado aparece (é público), vendido e rascunho não; card sem placa/chassi | HTML de `/favoritos` e resposta da action sem placa |

## Riscos e alternativas descartadas
- **Coração dentro do link do card:** um botão dentro de `<a>` é HTML inválido. O coração fica sobre a foto, como irmão do link.
- **Hidratação:** o coração nasce desmarcado e marca depois de hidratar, um piscar mínimo de estado sem mudar o tamanho. Descartado: ler o `localStorage` antes de pintar, porque personalizaria o HTML e tiraria a página do cache.
- **Regras fora das opções:** o admin pode pôr entrada de 25% ou 72x em [4c]. O valor das regras entra nas opções, para o simulador sempre começar igual ao card (D2).
- **Descartado: favoritos no servidor sem conta** (id anônimo por cookie). Guardaria dado de comportamento sem necessidade e exigiria tabela, LGPD e limpeza. Fica para a fase 2, com conta.
- **Descartado: Route Handler GET para os cards.** Exigiria contrato em `/api/v1`. A leitura por action já é o padrão do "Carregar mais".

## Decisões (aprovadas em 2026-11-16, nas opções recomendadas)
- **D1. Lista de [14a] por action pública de leitura** (`favoriteCardsAction`, até 200 ids validados), como o "Carregar mais", sem cache por pessoa. Recomendo: sem rota nova nem contrato; o custo é uma consulta por visita a [14a].
- **D2. Opções do simulador:** 0/20/30/50% e 24/36/48/60x, mais o valor das regras quando ele está fora da lista. Recomendo: o simulador começa sempre igual ao "a partir de" do card. Alternativa: só a lista fixa, arredondando as regras para a opção mais perto.
- **D3. "Vendido" leva à página do próprio veículo**, que já mostra [12d] com parecidos (ou [12g] para loja fora do ar). Recomendo: reaproveita a tela pronta, sem guardar marca e modelo no aparelho. Alternativa: levar à página de descoberta do modelo (006b).

## Ajustes de documento (a fazer na T001, com as decisões)
- **GLOSSARY:** "Simulador de parcelas" (simulação no aparelho, mesma conta da Parcela estimada); "Favorito" passa a dizer "no aparelho".
- **API.md §5 (mapa):** `favoriteCardsAction` (A, público, leitura).
- **ARCHITECTURE §3:** `buyers/` com os favoritos no aparelho e a leitura via `showcase`.

## Conformidade
- [x] Todo requisito da spec aparece no mapa requisito → solução (8 FR, 4 NFR, 2 SEC)
- [x] Actions seguem o `API.md` §2: só leitura pública; entrada por schema (uuid, 1 a 200, campo desconhecido rejeitado); saída montada à mão (`toCards`)
- [x] Toda action/rota com id checa a posse: não há dado privado; os ids passam por `publicVisible({ vehicleIds })`, que devolve só o que já é público
- [x] Schemas de entrada não aceitam campos privilegiados
- [x] Dados pessoais novos: nenhum no servidor; favoritos só no aparelho
- [x] Formulário público com honeypot + rate limit: não há formulário (o envio ao WhatsApp é um link)
- [x] Consultas novas têm índice: `favoriteCards` busca por chave primária
- [x] Migrations: nenhuma
- [x] Nada do Supabase além de Postgres e Auth; nenhuma dependência nova
- [x] SEO: páginas públicas seguem em cache e com o mesmo HTML; `/favoritos` com `noindex` e fora do sitemap (`SEO.md` §6)
