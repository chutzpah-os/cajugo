---
spec: 016
---

# Plano · 016 LaudoCaju

## Resumo técnico
Domínio novo `laudos` (pedido público + fila do admin), com uma tabela `laudo_requests`. O Pix reaproveita `platform/pix/br-code` e a chave/favorecido das regras de Pagamento (002). O preço é uma regra nova (`laudo_price_cents`, grupo `laudo`). Página de vendas `/laudocaju`, pedido `/laudocaju/pedir`, Pix `/laudocaju/pedido/[codigo]` e fila `/admin/laudos`. O bloco e a faixa entram na página do veículo [1b].

## Impacto
| Camada | O quê |
|---|---|
| Banco | Migration `0025`: `laudo_requests (id uuid v7, code text unique, status enum awaiting_pix/paid/sent, name, whatsapp, email, plate, vehicle text, vehicle_id uuid null, price_cents, ip_hash, paid_at, paid_by, sent_at, sent_by, created_at)`, índice (status, created_at desc) |
| `src/domains/laudos` | `requestLaudo` (schema, honeypot, limite por rede, código "LC-XXXX"), `laudoPix(code)` (só o Pix e o status; sem os contatos), `laudoQueue`, `markPaid`, `markSent`, `purgeOldLaudos` (cron diário) |
| `src/domains/settings` | `laudo_price_cents` (padrão 7000) no grupo **LaudoCaju** |
| `src/app` | `/laudocaju`, `/laudocaju/pedir`, `/laudocaju/pedido/[codigo]` (noindex), `/admin/laudos`; item **LaudoCaju** no menu admin com contador |
| `src/domains/showcase/components` | `laudo-strip.tsx` (faixa) e `laudo-block.tsx` (bloco) na página do veículo |
| Docs | ARCHITECTURE §4 (tabela), API.md (rotas e actions), GLOSSARY (LaudoCaju), PRD (produto) |

## Mapa requisito → solução
| Req | Solução |
|---|---|
| LAU-FR-001/002 | `LaudoStrip` (âncora `#laudocaju`) e `LaudoBlock` com o link `/laudocaju/pedir?veiculo={id}` |
| LAU-FR-003 | `/laudocaju/pedir`: formulário com campo isca; `veiculo` preenche marca/modelo/ano pelo serviço da vitrine (só veículo público) |
| LAU-FR-004 | após o pedido, `redirect` para `/laudocaju/pedido/{code}`: `brCode` com valor e `txid` = código; QR como no [6c] |
| LAU-FR-005 | `laudoQueue` com filtros; `markPaid`/`markSent` com `authorizeTo("laudos.manage")` (só admin); leitura `admin.read` |
| LAU-FR-006 | `/laudocaju` estática (SEO: título, descrição, canônica, JSON-LD Service, sitemap) |
| LAU-FR-007 | regra `laudo_price_cents`; o pedido grava o preço da época |
| LAU-SEC-001 | `isHoneypotFilledIn` + `withinPublicFormLimits` |
| LAU-SEC-002 | `purgeOldLaudos` no cron diário apaga nome, contatos e placa após 2 anos |
| LAU-SEC-003 | permissão `laudos.manage` (admin); `logActivity` `laudo.paid`/`laudo.sent` com o id |

## Riscos e alternativas descartadas
- Código do pedido curto e público na URL do Pix: a tela do Pix mostra só valor, status e o Pix, nunca os contatos; código aleatório de 6 caracteres sem ambiguidade.
- Comprovante anexado: descartado ("eu vejo se recebi").

## Conformidade
Migration aditiva (só staging; prod com autorização). Sem dependência nova (`qrcode` já existe). Dado pessoal com finalidade, retenção e acesso só da equipe.
