---
spec: 002
status: approved
---

# Plano · 002 Regras configuráveis e troca de senha

## Resumo técnico
Novo domínio `settings`. Cada regra é uma **chave tipada** (zod) e cada alteração é uma **linha nova** numa tabela só de inserção, `setting_values (key, value, valid_from, changed_by)`. Daí saem, sem tabela extra:
- o valor atual de cada regra;
- o valor que valia numa data qualquer (CFG-FR-009);
- o histórico de cada regra (CFG-FR-006).

Os valores provisórios entram pela própria migration (CFG-FR-003). A leitura para as telas passa por `'use cache'` com `cacheLife` de 1 minuto e `cacheTag('settings')`; ao salvar, `updateTag('settings')` (CFG-NFR-001).

As telas [4c] (`/admin/conta`) e [8f] (`/admin/indica/regras`) trocam as páginas "em construção". A troca da chave Pix pede a senha de novo.

A troca da própria senha entra no domínio `auth` (`changePassword`), na tela `/conta/senha`. A conferência de senha (`verifyOwnPassword`) reaproveita o bloqueio da spec 001 e serve também para a chave Pix.

## Impacto
| Camada | Mudança |
|---|---|
| Banco | migration `0005`: tabela `setting_values`, índice `(key, valid_from desc)`, gatilho que recusa `UPDATE`/`DELETE` (CFG-SEC-003), carga dos valores provisórios. **Substitui** a tabela `settings` de 1 linha prevista no ARCHITECTURE §4 (decisão D1, ADR 0010) |
| Domínio | `src/domains/settings/` (`definitions.ts`, `service.ts`, `actions.ts`, `schemas.ts`, `components/`, testes); `src/domains/auth/` ganha `verifyOwnPassword` e `changePassword` |
| Plataforma | `AuthProvider` ganha `verifyPassword(email, password)` (Supabase: cliente sem cookie, entra e sai em seguida; falso: compara) |
| Rotas | `/admin/conta` [4c] e `/admin/indica/regras` [8f] (reais); `/conta/senha` (troca de senha, área logada); `/recuperar` lê o WhatsApp das regras |
| UI | `src/ui/`: campo de porcentagem e de dinheiro (máscara pt-BR), aviso de "somente leitura" |
| Config | remove `SUPPORT_WHATSAPP` do `.env.example`, da Vercel e do DEPLOYMENT (o número vai para a migration) |
| Jobs | nenhum |

## Desenho dos módulos (`codebase-design`)
**`settings/service.ts`** é um módulo profundo, com 4 funções públicas. As regras de formato, de limite, de vigência e de "só grava o que mudou" ficam escondidas:
- `getSettings(db, at?)` → `Settings` com **todas** as regras tipadas, valendo em `at` (padrão: agora). É uma consulta só: `distinct on (key) … where valid_from <= at order by key, valid_from desc`. Serve a CFG-FR-002, 003 e 009.
- `publicSettings(settings)` → só o que pode ir para página pública (WhatsApp de atendimento, taxa do simulador, regras do Caju Indica). A chave Pix nunca sai daqui (CFG-SEC-004).
- `updateSettings(deps, session, input, ctx)` → valida cada campo pela sua definição e insere **só as chaves que mudaram**, todas numa transação. Se a chave Pix mudou, exige `password` e chama `verifyOwnPassword` (CFG-FR-008, CFG-SEC-005).
- `settingHistory(db, session, key)` → `{ at, by, from, to }[]`, do mais recente para o mais antigo (CFG-FR-006).

O cache fica fora do serviço, em `settings/current.ts`: `currentSettings()` com `'use cache'`, `cacheTag('settings')` e `cacheLife({ stale: 60, revalidate: 60, expire: 300 })`. Os testes usam o serviço direto, sem cache.

**`settings/definitions.ts`** é a única lista de regras: chave, grupo da tela, rótulo, unidade, schema zod com os limites e valor provisório (o mesmo da migration). Dinheiro em **centavos** e porcentagem em **centésimos de ponto** (1,79% = `179`), sempre inteiros, como pede o CLAUDE.md.

| Chave | Tela / grupo | Formato e limites (proposta, D2) | Provisório |
|---|---|---|---|
| `support_whatsapp` | [4c] Vitrine | só dígitos, 12–13 (DDI 55 + DDD + número) | `557981360206` |
| `pix` | [4c] Pagamento | `{ type: cpf\|cnpj\|email\|phone\|random, key, beneficiary }`, formato conforme o tipo | vazio ("não configurada") |
| `review_business_days` | [4c] Pagamento | inteiro 1–10 | 1 |
| `past_due_tolerance_days` | [4c] Pagamento | inteiro 0–30 | 5 |
| `installment_rate_bps` | [4c] Pagamento | inteiro 0–1000 (0–10% a.m.) | 179 |
| `cajugo_fee_bps` | [4c] Rede Caju | inteiro 0–2000 (0–20%) | 100 |
| `require_approval` | [4c] Aprovação prévia | sim/não | não |
| `min_photos` | [4c] Aprovação prévia | inteiro 1–20 | 6 |
| `retention_days` | [4c] Dados | inteiro 30–3650 | 90 |
| `referral_enabled` | [8f] | sim/não | sim |
| `referral_who` | [8f] | `{ store_owner, seller, referrer }` sim/não | todos sim |
| `referral_pct_bps` | [8f] | inteiro 100–10000 (1–100%) | 3000 |
| `referral_months` | [8f] | inteiro 1–24 | 3 |
| `payout_min_cents` | [8f] | inteiro 100–100000 (R$ 1–1.000) | 5000 |

Nome e domínio da Vitrine **não** são regras: são mostrados a partir do `APP_URL` e do nome fixo da marca (spec: só leitura).

**`auth`** ganha duas funções:
- `verifyOwnPassword(deps, session, password, ctx)`: confere a senha da conta da sessão com o mesmo bloqueio da 001 (janela deslizante por e-mail e por rede; a falha conta). É usada pela chave Pix e pela troca de senha.
- `changePassword(deps, session, input, ctx)`: `authorize` com qualquer papel (quem está com senha temporária usa a `/nova-senha`), depois `verifyOwnPassword`, depois `newPasswordSchema` (≥ 8, confirmação igual, diferente da atual), depois `updateOwnPassword`, depois `signOut('others')`, e grava `activity_log` (`auth.password_changed`, sem senha).

## Mapa requisito → solução
| Requisito | Solução |
|---|---|
| CFG-FR-001 | `/admin/conta` [4c] com os grupos Vitrine (nome e domínio só leitura, WhatsApp), Rede Caju, Pagamento, Aprovação prévia e Dados, mais o link "Alterar senha" para `/conta/senha`. `/admin/indica/regras` [8f] com as regras do Caju Indica. As duas telas leem `currentSettings()` |
| CFG-FR-002 | Um formulário por grupo; a action `saveSettingsAction` chama `updateSettings` e depois `updateTag('settings')`. A tela recarrega com o valor novo |
| CFG-FR-003 | A migration `0005` insere os valores provisórios com `valid_from = '-infinity'` e `changed_by = null`. `getSettings` falha alto se faltar alguma chave, o que não acontece com a migration aplicada. `pix` começa `null` e a tela mostra "não configurada" |
| CFG-FR-004 | O schema zod de cada definição; o erro vira `fieldErrorsFromZod`, com a mensagem no campo; nada é gravado (transação) |
| CFG-FR-005 | `definitions.ts` com a lista completa (tabela acima); um teste garante que toda chave tem definição, valor provisório e lugar na tela |
| CFG-FR-006 | `settingHistory` monta "de/para" a partir de linhas consecutivas da mesma chave, com o nome de quem alterou (join em `profiles`). Na tela, "Histórico" em cada regra abre a lista |
| CFG-FR-007 | `/recuperar` usa `publicSettings(await currentSettings()).supportWhatsapp`, e o `SUPPORT_WHATSAPP` sai do código e do ambiente |
| CFG-FR-008 | Fluxo em 2 passos em [4c]: nova chave, depois a tela de revisão com a atual e a nova lado a lado e o campo de senha, depois salvar. Cancelar não grava nada. A action passa a senha a `updateSettings` |
| CFG-FR-009 | `getSettings(db, at)`: cada linha vale de `valid_from` até a próxima linha da mesma chave. As specs que calculam (009, 010, 011) chamam com a data do fato |
| CFG-FR-010 | `/conta/senha` (senha atual, nova e confirmação) e a action `changePasswordAction` → `changePassword` |
| CFG-NFR-001 | `cacheLife` com `revalidate: 60`: nenhuma instância serve valor com mais de 1 min; quem salva vê na hora (`updateTag`) |
| CFG-NFR-002 | e2e de acessibilidade (o mesmo da 001) em `/admin/conta`, `/admin/indica/regras` e `/conta/senha` |
| CFG-SEC-001 | Leitura com `authorizeTo('admin.read')` (admin e suporte); gravação com `authorizeTo('settings.edit')` (só admin, já no mapa da 001). As telas escondem os botões quando `!can(session, 'settings.edit')` |
| CFG-SEC-002 | As páginas usam `requireArea('admin')` e as actions, `authorizeTo`. As outras contas veem "Sem permissão"; o visitante vai para o login (`/admin` e `/conta` protegidos no `proxy.ts`) |
| CFG-SEC-003 | O código só insere. No banco, um gatilho `before update or delete` em `setting_values` gera erro (vale também para script e SQL manual) |
| CFG-SEC-004 | As páginas públicas só recebem `publicSettings(...)`, que é uma saída montada à mão sem `pix`. Os logs nunca recebem o valor da chave: a auditoria grava só `{ key: 'pix' }` no `activity_log` |
| CFG-SEC-005 | `updateSettings` com `pix` alterado → `verifyOwnPassword`. Senha errada: erro no campo e a falha conta no bloqueio por e-mail da 001 |
| CFG-SEC-006 | `changePassword` → `verifyOwnPassword` (a falha conta no bloqueio). O `userId` vem só da sessão; a action não recebe conta-alvo |

## Modelo de dados (migration `0005`)
```ts
// src/platform/db/schema.ts
export const settingValues = pgTable(
  "setting_values",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    key: text("key").notNull(),            // validado contra definitions.ts
    value: jsonb("value"),                  // null = "não configurado" (só pix)
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull().defaultNow(),
    changedBy: uuid("changed_by").references(() => profiles.id),   // null = valor provisório
  },
  (t) => [index("setting_values_key_valid_from").on(t.key, t.validFrom.desc())],
).enableRLS();
```
```sql
-- parte manual da 0005 (drizzle-kit generate --custom)
create function setting_values_append_only() returns trigger language plpgsql as $$
begin raise exception 'setting_values é só de inserção'; end $$;
create trigger setting_values_no_update_delete
  before update or delete on setting_values
  for each row execute function setting_values_append_only();

insert into setting_values (id, key, value, valid_from) values
  (gen_random_uuid(), 'support_whatsapp', '"557981360206"', '-infinity'),
  (gen_random_uuid(), 'pix', 'null', '-infinity'),
  (gen_random_uuid(), 'review_business_days', '1', '-infinity'),
  -- … uma linha por regra da tabela acima
```
A migration é **aditiva**: tabela nova, sem mexer no que existe.

## Telas
- `[4c] /admin/conta`: grupos em cards; cada grupo tem o próprio "Salvar" (só admin). A chave Pix tem um bloco próprio, com a chave mascarada (por exemplo `***.456.789-**` para CPF) e o botão "Trocar chave Pix", que abre o fluxo de 2 passos. Cada regra tem um link "Histórico". O suporte vê os mesmos dados, com os campos desabilitados e sem "Salvar".
- `[8f] /admin/indica/regras`: programa ativo e quem pode indicar (toggles), recompensa, duração e resgate mínimo. O item "Caju Indica" do menu leva a `/admin/indica` (8g, ainda em construção), que ganha o link "Regras do programa".
- `/conta/senha`: senha atual, nova e confirmação, e o botão "Salvar nova senha". Moldura simples (logo, voltar), como a `/nova-senha`, e serve para qualquer papel.

## Estratégia de testes
| Nível | O que cobre |
|---|---|
| Unitário | `definitions.ts`: limites de cada regra, conversões de % e R$, máscara da chave Pix; `publicSettings` sem `pix` (CFG-FR-004, 005, SEC-004) |
| Integração (PGlite + provedor falso) | `getSettings`: valores provisórios e vigência por data (FR-003, 009); `updateSettings`: grava só o que mudou, transação, valor inválido, Pix com senha certa ou errada e bloqueio (FR-002, 004, 008, SEC-005); `settingHistory` (FR-006); admin × suporte × lojista (SEC-001, 002); `UPDATE`/`DELETE` recusados pelo gatilho (SEC-003); `changePassword`: certo, senha atual errada com bloqueio, validação e encerramento dos outros aparelhos (FR-010, SEC-006) |
| e2e (staging, 390 px) | admin muda a tolerância e vê o valor novo e o histórico; suporte vê sem "Salvar"; lojista vê "Sem permissão"; troca de chave Pix com senha; `/recuperar` com o WhatsApp das regras; troca de senha com e sem acerto; acessibilidade das 3 telas (FR-001, 002, 006, 007, 008, 010, NFR-002, SEC-001, 002) |

O `pnpm e2e:seed` também precisa voltar as regras do staging aos valores provisórios. Como a tabela é só de inserção, ele insere de novo os valores provisórios como alterações novas.

## Riscos e alternativas descartadas
- **`settings` com 1 linha e colunas fixas (ARCHITECTURE §4)** → descartado: não guarda histórico nem "valor em uma data" (FR-006, FR-009), e cada regra nova exigiria migration. O custo é perder o tipo de cada regra no banco (`jsonb`); a compensação é que `definitions.ts` valida na escrita e na leitura.
- **Histórico só no `activity_log`** → descartado: o `activity_log` é genérico e não serve para responder, de forma confiável, "qual taxa valia em 10/03".
- **Porcentagem em `numeric` / decimal** → descartado: inteiros (centésimos de ponto) evitam erro de arredondamento e seguem a regra do dinheiro em centavos.
- **Confirmar a senha com `signInWithPassword` no cliente com cookies** → descartado: trocaria a sessão do admin. Usamos um cliente sem cookie, que encerra a sessão de conferência em seguida.
- **Cache:** com `'use cache'` em memória, cada instância serverless tem a sua cópia. O `revalidate: 60` limita o atraso a 1 min, que é o que a NFR permite. Cache remoto (`use cache: remote`) tem custo de plataforma, então foi descartado.
- **Risco:** o gatilho `before update or delete` também bloqueia uma correção manual legítima. Uma correção é, então, uma inserção nova (o que preserva o histórico). Apagar exige desligar o gatilho numa migration, de forma explícita.

## Decisões (aprovadas pelo dono em 2026-10-23)
- **D1.** `setting_values` só de inserção no lugar da tabela `settings` de 1 linha: ADR 0010, ARCHITECTURE §4 e termo "Vigência" no GLOSSARY.
- **D2.** Limites da tabela acima aprovados; os 30% e os 3 meses do Caju Indica seguem editáveis dentro da faixa; resgate mínimo continua R$ 50.
- **D3.** `SUPPORT_WHATSAPP` sai do `.env.example`, do DEPLOYMENT e da Vercel (o dono apaga na Vercel quando a task avisar).
- **D4.** Troca de senha em `/conta/senha`, comum a todos os papéis.

## Conformidade (SDD §6.3)
- [x] Todo requisito da spec aparece no mapa requisito → solução (10 FR, 2 NFR, 6 SEC)
- [x] Actions seguem o `API.md` §2: schema por regra; sessão; sem id de recurso (a regra é validada contra a lista fechada); saída explícita (`publicSettings`, histórico montado à mão); salvar o mesmo valor não cria linha (idempotente); transação em mais de uma linha
- [x] Toda action com id checa a posse: não há recurso de loja ou de usuário por id. A troca de senha é só da própria conta (`userId` da sessão)
- [x] Schemas de entrada não aceitam campos privilegiados (`changed_by`, `valid_from` e conta-alvo vêm do servidor)
- [x] Dados pessoais novos estão na tabela do `SECURITY.md` §8: chave Pix e favorecido da CajuGo incluídos (admin, suporte e telas de pagamento logadas; nunca em página pública nem em log)
- [x] Formulário público com honeypot + rate limit: não há formulário público novo. Troca de senha e confirmação da chave Pix usam o bloqueio de login
- [x] Consultas novas têm índice previsto: `(key, valid_from desc)`
- [x] Migrations aditivas (tabela nova)
- [x] Nada do Supabase além de Postgres e Auth (`verifyPassword` usa o Auth)
