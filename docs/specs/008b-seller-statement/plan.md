---
spec: 008b
status: approved
---

# Plano · 008b Rede Caju · extrato do vendedor

## Resumo técnico
Tudo no domínio `sellers`, que já guarda as vendas (`sales`, 009). Duas funções de leitura e uma de escrita:
- `sellerStatement`: o Extrato [7d], com os filtros e a paginação.
- `sellerHome`: ganha os totais do painel [7b].
- `setCommissionReceived`: marca o **Recebi** e o **Desfazer**.

A venda guarda **quando o vendedor marcou** o Recebi, em `sales.commission_received_at`. Isso permite desfazer por 24 horas. A comissão que a loja marcou como paga na Confirmar venda ("Já paguei") fica com essa coluna vazia, então não aparece **Desfazer**.

Os avisos usam o domínio `notices`:
- `sale_confirmed` vai para o vendedor, gravado na transação do `confirmSale`;
- `commission_received` e `commission_unreceived` vão para a loja, com o `notifyStore` (dono e usuários da loja).

## Impacto
| Camada | Mudança |
|---|---|
| Dados (migration `0021`, só acrescenta) | Coluna `sales.commission_received_at`; `notice_kind` ganha `sale_confirmed`, `commission_received` e `commission_unreceived`; índice `sales(seller_id, created_at)` (já existe) |
| `src/domains/sellers/` | `sellerStatement`, `setCommissionReceived`, `sellerHome` com os totais, aviso no `confirmSale`; schemas `statementQuerySchema` e `commissionReceivedSchema` |
| `src/domains/notices/` | Os 3 tipos novos (`NoticeData` e frase) |
| `src/app/` | `/rede/extrato` [7d] de verdade (filtros na URL, **Carregar mais**); `/rede` [7b] com os KPIs e as últimas vendas |
| Jobs | Nenhum |

## Interfaces do serviço (módulo profundo)
```ts
// domains/sellers/service.ts
sellerStatement(db, session, raw: { filtro?: "todas" | "a-receber" | "pagas"; cursor?: string }, now)
  : Promise<{
      filter;
      counts: { all; toReceive; paid };
      items: {
        saleId;
        vehicle;
        store;
        date;
        finalPriceCents;
        commissionCents;
        status: "to_receive" | "paid";
        canUndoUntil: Date | null;
      }[];
      nextCursor: string | null;
    }>                                                   // EXT-FR-001, 002, 007, 008, NFR-002, SEC-001, 003
setCommissionReceived(deps, session, raw: { saleId; received: boolean }, now): Promise<void>
                                                         // EXT-FR-003, 004, 009, 010, SEC-001, 002, 004
sellerHome (painel): + toReceiveCents, salesThisMonth,
  recentSales (as 5 mais recentes, com o mesmo item)     // EXT-FR-005, 007, 008
```

**Regras escondidas no serviço:**
- **Vendas do vendedor:** são as de `sales.seller_id = vendedor da sessão` e `canceled_at` nulo. A venda desfeita some (EXT-FR-007).
- **Recebi:** passa de `to_receive` para `paid` e grava `commission_received_at = agora`. Em venda que já está `paid`, não faz nada (EXT-FR-004).
- **Desfazer:** só vale com `commission_received_at` preenchido e até 24 horas depois. Volta a `to_receive` e limpa a coluna. Fora disso responde 409 com "Para corrigir, fale com a CajuGo." (EXT-FR-009).
- **Venda de outro vendedor ou inexistente:** a busca filtra pelo vendedor da sessão, então responde 404 (EXT-SEC-001).
- **Saída montada à mão:** veículo (nome curto), nome da loja, datas e valores. Nada do lead nem do comprador (EXT-SEC-003).

## Mapa requisito → solução
| Requisito | Solução |
|---|---|
| EXT-FR-001 | `sellerStatement`: `sales` ⨝ `vehicles` (nome curto) ⨝ `stores`, do vendedor da sessão, sem desfeitas, `created_at desc`; item com valor final, comissão e status |
| EXT-FR-002 | `?filtro=todas\|a-receber\|pagas` (schema com padrão `todas`); `counts` numa consulta agrupada pelo status; links de filtro em [7d] |
| EXT-FR-003 | `setCommissionReceived({ received: true })`: update com `where seller_id = sessão and commission_status = 'to_receive' and canceled_at is null`; botão **Recebi** com confirmação ([6f]) |
| EXT-FR-004 | O mesmo update a partir do status esperado: já `paid` não muda nada e responde ok (idempotente); [7d] só mostra **Recebi** em `to_receive` |
| EXT-FR-005 | `sellerHome`: `sum(commission_cents)` das `to_receive`, `count` das vendas com `created_at` ≥ começo do mês em São Paulo, as 5 últimas; link "Ver extrato" |
| EXT-FR-006 | `confirmSale` (009): com vendedor, `notify(tx, sellerId, { kind: "sale_confirmed", vehicle, store, commissionCents })` na mesma transação |
| EXT-FR-007 | Todas as leituras filtram `canceled_at is null` |
| EXT-FR-008 | Sem vendas: `EmptyState` em [7d]; painel com R$ 0,00 e 0 |
| EXT-FR-009 | `setCommissionReceived({ received: false })`: só com `commission_received_at` dentro de 24 h; `canUndoUntil` no item mostra **Desfazer** |
| EXT-FR-010 | No mesmo `setCommissionReceived`, `notifyStore(tx, storeId, { kind: "commission_received" \| "commission_unreceived", seller, vehicle })` |
| EXT-NFR-001 | Componentes base; e2e em 390 e 1280 px com `audit()` |
| EXT-NFR-002 | Cursor `(created_at, id)` de 20 itens; **Carregar mais** (`LoadMore`, como em [1c]) |
| EXT-SEC-001 | `sellerId` sempre da sessão (`ownSeller`); venda de outro vendedor → 404 |
| EXT-SEC-002 | Permissão nova `commission.receive` (só `seller`); a busca pelo vendedor da sessão barra os outros papéis |
| EXT-SEC-003 | Saída montada à mão, sem o lead (nada de nome, celular ou e-mail) |
| EXT-SEC-004 | `logActivity`: `commission.received` e `commission.unreceived`, com `saleId`, sem dado pessoal |

## Modelo de dados
```ts
// sales (009) +
commissionReceivedAt: timestamp("commission_received_at", { withTimezone: true }),
// notice_kind + 'sale_confirmed', 'commission_received', 'commission_unreceived'
```
Migration `0021` só acrescenta: uma coluna anulável e três valores de enum.

## Estratégia de testes
| Requisito | Unitário | Integração (PGlite) | e2e (staging) |
|---|---|---|---|
| EXT-FR-001/002/007 | schema do filtro | lista, filtros, contagens, sem desfeitas | [7d] com filtros |
| EXT-FR-003/004/009 | — | Recebi, repetir, Desfazer em 24 h e depois | Recebi e Desfazer |
| EXT-FR-005/008 | — | totais do mês (São Paulo), últimas 5, sem vendas | [7b] com os KPIs |
| EXT-FR-006/010 | frases dos avisos | aviso ao vendedor no `confirmSale`; à loja no Recebi | — |
| EXT-NFR-002 | — | cursor com 25 vendas | — |
| EXT-SEC-001..004 | — | vendedor B → 404; lojista, suporte e admin → 403; sem dados do comprador; registro | — |

O seed do e2e já tem a vendedora E2EVENDE como parceira da loja da vitrine. Ele vai ganhar uma venda "A receber" e uma "Paga" dela.

## Riscos e alternativas descartadas
- **Descartado: tabela de eventos da comissão.** Só o último "Recebi" importa para o Desfazer; o histórico fica no `activity_log`.
- **Descartado: reaproveitar `commission_status` sem a data.** Não daria para separar a comissão marcada pela loja (sem desfazer) da marcada pelo vendedor, nem contar as 24 h.
- **Risco: corrida entre o Recebi e o desfazer da venda pela loja.** Os dois são updates a partir do status esperado, e o `undoSale` já recusa a comissão paga com 409.

## Decisões (aprovadas em 2026-11-23)
- **D1.** Guardar `sales.commission_received_at` para o Desfazer de 24 h. A comissão marcada pela loja como paga não tem Desfazer para o vendedor.
- **D2.** O vendedor **bloqueado** vê o Extrato (SEL-FR-002) e também pode marcar **Recebi**. **Recomendo:** é dinheiro que a loja já pagou, e o bloqueio não muda isso.
- **D3.** "Só a CajuGo corrige" depois de 24 horas fica sem tela no MVP. A correção é pelo suporte, fora do sistema, e a tela do admin entra na 012 se for preciso.
- **D4.** Permissão nova `commission.receive`, só para o papel `seller`.

## Ajustes de documento (na T001)
- **ARCHITECTURE §4:** `sales.commission_received_at`.
- **API.md §5:** `/rede/extrato` e `setCommissionReceivedAction({ saleId, received })`, no lugar de `markCommissionReceived(saleId)`.
- **GLOSSARY:** em "Status da comissão", o Desfazer de 24 h.

## Conformidade
- [x] Todo requisito da spec está no mapa requisito → solução (10 FR, 2 NFR, 4 SEC)
- [x] Actions seguem o `API.md` §2:
  - schema `.strict()`;
  - permissão em cada action;
  - `activity_log`;
  - idempotência pelo status esperado.
- [x] Posse checada: `sellerId` da sessão; venda de outro → 404
- [x] Saída montada à mão, sem dados do comprador
- [x] Consultas com índice (`sales_seller_created`)
- [x] Migration só acrescenta; nenhuma dependência nova
- [x] D1–D4 aprovadas em 2026-11-23
