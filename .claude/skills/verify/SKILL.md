---
name: verify
description: Verifica uma spec implementada (rastreabilidade requisito × teste, rotas, desvios) e redige o PR.
argument-hint: <NNN-slug>
disable-model-invocation: true
---

Para `docs/specs/$ARGUMENTS` (processo em `docs/SDD.md` §9):

1. Rode `pnpm check` e, se a spec tiver fluxos de tela, os testes e2e.
2. Monte a tabela de rastreabilidade (§9.1): para cada ID `XXX-(FR|NFR|SEC)-NNN` da spec, quantos testes têm o ID no nome e se passaram.
3. Se houver `contract.md`, compare com os Route Handlers implementados (§9.2).
4. Rode `mattpocock-skills:code-review` com o ponto fixo = commit anterior ao início da spec (ou o merge-base com `main`, se estiver numa branch `spec/*`) e informe que a spec está em `docs/specs/$ARGUMENTS/spec.md`, não numa issue.
5. Liste: requisitos sem teste, testes falhando, rotas fora do contrato, desvios do plano (e se foram refletidos na spec/plano).
6. **Bloqueia:** qualquer FR ou SEC sem teste ou com teste falhando. NFR sem teste é só aviso.
7. Tudo verde: mude o status da spec para `implemented`, marque a spec no `docs/PLAN.md` e redija a descrição do PR (§8.4), sem rodapé de atribuição ao Claude. Não abra o PR.
