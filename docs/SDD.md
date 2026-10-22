# Spec-Driven Development (SDD)

> Como as funcionalidades são especificadas, planejadas, implementadas e verificadas neste projeto.
> Complementa o `API.md` (servidor), o `SECURITY.md` (segurança) e o `ARCHITECTURE.md` (stack). Exemplos de caminho e ferramenta são ilustrativos.
>
> **Este arquivo é lido pelo Claude Code.** As seções marcadas com 🤖 são regras obrigatórias para o agente.

---

## 1. O que é e por que usamos

**Spec-Driven Development** é escrever primeiro *o que* o sistema deve fazer e *como* vamos saber que ficou certo, e só depois o código. A especificação é o artefato principal; o código é a implementação dela.

Num projeto feito com o Claude Code, isso resolve três problemas:

| Sem SDD | Com SDD |
|---|---|
| O agente "adivinha" a intenção a partir de um prompt curto | O agente implementa a partir de requisitos numerados e critérios de aceite |
| O prompt se perde quando a conversa acaba | A spec fica versionada no repositório, junto do código |
| Não dá para saber se a feature está completa | Cada requisito aponta para pelo menos um teste |

O `API.md` governa *como* o servidor é feito; o SDD governa *o que* cada feature deve fazer.

---

## 2. Documentos e artefatos

**Documentos do projeto:** `PRD.md` (produto), `design/DESIGN.md` (UI), `ARCHITECTURE.md`, `API.md`, `SECURITY.md` e este `SDD.md` (processo). Os princípios ficam no §11.

**Artefatos de cada feature:**
- `spec.md`: o quê e por quê (produto);
- `plan.md`: como (técnico);
- `tasks.md`: passos de execução;
- `contract.md`: rotas e actions previstas (opcional; só se a feature cria Route Handler);
- `decisions.md`: decisões tomadas durante a feature (opcional).

Cada feature fica em `docs/specs/NNN-slug/`.

**Ordem de precedência em caso de conflito:**
Princípios (§11) > `SECURITY.md` > `API.md` > `spec.md` > `plan.md` > `tasks.md` > código.

Se a spec pede algo que viola o `SECURITY.md`, quem muda é a spec, não a regra.

---

## 3. O ciclo

```
   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌─────────────┐    ┌──────────┐
   │ 1.SPECIFY│───▶│ 2.CLARIFY│───▶│  3.PLAN  │───▶│  4.TASKS    │───▶│5.IMPLEMENT│
   └──────────┘    └──────────┘    └──────────┘    └─────────────┘    └──────────┘
        ▲                                                                   │
        │                                                                   ▼
   ┌──────────┐                                                       ┌──────────┐
   │ 7.EVOLVE │◀──────────────────────────────────────────────────────│ 6.VERIFY │
   └──────────┘                                                       └──────────┘
```

| Etapa | Pergunta | Artefato | Quem decide | Gate para avançar |
|---|---|---|---|---|
| **1. Specify** | O quê? Para quem? Por quê? | `spec.md` | Produto (você) | Requisitos numerados + critérios de aceite |
| **2. Clarify** | O que está ambíguo? | `spec.md` atualizada | Produto | Nenhum `[PENDENTE]` aberto |
| **3. Plan** | Como implementar? | `plan.md` (+ `contract.md`) | Técnico | Checagem de conformidade (§6.3) aprovada |
| **4. Tasks** | Em que ordem? | `tasks.md` | Técnico / agente | Toda task referencia ao menos 1 requisito |
| **5. Implement** | — | código + testes | Agente / dev | Task a task, testes primeiro |
| **6. Verify** | Ficou como especificado? | PR + relatório de rastreabilidade | Checks locais + revisão | Todo requisito coberto por teste verde |
| **7. Evolve** | O que mudou depois? | spec atualizada | Produto | Spec reflete o código em produção |

### 3.1 Estados de uma spec

```
draft → clarified → planned → in-progress → implemented → released
                                                   │
                                                   └──▶ superseded (substituída por outra spec)
```

O estado fica no cabeçalho do `spec.md` e é atualizado a cada etapa.

### 3.2 Tamanho certo de uma spec
- Uma spec = uma capacidade entregável e testável de ponta a ponta. Exemplos: "favoritar anúncios", "revelar contato do vendedor".
- Se a spec tem mais de **15 requisitos funcionais** ou o `tasks.md` passa de **25 tasks**, quebre em duas.
- Correção pequena de bug **não precisa** de spec nova: basta um teste que reproduz o bug + referência à spec original no PR.

---

## 4. Etapa 1 — Specify (`spec.md`)

A spec fala de **comportamento**, não de tecnologia. Nada de "tabela", "endpoint", "Drizzle" ou "componente React" aqui. Use as telas do PRD (ex.: [2a]) como referência.

### Template

```markdown
---
id: 005
slug: favorites
title: Favoritar anúncios
status: draft
owner: time-marketplace
created: 2026-10-01
---

# 005 · Favoritar anúncios

## Contexto
Por que isso existe. Que problema do usuário resolve. Uma ou duas frases de métrica de sucesso.

## Atores
- **Comprador** (buyer) autenticado
- **Visitante** (não autenticado)

## Fora de escopo
- Compartilhar lista de favoritos
- Alertas de queda de preço (spec 009)

## Requisitos funcionais
- **FAV-FR-001** O comprador pode favoritar um anúncio publicado.
- **FAV-FR-002** O comprador pode remover um anúncio dos favoritos.
- **FAV-FR-003** O comprador vê seus favoritos, do mais recente ao mais antigo.
- **FAV-FR-004** Favoritar um anúncio já favoritado não gera erro nem duplicidade.
- **FAV-FR-005** Anúncios vendidos ou pausados continuam na lista, sinalizados como indisponíveis.
- **FAV-FR-006** O visitante que tenta favoritar é levado ao login e, após autenticar, o anúncio é favoritado.

## Requisitos não funcionais
- **FAV-NFR-001** A lista carrega em até 300 ms (p95) com 500 favoritos.
- **FAV-NFR-002** Limite de 1.000 favoritos por usuário.

## Requisitos de segurança e privacidade
- **FAV-SEC-001** Um usuário nunca vê nem altera os favoritos de outro.
- **FAV-SEC-002** O dono do anúncio não sabe *quem* favoritou, só a contagem total.

## Critérios de aceite
### FAV-FR-001
- **Dado** um comprador autenticado e um anúncio publicado
- **Quando** ele favorita o anúncio
- **Então** o anúncio aparece na lista de favoritos dele
- **E** o contador de favoritos do anúncio aumenta em 1

### FAV-FR-004
- **Dado** um anúncio já favoritado pelo comprador
- **Quando** ele favorita de novo
- **Então** a operação tem sucesso e a lista continua com uma única entrada

### FAV-SEC-001
- **Dado** o comprador A com favoritos e o comprador B autenticado
- **Quando** B tenta listar ou remover favoritos de A
- **Então** B não acessa nada de A

(... um bloco por requisito ...)

## Pendências
- [PENDENTE] Ao excluir o anúncio, o favorito some ou fica como "removido"?
```

### Regras 🤖
- Use IDs no formato `<PREFIXO>-<TIPO>-<NNN>`, com prefixo de 3 letras por spec e tipo `FR` (funcional), `NFR` (não funcional) ou `SEC` (segurança).
- **IDs são permanentes:** requisito removido vira ~~riscado~~ com motivo e nunca é renumerado.
- Cada requisito é **uma frase, testável**, com sujeito e verbo. Evite "deve ser rápido", "amigável", "seguro".
- Todo `FR` e `SEC` tem pelo menos um critério de aceite em Dado/Quando/Então.
- Toda spec que lida com dado de usuário tem ao menos um `SEC` de isolamento entre usuários.
- Ambiguidade vira `[PENDENTE]`. **O agente nunca resolve uma pendência por conta própria:** ele pergunta.

---

## 5. Etapa 2 — Clarify

O objetivo é eliminar ambiguidade **antes** de gastar tempo com plano e código.

O Claude Code (`/clarify`) lê a spec e faz no máximo **5 perguntas** por rodada, priorizando o que muda escopo, dados ou segurança. Exemplos de perguntas úteis:
- "Visitante favorita → login → volta: o favorito é aplicado automaticamente ou o usuário precisa clicar de novo?"
- "Há limite de favoritos? O que acontece ao atingir?"
- "Anúncio excluído: some da lista ou aparece como removido?"

As respostas viram texto na spec (requisito novo, critério novo ou item de "Fora de escopo") e o `[PENDENTE]` é removido. Quando não houver mais pendências, o status passa a `clarified`.

---

## 6. Etapa 3 — Plan (`plan.md` + `contract.md`)

Aqui entra a tecnologia. O plano diz **como** cada requisito será atendido, respeitando os princípios, o `API.md` e o `SECURITY.md`.

### 6.1 Template `plan.md`

```markdown
---
spec: 005
status: draft
---

# Plano · 005 Favoritar anúncios

## Resumo técnico
Serviço `favorites`; Server Actions de favoritar/remover; botão no card e no detalhe; contador
desnormalizado em `vehicles.favoritesCount`.

## Impacto
| Camada | Mudança |
|---|---|
| Dados | tabela `favorites (user_id, vehicle_id, created_at)`, PK composta; coluna `favorites_count` em `vehicles` |
| Servidor | serviço `favorites` + 2 Server Actions |
| Web | `FavoriteButton`, página `/conta/favoritos` |
| Jobs | nenhum |

## Mapa requisito → solução
| Requisito | Solução |
|---|---|
| FAV-FR-001 | action `addFavorite`: insere e incrementa o contador na mesma transação |
| FAV-FR-004 | idempotente: `insert ... on conflict do nothing`; incrementa só se inseriu |
| FAV-FR-005 | resposta inclui `listing.availability` (`available` / `unavailable`) |
| FAV-FR-006 | web guarda a intenção em `?intent=favorite:<id>` e a executa após o login |
| FAV-SEC-001 | `userId` sempre da sessão; a action não recebe `userId` |
| FAV-SEC-002 | saída pública do veículo expõe só `favoritesCount` |
| FAV-NFR-001 | índice `(user_id, created_at desc)`; paginação por cursor |
| FAV-NFR-002 | checagem de contagem antes do insert → 422 `favorites-limit-reached` |

## Modelo de dados
(trecho da migration prevista)

## Riscos e alternativas descartadas
- Contar favoritos com `count(*)` a cada card → descartado por custo na listagem.

## Conformidade
(checklist do §6.3 preenchido)
```

### 6.2 Template `contract.md`
Só é necessário quando a feature cria Route Handlers (`/api/v1`). Descreve as rotas **antes** do código existir.

```markdown
# Contrato · 005 Favoritar anúncios

| Método | Path | Auth | Rate limit | Idempotente | Requisitos |
|---|---|---|---|---|---|
| GET | /v1/favorites | buyer+ | default | — | FAV-FR-003, FAV-FR-005 |
| PUT | /v1/favorites/{listingId} | buyer+ | default | sim (PUT) | FAV-FR-001, FAV-FR-004 |
| DELETE | /v1/favorites/{listingId} | buyer+ | default | sim | FAV-FR-002 |

## Respostas
- `GET` → `{ data: FavoriteItem[], page: { nextCursor, hasMore } }`
- `PUT` → `204`
- Erros: `404 listing-not-found`, `422 favorites-limit-reached`

## FavoriteItem
| Campo | Tipo | Observação |
|---|---|---|
| listing | ListingCardResponse | |
| availability | `available` \| `unavailable` | FAV-FR-005 |
| favoritedAt | date-time | |
```

### 6.3 Checagem de conformidade (gate do plano) 🤖
O plano só é aprovado se responder **sim** a todos os itens:

- [ ] Todo requisito da spec aparece no mapa requisito → solução
- [ ] Actions e rotas seguem o `API.md` §2 (schema, sessão, posse, saída explícita, idempotência)
- [ ] Toda action/rota com id checa a posse (`SECURITY.md` §4)
- [ ] Schemas de entrada não aceitam campos privilegiados
- [ ] Dados pessoais novos estão na tabela do `SECURITY.md` §8
- [ ] Formulário público tem honeypot + rate limit
- [ ] Consultas novas têm índice previsto
- [ ] Migrations aditivas, ou há plano de transição
- [ ] Nada do Supabase além de Postgres e Auth

---

## 7. Etapa 4 — Tasks (`tasks.md`)

O plano é quebrado em passos pequenos, ordenados e verificáveis.

### Template

```markdown
---
spec: 005
---

# Tasks · 005 Favoritar anúncios

## Fase 1 — Fundação
- [ ] **T001** Migration: tabela `favorites` + `listings.favoritesCount` + índices · _FAV-NFR-001_
- [ ] **T002** [P] Criar módulo `favorites` pelo golden path (`module-info.yaml`, `@ApiModule`) · _—_

## Fase 2 — Testes primeiro
- [ ] **T003** e2e: favoritar e listar · _FAV-FR-001, FAV-FR-003_
- [ ] **T004** [P] e2e: favoritar duas vezes não duplica · _FAV-FR-004_
- [ ] **T005** [P] e2e: usuário B não acessa favoritos de A · _FAV-SEC-001_
- [ ] **T006** [P] e2e: limite de 1.000 · _FAV-NFR-002_

## Fase 3 — Implementação API
- [ ] **T007** Repository + service com upsert transacional · _FAV-FR-001, FAV-FR-004_
- [ ] **T008** Controller + DTOs · _FAV-FR-001..005_
- [ ] **T009** Conferir migration, índices e a tabela de rotas do `API.md`

## Fase 4 — Web
- [ ] **T010** `FavoriteButton` com estado otimista · _FAV-FR-001, FAV-FR-002_
- [ ] **T011** Intent pós-login · _FAV-FR-006_
- [ ] **T012** Página `/conta/favoritos` · _FAV-FR-003, FAV-FR-005_

## Fase 5 — Fechamento
- [ ] **T013** Teste de carga da listagem (500 favoritos) · _FAV-NFR-001_
- [ ] **T014** Relatório de rastreabilidade verde; atualizar status da spec
```

### Regras 🤖
- Use IDs `T001`, `T002`… sequenciais por spec.
- `[P]` marca tasks paralelizáveis, isto é, sem dependência entre si nem arquivo em comum.
- **Toda task cita os requisitos que atende.** Tasks de infraestrutura usam `—`.
- **Testes vêm antes da implementação** que eles cobrem.
- Cada task é pequena o suficiente para um commit, com no máximo ~300 linhas alteradas.
- A última task é sempre a verificação de rastreabilidade.

---

## 8. Etapa 5 — Implement 🤖

### 8.1 Como o agente executa
1. Lê `spec.md`, `plan.md` e `tasks.md` da feature, além do `API.md` e do `SECURITY.md`.
2. Pega a **próxima task não marcada**, respeitando a ordem das fases.
3. Implementa **só** essa task.
4. Roda os checks: lint, typecheck e testes.
5. Se passou, marca `[x]` no `tasks.md`, **sugere** a mensagem de commit (§8.4) e para. **O agente só commita quando o dono pede.**
6. Se falhou, corrige. Depois de 3 tentativas, para e relata o bloqueio.
7. Passa para a próxima task.

### 8.2 Quando o agente deve parar e perguntar
- A task exige algo que **não está** na spec ou no plano.
- A spec e o plano se contradizem.
- A implementação exigiria violar o `API.md` ou o `SECURITY.md`.
- É necessária uma dependência nova.
- Há mudança destrutiva em dados existentes (apagar ou renomear campo).

Nesses casos, **não improvise:** proponha a alteração na spec ou no plano e espere aprovação.

### 8.3 Rastreabilidade no código
Os requisitos aparecem **nos testes**, não espalhados em comentários pelo código.

```ts
describe('005 · Favorites', () => {
  it('[FAV-FR-001] favorita anúncio publicado e incrementa contador', async () => { /* ... */ });
  it('[FAV-FR-004] favoritar duas vezes não duplica', async () => { /* ... */ });
  it('[FAV-SEC-001] usuário B não lista favoritos de A', async () => { /* ... */ });
  it('[FAV-SEC-001] usuário B não remove favorito de A', async () => { /* ... */ });
});
```

No web (Playwright):
```ts
test('[FAV-FR-006] visitante favorita, faz login e o favorito é aplicado', async ({ page }) => { /* ... */ });
```

No código de produção, use comentário com ID **só** quando a regra não for óbvia:
```ts
// FAV-FR-004: idempotente — incrementa o contador apenas se o registro foi criado
```

### 8.4 Commits e PR 🤖
**O agente só commita e faz push quando o dono pede**, e nunca executa `git merge`, `git rebase` nem `gh pr create`. Ao fim de cada task, ele lista os arquivos alterados e **sugere** a mensagem de commit; você revisa e pede o commit (ou commita).

- **Sem coautoria:** nenhuma mensagem sugerida pode conter `Co-Authored-By`, "Generated with Claude Code" ou qualquer menção ao agente. A autoria é só sua. Isso também é reforçado no `.claude/settings.json` (ver `CLAUDE.md`).
- **Branch:** `spec/005-favorites` (você cria).
- **Mensagem sugerida:** formato Conventional Commits com referência à spec e à task:
  ```
  feat(favorites): upsert transacional de favorito [005/T007]
  ```
- **PR:** um por spec, ou um por fase em specs grandes. O agente pode redigir a descrição com o template abaixo; quem abre o PR é você.

```markdown
## Spec
specs/005-favorites · status: in-progress → implemented

## Tasks concluídas
T001–T014

## Rastreabilidade
(gerado pelo `/verify` — §9.1)

## Desvios do plano
- Nenhum / ou: o que mudou e por quê (e onde a spec/plano foi atualizado)
```

---

## 9. Etapa 6 — Verify

### 9.1 Relatório de rastreabilidade
O `/verify`:
1. lê os IDs `XXX-(FR|NFR|SEC)-NNN` da `spec.md`;
2. procura esses IDs nos nomes de testes (`it('[ID] ...')`, `test('[ID] ...')`);
3. cruza com o resultado da execução dos testes;
4. monta a tabela para a descrição do PR.

```
Spec 005 · Favoritar anúncios
┌──────────────┬───────────┬───────┐
│ Requisito    │ Testes    │ Status│
├──────────────┼───────────┼───────┤
│ FAV-FR-001   │ 2         │ ✅    │
│ FAV-FR-002   │ 1         │ ✅    │
│ FAV-FR-003   │ 1         │ ✅    │
│ FAV-FR-004   │ 1         │ ✅    │
│ FAV-FR-005   │ 1         │ ✅    │
│ FAV-FR-006   │ 1 (e2e)   │ ✅    │
│ FAV-NFR-001  │ 1 (k6)    │ ✅    │
│ FAV-NFR-002  │ 1         │ ✅    │
│ FAV-SEC-001  │ 2         │ ✅    │
│ FAV-SEC-002  │ 0         │ ❌    │
└──────────────┴───────────┴───────┘
```

**Bloqueia o merge:** qualquer `FR` ou `SEC` sem teste, ou com teste falhando. `NFR` sem teste gera aviso.

### 9.2 Rotas previstas × implementadas
Se houver `contract.md`, confira que toda rota implementada está nele e vice-versa.

### 9.3 Revisão humana
O revisor confere **intenção**, não sintaxe:
- O comportamento bate com os critérios de aceite?
- Os desvios do plano estão justificados e refletidos nos documentos?
- Algo implementado não estava na spec? (Se sim, entra na spec ou sai do código.)

### 9.4 Encerramento
Depois do merge:
- a spec passa para `implemented`;
- após o deploy em produção, passa para `released`, com data.

---

## 10. Etapa 7 — Evolve

O código **nunca** muda de comportamento sem a spec mudar antes.

| Situação | O que fazer |
|---|---|
| Ajuste de comportamento numa feature existente | Edita a spec original: requisito novo com próximo ID, ou requisito antigo riscado com motivo. Novo `plan.md`/`tasks.md` em seção "Revisão 2". |
| Mudança grande ou que quebra contrato | Spec nova (`012-favorites-v2`) com `supersedes: 005`; a antiga vira `superseded`. |
| Bug | Teste com ID do requisito violado + correção. Se o bug revelou requisito faltando, adiciona à spec. |
| Remoção de feature | Spec de remoção curta. |

**Teste de sanidade mensal:** escolha uma spec `released` ao acaso e confira se o sistema em produção ainda faz o que ela diz. Divergência vira issue.

---

## 11. Princípios

São os princípios que **toda** spec e todo plano respeitam.

1. Mobile first: toda tela é desenhada primeiro para 390 px.
2. Regra de negócio só no servidor, na camada de serviço; o navegador nunca acessa o banco.
3. Seguro por padrão (`SECURITY.md`); privacidade por padrão (LGPD).
4. Custo zero enquanto possível: respeitar as cotas gratuitas (Supabase, Cloudinary, Vercel).
5. Testes antes da implementação; todo requisito tem teste.
6. Simplicidade: a menor solução que atende à spec. Abstração só na segunda repetição.
7. Nada de comportamento sem spec.

---

## 12. Integração com o Claude Code 🤖

### 12.1 Skills do processo (`.claude/skills/`)
No Claude Code, os comandos personalizados foram unificados com as **skills**: um arquivo em `.claude/skills/<nome>/SKILL.md` vira o comando `/<nome>`. As skills de processo abaixo têm `disable-model-invocation: true`, porque só você decide quando avançar de etapa. Cada uma começa com um frontmatter assim:

```yaml
---
name: spec
description: Cria uma nova spec SDD a partir de uma descrição de feature
disable-model-invocation: true
---
```

O corpo de cada skill está abaixo. A lista completa de skills do projeto (inclusive as técnicas, que o agente usa sozinho) está no `CLAUDE.md`.

**`/spec`**: `.claude/skills/spec/SKILL.md`
```markdown
Crie uma nova spec a partir da descrição: $ARGUMENTS

1. Descubra o próximo número livre em docs/specs/ e gere o slug.
2. Crie docs/specs/NNN-slug/spec.md seguindo SDD.md §4.
3. Escreva só comportamento; nada de tecnologia.
4. Toda dúvida vira [PENDENTE]. Não invente respostas.
5. Inclua ao menos um requisito SEC de isolamento se houver dado de usuário.
6. Status: draft. Ao final, liste as pendências.
```

**`/clarify`**: `.claude/skills/clarify/SKILL.md`
```markdown
Leia docs/specs/$ARGUMENTS/spec.md e faça até 5 perguntas, priorizando escopo, dados e segurança.
Depois que eu responder, incorpore as respostas na spec, remova os [PENDENTE] resolvidos
e, se não restar nenhum, mude o status para clarified.
```

**`/plan`**: `.claude/skills/plan/SKILL.md`
```markdown
Leia docs/specs/$ARGUMENTS/spec.md (status deve ser clarified), ARCHITECTURE.md,
API.md e SECURITY.md. Gere plan.md (e contract.md, se houver Route Handler) seguindo SDD.md §6.
Todo requisito deve aparecer no mapa requisito → solução.
Preencha a checagem de conformidade (§6.3) e aponte qualquer item que não passe.
Não escreva código de produção.
```

**`/tasks`**: `.claude/skills/tasks/SKILL.md`
```markdown
Leia spec.md, plan.md e contract.md de docs/specs/$ARGUMENTS e gere tasks.md seguindo SDD.md §7.
Testes antes da implementação; toda task cita requisitos; marque [P] o que é paralelizável;
última task = rastreabilidade.
```

**`/implement`**: `.claude/skills/implement/SKILL.md`
```markdown
Implemente docs/specs/$ARGUMENTS seguindo SDD.md §8.
Execute uma task por vez na ordem do tasks.md: implemente, rode os checks e marque [x].
Só rode git commit/push se eu pedir; nunca merge, rebase ou gh pr create. Ao fim de cada task, liste os arquivos
alterados, sugira a mensagem no formato "<tipo>(<escopo>): <descrição> [<spec>/<task>]",
sem Co-Authored-By nem qualquer menção ao Claude, e espere o commit antes da próxima task.
Pare e pergunte nas situações do §8.2. Não altere spec.md sem minha aprovação.
```

**`/verify`**: `.claude/skills/verify/SKILL.md`
```markdown
Para docs/specs/$ARGUMENTS: monte o relatório de rastreabilidade (§9.1), confira as rotas (§9.2) e liste: requisitos sem teste, testes falhando, endpoints fora do contrato, desvios do plano.
Se estiver tudo verde, atualize o status da spec para implemented e redija a descrição do PR (§8.4),
sem rodapé de atribuição ao Claude. Não abra o PR: eu abro.
```

### 12.2 Fluxo típico numa sessão

```
/spec  usuário pode favoritar anúncios e ver a lista depois
/clarify 005-favorites
   → você responde as perguntas
/plan 005-favorites
   → você revisa plan.md e contract.md
/tasks 005-favorites
/implement 005-favorites
/verify 005-favorites
```

**Onde você revisa:** depois de `/spec` + `/clarify` (intenção) e depois de `/plan` (abordagem). Revisar ali custa minutos; corrigir depois do código custa horas.

### 12.3 Regras para o agente fora dos comandos
- Pedido de feature sem spec: **sugira criar a spec** antes de escrever código. Exceção: o usuário dizer explicitamente "sem spec" para um protótipo descartável numa branch `spike/*`.
- Pedido de mudança de comportamento: localize a spec afetada e proponha a alteração **antes** do código.
- Código em branch `spike/*` nunca vai para `main`. Se o protótipo valer a pena, vira spec e é reimplementado.

### 12.4 Alternativa pronta
O **GitHub Spec Kit** (open source) implementa um fluxo parecido, com constituição, specify, plan, tasks e implement, e tem integração com o Claude Code. Este documento segue a mesma lógica, adaptada às regras do `API.md` e do `SECURITY.md`.

---

## 13. Ordem das specs

A ordem das specs do CajuGo está em `PLAN.md`.

---

## 14. Checklist do processo

- [ ] `spec.md` sem `[PENDENTE]`, status `clarified`
- [ ] `plan.md` com todos os requisitos mapeados e conformidade ✅
- [ ] `contract.md` revisado (se houver)
- [ ] `tasks.md` com testes antes da implementação
- [ ] Todos os `FR` e `SEC` com teste verde (relatório de rastreabilidade)
- [ ] Desvios registrados na spec/plano
- [ ] Status atualizado (`implemented` → `released`)