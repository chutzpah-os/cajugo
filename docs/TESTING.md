# Testes automatizados

> Rotina de testes do CajuGo. Complementa o `SDD.md` (testes antes da implementação, IDs de requisito) e o `SECURITY.md` (caso "loja B").
>
> **Este arquivo é lido pelo Claude Code.** As seções marcadas com 🤖 são obrigatórias.

## 1. Objetivo
Garantir a integridade do sistema, prevenir regressões e assegurar a qualidade do código com testes automatizados em todas as funcionalidades do CajuGo.

## 2. Princípios (baseados na metodologia do Fabio Akita)
1. **Zero testes manuais repetitivos:** nenhuma funcionalidade está concluída sem os testes automatizados correspondentes.
2. **Execução pré-commit obrigatória:** nenhum código é versionado sem passar antes pela suíte de testes.
3. **Prevenção de regressões:** toda alteração, refatoração ou correção de bug vem acompanhada de testes que garantem que o que já existia não quebrou.
4. **Feedback rápido:** a suíte roda de forma ágil e automática na máquina local, antes de ir para o GitHub.

## 3. Bloqueio no commit (Husky) 🤖
- O **Husky** (gratuito, open source) gerencia os git hooks. Ele é ativado sozinho no `pnpm install` (script `prepare`).
- O hook `.husky/pre-commit` roda **`pnpm check`** (lint, tipos, formatação e testes) a cada `git commit`. **Se qualquer etapa falhar, o commit é interrompido** até o erro ser corrigido.
- **Proibido pular o hook** (`git commit --no-verify` / `-n`). Se o hook atrapalhar de verdade, ajuste o hook, não o ignore.
- Os testes de integração usam **PGlite** (Postgres em memória): não precisa de Docker nem de banco ligado; o hook roda em qualquer máquina.

## 4. Tipos de teste no CajuGo

| Tipo | Ferramenta | O que cobre | Onde fica | Quando roda |
|---|---|---|---|---|
| Unitário | Vitest | funções puras: cálculo de parcela, validação de slug, máquinas de estado, schemas zod | ao lado do código: `src/**/*.test.ts` | a cada commit |
| Integração | Vitest + PGlite (Postgres em memória) | `service.ts` e Server Actions com banco real: regras, posse, transações | `src/domains/<domínio>/*.test.ts` | a cada commit |
| Ponta a ponta (e2e) | Playwright, viewport de celular | fluxos de tela: vitrine → veículo → lead, cadastro de veículo, login | `tests/e2e/` | antes de concluir cada spec e antes de deploy em produção (lento demais para todo commit) |

Integração usa banco de verdade, sem mock do banco: a regra mais importante (posse por loja) só é testada de fato com SQL real. Serviços externos (Cloudinary, gateway, Supabase Auth) são substituídos por versões falsas nos testes.

### Banco nos testes de integração
`createTestDb()` (`src/platform/db/testing/test-db.ts`) cria um **PGlite novo e vazio** e aplica todas as migrations de `drizzle/`. Um banco por teste: nenhum teste vê dados de outro, e a própria migration é testada a cada execução. Exemplo em `src/platform/db/schema.test.ts`.
```ts
let t: Awaited<ReturnType<typeof createTestDb>>;
beforeEach(async () => { t = await createTestDb(); });
afterEach(async () => { await t.close(); });
```
O PGlite é Postgres 17 de verdade compilado para WebAssembly. As migrations também são aplicadas no Supabase de staging antes de produção (`DEPLOYMENT.md`), o que pega qualquer diferença rara de extensão.

## 5. Como escrever testes 🤖

### A. Nome do teste = ID do requisito
Todo teste de feature leva o ID do requisito da spec (`SDD.md` §8.3), para o `/verify` montar a rastreabilidade:
```ts
it('[VEH-FR-003] publica veículo com ao menos 1 foto', async () => { ... });
it('[VEH-SEC-001] loja B não edita veículo da loja A (404)', async () => { ... });
```

### B. Caminho feliz e exceções
Cubra o fluxo principal **e** as condições de borda e erros conhecidos: entrada inválida, limite (20 fotos, 2.000 caracteres), status que não permite a ação, recurso inexistente.

### C. Estrutura AAA (Arrange, Act, Assert)
```ts
it('[LEA-FR-002] avança lead de Novo para Em contato', async () => {
  // Arrange: estado inicial e dependências
  const { store, lead } = await seedStoreWithLead({ status: 'new' });

  // Act: executa o fluxo testado
  const result = await leads.advanceStatus(sessionOf(store), lead.id);

  // Assert: verifica a saída e o estado final
  expect(result.status).toBe('contacting');
});
```

### D. Isolamento entre lojas (obrigatório)
Toda action ou serviço que recebe um id tem um teste "loja B tenta acessar o recurso da loja A" e espera **404** (`SECURITY.md` §4).

### E. Correção de bugs
1. **Escreva primeiro o teste que reproduz o bug.** Ele deve falhar.
2. Corrija o código até o teste passar.
3. O teste fica na suíte para sempre, com o ID do requisito violado no nome.

### F. Prioridade de cobertura
Comece pela lógica central de negócio:
1. login, sessão e permissões (papel e posse por loja);
2. assinatura e pagamento (status, webhook idempotente, suspensão);
3. regras de dados (visibilidade na vitrine, status do veículo, slug único);
4. integrações e Route Handlers (`/api/v1`).

Telas puramente visuais ficam para o e2e.

## 6. Checklist do agente 🤖
Ao criar ou alterar qualquer arquivo de código:
- [ ] Criei ou atualizei o teste correspondente (com ID do requisito, se for feature).
- [ ] Cobri o caminho feliz, as exceções e, se houver id na entrada, o caso "loja B".
- [ ] `pnpm check` passa localmente: 100% dos testes, novos e existentes, verdes.
- [ ] O hook do Husky consegue rodar a suíte sem erro (nunca usei `--no-verify`).
- [ ] Bug corrigido tem teste que falhava antes da correção.
