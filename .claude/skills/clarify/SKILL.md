---
name: clarify
description: Resolve os [PENDENTE] de uma spec com até 5 perguntas e, sem pendências, marca a spec como clarified.
argument-hint: <NNN-slug>
disable-model-invocation: true
---

Spec: `docs/specs/$ARGUMENTS/spec.md` (processo em `docs/SDD.md` §5).

1. Leia a spec e o `docs/PRD.md` das telas citadas.
2. Use o método da skill `mattpocock-skills:grilling` (árvore de decisões, perguntas em rodadas), com o limite do projeto: **no máximo 5 perguntas** por rodada, priorizando o que muda escopo, dados ou segurança. Para cada uma, dê a opção recomendada primeiro e o motivo em uma linha.
3. Espere as respostas. Não altere a spec antes disso.
4. Incorpore cada resposta como requisito novo (próximo ID), critério de aceite novo ou item de "Fora de escopo", e remova o `[PENDENTE]` correspondente.
5. Se a resposta mudar o PRD, aponte a seção do PRD a ajustar e pergunte se pode alterá-la.
6. Sem pendências restantes: `status: clarified` e sugira `/plan $ARGUMENTS`. Ainda há pendências: liste-as e proponha nova rodada.
