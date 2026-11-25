---
spec: 015
---

# Plano · 015 Compare os preços (FIPE) e financiamento

## Resumo técnico
A FIPE já está no banco (`fipe_*` e `vehicles.fipe_price_cents`, `fipe_month`, ADR 0012); muda só a fonte em `src/platform/fipe/client.ts` (Parallelum v1 → fipe.api.br v2, mesmos códigos). A página do veículo ganha dois blocos de servidor (Compare os preços e Veja as parcelas) e, no desktop, a coluna da direita. A parcela estimada sai do código (card, página, simulador, formulário, regras).

## Impacto
| Camada | O quê |
|---|---|
| Banco | Migration `0025` remove `vehicles.show_installment` (autorizada pelo dono em 2026-11-25; staging e prod aplicados em 2026-11-25). As linhas `installment_*` de `setting_values` ficam: o histórico das regras é só de inclusão (CFG-SEC-003) |
| `src/platform/fipe/client.ts` | Base `https://fipe.api.br/api/v2/cars`, formato `{code, name}` e preço `{price, codeFipe, referenceMonth}` |
| `src/domains/showcase` | `vehiclePage` devolve `priceCompare {priceCents, averageCents \| null, fipe \| null}` (média: mesma `fipe_year_id`, `publicVisible("showcase")`, sem o próprio, ≥ 3); sai `installmentCents`/`simulator` do card e da página; saem `simulator.ts`, `components/simulator.tsx` |
| `src/platform/br/installment.ts` | Removido (só a parcela usava) |
| `src/domains/vehicles` | Sai `showInstallment` do schema, do formulário e do serviço |
| `src/domains/settings` | Saem `installment_rate_bps`, `installment_down_bps`, `installment_months` |
| `src/domains/showcase/components` | `price-compare.tsx` (bloco escuro), `financing-notice.tsx` (campos desabilitados + aviso), `vehicle-details.tsx` em 2 colunas no `lg` |
| Docs | PRD [1a]/[1b]/[2a]/[4c]/[14b]; ADR 0012 (fonte); ARCHITECTURE (FIPE definida); CLAUDE.md (FIPE definida) |

## Mapa requisito → solução
| Req | Solução |
|---|---|
| PRC-FR-001 | `priceCompare` no `vehiclePage`; `PriceCompare` com as 3 colunas e a diferença % |
| PRC-FR-002 | `createFipeClient` aponta para fipe.api.br v2; testes do client com as respostas v2 |
| PRC-FR-003 | remoção de `installmentCents`, `simulator`, toggle e regras; testes ajustados |
| PRC-FR-004 | `FinancingNotice`: `<fieldset disabled>` sem `<form action>` |
| PRC-FR-005 | link `#parcelas` ao lado do preço; `lg:grid-cols-[1fr_360px]` com `aside` `sticky` |
| PRC-SEC-001 | sem form/action; teste de componente: campos `disabled` |
| PRC-SEC-002 | média com `publicVisible("showcase")`; teste com oculto e loja suspensa |

## Riscos e alternativas descartadas
- Média com 1–2 anúncios exporia o preço de um concorrente: mínimo de 3.
- Manter a parcela estimada com aviso: descartado pelo dono ("simulação imaginária").

## Conformidade
Sem dependência nova, sem migration, sem dado pessoal novo, API gratuita escolhida pelo dono (CLAUDE.md: FIPE decidida em 2026-11-25).
