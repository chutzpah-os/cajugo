---
name: plan
description: Gera o plan.md (e contract.md, se houver Route Handler) de uma spec clarified, com a checagem de conformidade.
argument-hint: <NNN-slug>
disable-model-invocation: true
---

Spec: `docs/specs/$ARGUMENTS/spec.md`. O status deve ser `clarified`; se não for, pare e sugira `/clarify`.

1. Leia a spec, `docs/ARCHITECTURE.md` (stack, pastas §3, modelo §4), `docs/API.md`, `docs/SECURITY.md`, `docs/TESTING.md` e os ADRs de `docs/adr/` que tocam a área.
2. Antes de escrever código de Next.js, consulte o guia em `node_modules/next/dist/docs/` (ver `AGENTS.md`).
3. Gere `docs/specs/$ARGUMENTS/plan.md` com o template do `docs/SDD.md` §6.1:
   - impacto por camada (banco/migration, `src/domains/*`, `src/app/*`, `src/ui/*`, jobs);
   - mapa **requisito → solução** com **todos** os requisitos da spec;
   - trecho previsto do schema Drizzle e da migration;
   - estratégia de testes (unitário, integração com PGlite, e2e) por requisito;
   - riscos e alternativas descartadas.
   Use `mattpocock-skills:codebase-design` para desenhar a interface de cada `src/domains/<domínio>/service.ts` (módulo profundo: poucas funções públicas, regra escondida).
   Use `mattpocock-skills:domain-modeling`: termo novo vai para o `GLOSSARY.md`; decisão difícil de reverter vira ADR em `docs/adr/`.
4. Se a feature cria Route Handler em `/api/v1`, gere também `contract.md` (§6.2).
5. Preencha a checagem de conformidade (§6.3) e aponte com clareza qualquer item que não passe.
6. Dependência nova, migration destrutiva ou desvio de ARCHITECTURE/SECURITY: liste como decisão pendente e pergunte.
7. Não escreva código de produção. Termine sugerindo revisão do plano e depois `/tasks $ARGUMENTS`.
