---
name: implement
description: Implementa a próxima task de uma spec (uma por vez), roda pnpm check e sugere o commit.
argument-hint: <NNN-slug>
disable-model-invocation: true
---

Implemente `docs/specs/$ARGUMENTS` seguindo `docs/SDD.md` §8.

1. Leia `spec.md`, `plan.md`, `tasks.md` (e `contract.md`, se houver), `docs/API.md`, `docs/SECURITY.md` e `docs/TESTING.md`. Para código de Next.js, consulte `node_modules/next/dist/docs/` antes.
2. Pegue a **próxima task não marcada**, na ordem. Implemente **só ela**. Na primeira task, mude o status da spec para `in-progress`.
3. Siga `mattpocock-skills:tdd`: escreva o teste do requisito, veja **falhar**, implemente o mínimo, veja **passar**, refatore. Nomes com o ID do requisito (`it('[XXX-FR-001] ...')`), estrutura AAA (`docs/TESTING.md`). Bug encontrado no caminho: use `mattpocock-skills:diagnosing-bugs`.
4. Rode `pnpm check`. Se falhar, corrija; depois de 3 tentativas sem sucesso, pare e relate o bloqueio.
5. Verde: marque `[x]` no `tasks.md`, liste os arquivos alterados e **sugira** a mensagem `<tipo>(<escopo>): <descrição> [<spec>/<task>]`, sem Co-Authored-By nem menção ao Claude.
6. **Pare.** Só faça `git commit`/`git push` se eu pedir. Nunca use `--no-verify`, merge, rebase ou `gh pr create`.
7. Pare e pergunte (sem improvisar) nas situações do SDD §8.2: algo fora da spec/plano, spec e plano em conflito, violação de API/SECURITY, dependência nova, migration destrutiva. Não altere `spec.md` sem minha aprovação.
8. Ao commitar, registre em `docs/changes/` o que mudou e em `docs/decisions/` o motivo (até 5 linhas cada).
