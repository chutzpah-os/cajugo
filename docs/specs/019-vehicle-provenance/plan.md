---
spec: 019
status: draft
---

# Plano · 019 Procedência e situação do veículo

## Resumo técnico
Cada resposta da seção **Procedência e situação** vira uma coluna em `vehicles` (nula = "não informado"). Um módulo puro `provenance.ts` no domínio `vehicles` classifica as respostas em **livre**, **com aviso** ou **bloqueado**, monta os avisos e o selo Leilão, e é usado pela tela, por `saveDraft`/`publish` (bloqueio no servidor) e pela vitrine (filtro e página). A declaração de veracidade fica em `provenance_declared_at`/`_by` e no registro de atividade.

## Impacto
| Camada | Mudança |
|---|---|
| Dados | Migration `0028`: colunas `origin`, `damage`, `gnv`, `remarked`, `lien`, `judicial_restriction`, `theft`, `provenance_declared_at`, `provenance_declared_by`; `ALTER TYPE report_reason ADD VALUE 'provenance_omitted'`; índice `vehicles_status_origin_damage (status, origin, damage)` |
| `src/domains/vehicles` | `provenance.ts` (listas fechadas, `classify`, `notices`, `isAuction`); `saveDraft` grava as respostas só com a declaração marcada; `publish` e a edição de publicado recusam bloqueado e "não informado" |
| `src/domains/showcase` | filtro `?procedencia=` (limpo, leilao, media-monta, enchente) na lateral e na folha; selo Leilão no card; quadro de avisos e linha Procedência na ficha [1b] |
| `src/domains/moderation` | motivo **Procedência ou sinistro omitido** em Denunciar [14d] e na fila do admin |
| Web | seção no formulário [2a] com rádios, aviso na hora para bloqueado e a caixa da declaração |
| Jobs | nenhum |

## Mapa requisito → solução
| Requisito | Solução |
|---|---|
| PRO-FR-001 | 7 colunas com valores fechados (zod no domínio); seção obrigatória no formulário |
| PRO-FR-002 | `classify` → `free` para sem restrições, ex-frota/locadora, leilão de montadora, pequena monta, GNV regularizado |
| PRO-FR-003 | `classify` → `notice`; `notices(v)` devolve os textos; quadro em destaque na página [1b] |
| PRO-FR-004 | `classify` → `blocked` com o motivo; tela mostra na hora; `publish` e salvar publicado → erro no campo (servidor) |
| PRO-FR-005 | `isAuction` (leilão de montadora ou de financiadora) → selo Leilão no card e na página |
| PRO-FR-006 | filtro `procedencia` em `filters.ts`, traduzido em `where` sobre `origin`/`damage`/`gnv`/`remarked`/`lien` |
| PRO-FR-007 | colunas nulas nos antigos; publicar ou salvar publicado sem a seção → "Responda Procedência e situação"; publicados seguem no ar |
| PRO-FR-008 | `saveDraft` exige `declared: true` quando a seção muda; grava `provenance_declared_at/by` e `vehicle.provenance_declared` no `activity_log` |
| PRO-FR-009 | ficha sempre com Procedência ("Sem restrições" quando limpa) e "Informações declaradas pela loja" |
| PRO-FR-010 | `report_reason` ganha `provenance_omitted`; rótulo na tela de denúncia e na fila |
| PRO-FR-011 | chamada do LaudoCaju junto do quadro de avisos atrás de `LAUDO_ENABLED` (desligado enquanto a 016 está pausada) |
| PRO-SEC-001 | bloqueio em `publish` e em `saveDraft` de publicado, não só na tela; teste chamando o serviço direto |
| PRO-SEC-002 | `storeId` da sessão; veículo da loja A pela loja B → 404 |

## Modelo de dados
```sql
ALTER TABLE vehicles
  ADD COLUMN origin text,        -- private | fleet | auction_maker | auction_bank
  ADD COLUMN damage text,        -- none | small | medium_recovered | flood_recovered | medium_unregularized | total
  ADD COLUMN gnv text,           -- none | regularized | unregistered
  ADD COLUMN remarked boolean, ADD COLUMN lien boolean,
  ADD COLUMN judicial_restriction boolean, ADD COLUMN theft boolean,
  ADD COLUMN provenance_declared_at timestamptz,
  ADD COLUMN provenance_declared_by uuid REFERENCES profiles(id);
ALTER TYPE report_reason ADD VALUE 'provenance_omitted';
CREATE INDEX vehicles_status_origin_damage ON vehicles (status, origin, damage);
```

## Estratégia de testes
- **Unitário:** `classify` para cada resposta dos três grupos; `notices` com os textos; `isAuction`.
- **Integração (PGlite):** publicar bloqueado recusa pelo serviço; antigo sem seção não republica; sem declaração não salva e com ela registra; loja B 404; filtro limpo/leilão/enchente; denúncia com o motivo novo.
- **e2e:** marcar grande monta mostra o aviso e não publica; veículo com gravame mostra o aviso na página; selo Leilão no card.

## Riscos e alternativas descartadas
- **`jsonb` com as respostas:** descartado; o filtro da vitrine precisa de colunas com índice.
- **Republicar os antigos sem resposta:** a spec manda manter no ar até a próxima edição; a vitrine trata nulo como "não informado" e não aplica selo nem aviso.
- **Relação com a 014:** substitui TIP-FR-018; leilão, sinistro e GNV da TIP-FR-017 ficam aqui.

## Conformidade
- [x] Todo requisito no mapa
- [x] Actions seguem o API.md §2
- [x] Posse checada (veículo pela loja da sessão)
- [x] Sem campo privilegiado (declarante vem da sessão)
- [x] Sem dado pessoal novo (o declarante já é um perfil)
- [x] Sem formulário público novo (denúncia já tem isca e limite)
- [x] Índice para o filtro
- [x] Migration aditiva
- [x] Só Postgres e Auth
