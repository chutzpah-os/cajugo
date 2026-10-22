---
name: spec
description: Cria uma nova spec SDD (docs/specs/NNN-slug/spec.md) a partir da descrição de uma feature.
argument-hint: <descrição da feature>
disable-model-invocation: true
---

Crie uma nova spec a partir da descrição: $ARGUMENTS

1. Leia `docs/SDD.md` §4 (template e regras), `docs/PRD.md` (telas e regras da feature) e `GLOSSARY.md` (vocabulário).
2. Descubra o próximo número livre em `docs/specs/` e gere o slug em inglês (ex.: `001-auth`).
3. Crie `docs/specs/NNN-slug/spec.md` com o template do SDD §4, `status: draft` e a data de hoje.
4. Escreva só comportamento, com os termos do GLOSSARY e as telas do PRD entre colchetes ([6a]). Nada de tecnologia (tabela, endpoint, Drizzle, componente).
5. Requisitos com IDs `<PRE>-<FR|NFR|SEC>-NNN` (prefixo de 3 letras), uma frase testável cada; todo FR e SEC com critério Dado/Quando/Então.
6. Se a feature lida com dado de loja ou de usuário, inclua um SEC de isolamento ("loja B não vê/altera o da loja A").
7. Se a spec passar de 15 FR, proponha dividir em duas.
8. Toda dúvida vira `[PENDENTE]` na seção Pendências. Não invente respostas nem resolva pendências do PRD §12.1 sozinho.
9. Termine listando as pendências e sugerindo `/clarify NNN-slug`.
