# CLAUDE.md

**CajuGo** — SaaS de catálogo de veículos para lojistas (R$ 100/mês): catálogo próprio da loja + vitrine central CajuGo + leads no WhatsApp. Produto em `docs/PRD.md`, telas em `docs/design/`.

## Documentos
| Arquivo | Para quê |
|---|---|
| `docs/PRD.md` | o que o produto faz (papéis, fluxos, regras, telas) |
| `docs/design/DESIGN.md` + `docs/design/CajuGo Telas.dc.html` | sistema visual e telas |
| `docs/ARCHITECTURE.md` | stack, modelo de dados (Postgres), cache, jobs |
| `docs/API.md` | como escrever código de servidor; mapa de rotas e actions |
| `docs/SECURITY.md` | regras de segurança e LGPD |
| `docs/SDD.md` | processo spec → plan → tasks → implement → verify |
| `docs/TESTING.md` | rotina de testes automatizados e bloqueio no commit (Husky) |
| `docs/PLAN.md` | roadmap e ordem das specs |
| `docs/DEPLOYMENT.md` / `docs/OBSERVABILITY.md` | deploy e monitoramento |
| `GLOSSARY.md` | vocabulário do produto (pt-BR) e nomes no código |
| `docs/adr/` | decisões grandes e difíceis de reverter |

## Stack
- **Next.js** full-stack (App Router, Server Components, Server Actions, Route Handlers), serverless na **Vercel**. Mobile first, responsivo.
- **Supabase** no plano gratuito: **Postgres** (acessado com **Drizzle**, só no servidor) e **Auth** (e-mail e senha). Não usamos Storage, Data API, Realtime nem Edge Functions.
- **Cloudinary** para todas as imagens (upload assinado direto do navegador).
- **Ferramentas:** pnpm, TypeScript, ESLint + Prettier, Vitest + Playwright, zod, Tailwind.
- **Expo:** fase futura, não implementar. A saída da Vercel para uma VPS é futura; não use nada que só exista na Vercel (KV, Blob, Edge Config, Edge Runtime).

**Ainda não definido:** gateway de pagamento, e-mail transacional, FIPE. **Não escolha, instale nem assuma nenhum deles sem me perguntar.**

## Regras que já valem
- O navegador nunca acessa o banco nem o Supabase. Regra de negócio fica na camada de serviço do servidor, não em RLS.
- Mudança de schema só por migration do Drizzle, versionada. Nunca pelo painel do Supabase.
- Antes de mexer em servidor, leia `docs/API.md`. Antes de mexer em auth, dados pessoais, uploads ou pagamento, leia `docs/SECURITY.md` (seções 🤖 e checklist §12).
- Resumo: valide entrada com schema; `storeId` vem da sessão; recurso de outra loja → 404; saída montada à mão; formulário público com honeypot + rate limit.
- Respeite as cotas gratuitas: cache nas páginas públicas.

## Estrutura de pastas
Por domínio: `src/app/` (rotas finas) → `src/domains/<domínio>/` (`service.ts`, `actions.ts`, `schemas.ts`, `components/`, testes) → `src/platform/` (db, supabase, cloudinary, http) e `src/ui/` (componentes base). Detalhes e regras de dependência em `docs/ARCHITECTURE.md` §3.

## Processo (Spec-Driven Development)
Toda feature segue **`docs/SDD.md`**: spec → clarify → plan → tasks → implement → verify. Specs ficam em `docs/specs/NNN-slug/`.
- Não escreva código de feature sem spec `clarified` e plano aprovado (exceto branches `spike/*`).
- Testes nomeados com o ID do requisito: `it('[VEH-FR-001] ...')`.
- Nunca resolva um `[PENDENTE]` por conta própria; pergunte.
- Mudança de comportamento começa pela spec, não pelo código.

## Skills
Ficam em `.claude/skills/<nome>/SKILL.md` e viram o comando `/<nome>`. Antes de uma tarefa, verifique se existe skill para ela.

### Processo SDD (só por comando; `disable-model-invocation: true`)
| Skill | O que faz |
|---|---|
| `/spec` | cria a `spec.md` de uma feature (`docs/SDD.md` §4) |
| `/clarify` | faz até 5 perguntas e resolve os `[PENDENTE]` |
| `/plan` | gera `plan.md` e preenche a checagem de conformidade |
| `/tasks` | gera `tasks.md` com testes antes da implementação |
| `/implement` | executa uma task por vez e sugere o commit (só commita se eu pedir) |
| `/verify` | rastreabilidade requisito × teste e rascunho do PR |

### Técnicas (a criar quando o código começar)
| Skill | Quando usar | Referência |
|---|---|---|
| `server-action` | criar action/rota com schema, sessão, posse e saída explícita | `docs/API.md` §2 |
| `next-page` | página mobile first no App Router, dados via serviço | `docs/design/DESIGN.md` |
| `cloudinary-upload` | fluxo de foto com upload assinado | `docs/API.md` §4, `docs/SECURITY.md` §5 |
| `security-review` | revisar um diff com o checklist | `docs/SECURITY.md` §12 |
| `commit-message` | sugerir mensagem Conventional Commits `[spec/task]` | seção Git |

### Skills externas
- **find-skills:** `npx skills add https://github.com/vercel-labs/skills --skill find-skills`
- **mattpocock-skills** (plugin): `claude plugin install mattpocock-skills@claude-plugins-official` — ✅ instalado em 2026-10-22 (v1.3.1, escopo usuário). **Usado dentro das etapas do SDD** (`docs/SDD.md` §12.2): `grilling`, `domain-modeling`, `codebase-design`, `tdd`, `code-review`, `diagnosing-bugs`, `improve-codebase-architecture`. **Não use** `to-spec`, `to-tickets`, `implement`, `implement-spec`, `wayfinder`, `pr` e `wizard` (concorrem com o SDD, commitam, abrem PR ou gravam segredos).
- **frontend-design:** `npx skills add https://github.com/anthropics/skills --skill frontend-design`
- **systematic-debugging** e **brainstorming:** https://github.com/obra/superpowers
- **Regra:** skill externa é código de terceiros. Antes de instalar, leia o `SKILL.md` e os scripts; nunca instale skill que peça segredos, rede irrestrita ou comandos de git. Mantenha a lista das instaladas.
- Não crie skill nova sem eu pedir; se achar que uma faz falta, sugira.

## Agent skills

### Issue tracker

Issues no GitHub Issues do repositório público `chutzpah-os/cajugo`, via `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

Os cinco rótulos padrão: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` na raiz e ADRs em `docs/adr/`. See `docs/agents/domain.md`.

## Comandos
| Comando | O que faz |
|---|---|
| `pnpm dev` | servidor de desenvolvimento (http://localhost:3000) |
| `pnpm build` | build de produção (`output: 'standalone'`) |
| `pnpm lint` | ESLint (Next + TypeScript + Prettier) |
| `pnpm typecheck` | `next typegen` + `tsc --noEmit` |
| `pnpm test` | Vitest (`src/**/*.test.ts`); integração usa PGlite via `createTestDb()` |
| `pnpm format` / `pnpm format:check` | Prettier (ignora `docs/` e `.md`) |
| `pnpm check` | lint + typecheck + format:check + test — rode antes de todo commit |
| `pnpm db:generate --name <nome>` | gera migration em `drizzle/` a partir de `src/platform/db/schema.ts` |
| `pnpm db:migrate` | aplica migrations no banco de `DATABASE_URL_MIGRATIONS` (ou `DATABASE_URL`) |
| `pnpm db:studio` | Drizzle Studio para inspecionar o banco |

Variáveis em `.env.local` (modelo em `.env.example`).

## Next.js 16
Esta versão do Next mudou em relação ao que o modelo conhece. Antes de escrever código de Next, leia o guia correspondente em `node_modules/next/dist/docs/` (ver `AGENTS.md`, gerado e mantido pelo próprio `next dev`).

## Ao terminar uma mudança
1. Crie ou atualize os testes (`docs/TESTING.md` §5–6) e rode `pnpm check`. O commit é bloqueado pelo Husky se algo falhar.
2. **Código morto:** procure funções, componentes, imports, arquivos, rotas, variáveis de ambiente e dependências sem uso nas suas alterações e ao redor. Remova o que for confirmado (busque todas as referências antes). Na dúvida, não remova: liste como suspeito no resumo.
3. Só conclua com tudo verde.

## Git e commits (regra inegociável)
**O Claude Code commita e faz push só quando eu pedir** ("pode comitar", "commita e sobe"). Nunca por conta própria, nem ao fim de uma task sem eu pedir.
- Ao terminar uma task: rode `pnpm check`, liste os arquivos alterados, sugira a mensagem de commit e pare. Eu reviso e peço o commit (ou commito eu mesmo).
- Nunca execute `git merge`, `git rebase`, `git tag`, `gh pr create`/`gh pr merge`, `push --force`, nem reescreva histórico.
- Nunca pule o hook de pre-commit (`--no-verify` / `-n`). Se falhar, corrija.
- **Segredos:** o `.env.local` pode ser lido, mas só para conferir se uma variável existe ou testar conexão, sem exibir valores; para ver um valor, pergunte antes. Nunca copie segredo para código, docs, commit ou chat.
- **Sem coautoria:** a mensagem nunca leva `Co-Authored-By`, "Generated with Claude Code", link de sessão nem qualquer menção ao Claude. O mesmo vale para descrições de PR.
- Formato: Conventional Commits com referência à spec e à task, ex.: `feat(vehicles): publicar veículo [003/T007]`.
- Pode usar `git status`, `git diff` e `git log` para ler o estado do repositório.
- A cada commit, registre de forma resumida (no máximo 5 linhas por commit) **o que mudou** em `docs/changes/` e **a motivação** em `docs/decisions/`.

Isso é reforçado no `.claude/settings.json` (versionado):
```json
{
  "attribution": { "commit": "", "pr": "" },
  "permissions": {
    "deny": [
      "Bash(supabase db reset*)",
      "Bash(git merge:*)", "Bash(git rebase:*)", "Bash(git tag:*)",
      "Bash(gh pr create:*)", "Bash(gh pr merge:*)",
      "Bash(gh secret set:*)",
      "Bash(git commit --no-verify:*)", "Bash(git commit -n:*)"
    ]
  }
}
```

## Convenções
- Código, paths e campos em inglês; mensagens ao usuário em pt-BR.
- Dinheiro em centavos (inteiro); datas ISO 8601 UTC; datas na tela em dd/mm/aaaa.
