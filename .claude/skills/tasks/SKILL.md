---
name: tasks
description: Quebra o plano de uma spec em tasks.md ordenado, com testes antes da implementação.
argument-hint: <NNN-slug>
disable-model-invocation: true
---

Leia `spec.md`, `plan.md` e (se existir) `contract.md` de `docs/specs/$ARGUMENTS/` e gere `tasks.md` seguindo `docs/SDD.md` §7.

- IDs `T001`, `T002`… em fases (fundação → testes → implementação → telas → fechamento).
- **Fatias verticais** (`docs/SDD.md` §7, skill `mattpocock-skills:tdd`): cada task de comportamento é um ciclo teste falhando → código → verde para um ou poucos requisitos. Nada de fase "só testes" seguida de fase "só código". Inclua o caso "loja B" para toda ação com id (`docs/TESTING.md`).
- Toda task cita os requisitos que atende (`—` para infraestrutura).
- `[P]` só para tasks sem dependência nem arquivo em comum.
- Cada task cabe num commit (até ~300 linhas alteradas).
- Se passar de 25 tasks, proponha dividir a spec.
- Última task: rastreabilidade (`/verify`) e atualização do status da spec.

Mude o status da spec para `planned` e sugira `/implement $ARGUMENTS`.
