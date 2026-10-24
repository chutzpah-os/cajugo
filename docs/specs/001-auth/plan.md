---
spec: 001
status: approved
---

# Plano · 001 Contas, papéis e login

## Resumo técnico
Login por e-mail e senha no **Supabase Auth**, chamado só no servidor por Server Actions (`@supabase/ssr` com cookies `HttpOnly`). Um domínio `auth` concentra as regras (papéis, painel inicial, bloqueio, senha temporária, inatividade) atrás de uma interface pequena; o Supabase fica atrás de um adaptador para os testes rodarem com PGlite e um provedor falso. O `proxy.ts` só renova a sessão e manda para o login quem não tem cookie (checagem otimista); papel, loja e senha temporária são checados no servidor, perto dos dados. `profiles.role` vira `roles[]`.

## Impacto
| Camada | Mudança |
|---|---|
| Banco | migration `0002`: novos valores em `user_role`; `profiles.roles`, `last_panel`, `last_seen_at`, `temp_password_expires_at`; enum `store_status` e `stores.status`; cópia `role → roles`. Migration `0003` (última task): remove `profiles.role`. |
| Domínio | `src/domains/auth/` (service, actions, schemas, testes); `src/platform/http/session.ts` passa a usar `roles` + papel ativo. |
| Plataforma | `src/platform/supabase/` (cliente de servidor + adaptador); `src/platform/http/safe-next.ts`. |
| Rotas | `src/proxy.ts`; `/entrar` [9f], `/recuperar` [6b], `/nova-senha`; telas provisórias de destino (ver "Telas provisórias"). |
| Script | `scripts/create-admin.ts` → `pnpm admin:create <email>`. |
| Jobs | nenhum |
| Mobile | nada agora; actions não dependem de tela |

## Dependências novas (preciso de aprovação)
| Pacote | Por quê | Alternativa descartada |
|---|---|---|
| `@supabase/ssr` + `@supabase/supabase-js` | cliente oficial do Supabase Auth com cookies no servidor (ADR 0002) | chamar a API REST do Auth à mão (mais código e risco) |
| `@playwright/test` (dev) | e2e de login, redirecionamentos e nova senha (D3 aprovada) | — |
| `server-only` (se o Next não resolver sozinho) | impede importar o domínio `auth` no navegador | — |

`supabase-js` só é importado em `src/platform/supabase/` e só no servidor (regra do `CLAUDE.md`).

## Arquitetura do domínio `auth`
Interface pública (`src/domains/auth/service.ts`), o resto é interno:
- `signIn(input, ctx)` → `{ ok, redirectTo }` | erro genérico | bloqueio
- `signOut(ctx)` · `switchPanel(session, role)` · `updatePassword(session, password)`
- `setTemporaryPassword(adminSession, targetUserId)` → senha (mostrada uma vez)
- `getSession()` → `Session | null` (lê o Supabase + `profiles`; aplica inatividade e expiração)
- `landingFor(session, store)` → caminho do painel (função pura: FR-006/008/009/010/015)

Adaptador `AuthProvider` (Supabase real × falso nos testes): `signInWithPassword`, `getUser`, `signOut(scope)`, `adminUpdatePassword`, `adminCreateUser`.

## Mapa requisito → solução
| Requisito | Solução |
|---|---|
| AUT-FR-001 | Action `signIn` valida com zod, chama `signInWithPassword`; sucesso grava cookies e redireciona por `landingFor` |
| AUT-FR-002 | Qualquer falha (e-mail inexistente, senha errada, senha temporária expirada, bloqueio por e-mail sem revelar) vira o mesmo erro "E-mail ou senha incorretos"; mensagem de bloqueio só fala em "aguarde" |
| AUT-FR-003 | Janela deslizante sobre `rate_limits` (um registro por falha): por rede, 5 **falhas** no último minuto recusam novas tentativas; por e-mail, a 5ª falha nos últimos 15 min grava um bloqueio que vale 15 min a partir dela. Login certo não conta. Nunca permanente |
| AUT-FR-004 | Cookies de sessão com `maxAge` de 30 dias, renovados a cada requisição no `proxy.ts` (janela deslizante). No servidor, `getSession` compara `profiles.last_seen_at`: > 30 dias (ou > 1 dia para admin/suporte) → encerra a sessão. `last_seen_at` é atualizado no máximo 1×/hora |
| AUT-FR-005 | Action `signOut` (escopo do aparelho) + limpa cookies → vitrine |
| AUT-FR-006 | `landingFor`: `profiles.last_panel` (gravado na troca de painel e ao abrir uma área, `rememberPanel`) se a conta ainda tem esse papel; senão a ordem lojista → vendedor → indicador; admin/suporte → `/admin` |
| AUT-FR-007 | Action `switchPanel(role)` só aceita papel presente em `roles`; grava `last_panel` |
| AUT-FR-008 | `landingFor` com `stores.status` `registered` → `/lojistas/pagamento` [5d]; `payment_review` → `/painel/pagamento` [10a] |
| AUT-FR-009 | `suspended` → painel normal + alerta [12f] (componente provisório; a tela completa vem na 011) |
| AUT-FR-010 | `canceled`/`archived` → só `/painel/conta`; layout do painel do lojista bloqueia o resto |
| AUT-FR-011 | `proxy.ts`: sem cookie de sessão em `/painel`, `/rede`, `/indica`, `/admin` → `/entrar?next=<caminho>`; após login, `safeNext` |
| AUT-FR-012 | Layout de cada área chama `authorize(session, papéisDaÁrea)`; 403 vira a tela "Sem permissão" |
| AUT-FR-013 | `/recuperar` [6b] com texto e botão `wa.me/{whatsapp}?text=...`; o número vem de `SUPPORT_WHATSAPP` (env) até a spec 002 mover para `settings` |
| AUT-FR-014 | `setTemporaryPassword`: só `admin`; gera 12+ caracteres aleatórios (crypto), `adminUpdatePassword`, `must_change_password = true`, `temp_password_expires_at = now + 24 h`, `activity_log` (perfil e auditoria numa transação); encerra todas as sessões da conta (`adminSignOutAll`); devolve a senha uma vez (nunca gravada em claro). No login, temporária vencida → `signOut` + erro genérico |
| AUT-FR-015 | `getSession` marca `mustChangePassword`; `authorize` recusa tudo com `must-change-password`, e os layouts redirecionam para `/nova-senha`. `updatePassword` (só com `mustChangePassword`; `/nova-senha` manda os demais ao painel): zod (≥ 8, confirmação igual), atualiza a senha, zera a flag e a expiração, `signOut('others')` |
| AUT-FR-016 | `landingFor`: `store_staff` com loja `registered`, `payment_review`, `canceled` ou `archived` → `/painel/loja-indisponivel`; o layout do painel bloqueia o resto |
| AUT-NFR-001 | Uma ida ao Supabase + uma consulta de `profiles`/`stores` por login; região `gru1` + banco em São Paulo |
| AUT-NFR-002 | Telas com os componentes de `src/ui` (alvos ≥ 44 px, `TextField` com rótulo) |
| AUT-SEC-001 | Toda consulta de painel filtra pelo `userId`/`storeId` da sessão; teste "usuário B" em cada action desta spec |
| AUT-SEC-002 | Nenhum schema de entrada aceita `roles`, `storeId` ou `last_panel` livre; `switchPanel` valida contra `roles`; papéis só mudam por cadastro (specs 003/008/010) ou admin |
| AUT-SEC-003 | Senha nunca vai para `activity_log`, logger (redação já cobre `pass`) ou mensagem; a temporária só no retorno da action do admin |
| AUT-SEC-004 | `setTemporaryPassword` exige `authorize(['admin'])`; grava `activity_log` (`auth.temp_password_set`, ator, alvo, quando) |
| AUT-SEC-005 | `safeNext`: aceita só caminho relativo começando com `/` e sem `//` ou `\`; senão, painel padrão |
| AUT-SEC-006 | Cookies do Supabase com `HttpOnly; Secure; SameSite=Lax; Path=/`; o navegador não carrega o SDK do Supabase |
| AUT-SEC-007 | Áreas do lojista divididas: `store_owner` acessa tudo; `store_staff` só veículos, leads e confirmar venda (lista de rotas e actions por papel no domínio `auth`) |
| AUT-SEC-008 | No admin, ações sensíveis exigem `admin`; leitura aceita `admin` e `support`; moderação (aprovar veículo, denúncias) aceita os dois. Botões de ação não aparecem para suporte |
| AUT-SEC-009 | Cadastros públicos nunca atribuem `admin`/`support` (validação + teste); `pnpm admin:create` usa a chave secreta do Supabase, só na máquina do dono; contas da equipe recusam papéis de lojista/vendedor/indicador (`grantRole` + `CHECK` no banco, migration `0004`) |

## Modelo de dados (migration `0002`, aditiva)
```sql
alter type user_role add value 'store_staff';
alter type user_role add value 'seller';
alter type user_role add value 'referrer';
create type store_status as enum ('registered','payment_review','active','past_due','suspended','cancel_scheduled','canceled','archived');

alter table profiles add column roles user_role[] not null default '{}';
alter table profiles add column last_panel user_role;
alter table profiles add column last_seen_at timestamptz;
alter table profiles add column temp_password_expires_at timestamptz;
update profiles set roles = array[role];
alter table profiles alter column role drop not null;   -- removida na 0003

alter table stores add column status store_status not null default 'registered';
```
Migration `0003` (última task, depois que nenhum código lê `role`): `alter table profiles drop column role;`. Hoje o staging não tem perfis reais, então o risco é nulo.

## Telas provisórias (até as specs donas)
Para os redirecionamentos serem testáveis de ponta a ponta, esta spec cria páginas mínimas protegidas por papel, com o título e um aviso "em construção": `/painel/veiculos`, `/painel/conta`, `/painel/pagamento`, `/painel/loja-indisponivel`, `/lojistas/pagamento`, `/rede`, `/indica`, `/admin`. Cada uma é substituída pela spec dona (003–012). O admin ganha uma tela provisória **"Senha temporária"** (busca por e-mail + botão) até o detalhe da loja [6g] chegar na 012.

## Variáveis de ambiente novas
- `SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SECRET_KEY` (o Supabase renomeou `anon` e `service_role`). Substituem `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` em `.env.example` e `DEPLOYMENT.md`.
- `SUPPORT_WHATSAPP` (temporária, até a spec 002).

## Estratégia de testes
| Tipo | O que cobre |
|---|---|
| Unitário | `landingFor` (todos os papéis e status de loja), `safeNext`, regra de inatividade, gerador de senha temporária |
| Integração (PGlite + `AuthProvider` falso) | `signIn` (sucesso, erro genérico, bloqueio por e-mail, bloqueio por IP, temporária vencida), `switchPanel`, `setTemporaryPassword` (admin vs. suporte vs. lojista, auditoria sem senha), `updatePassword` (validação, encerra outras sessões), migration `0002` (cópia de `role`), cadastros públicos nunca criam admin |
| e2e (Playwright, Supabase de staging) | login → painel; visitante → `/painel/leads` → login → volta; indicador → `/admin` = sem permissão; senha temporária → nova senha obrigatória |

Cada teste leva o ID do requisito (`it('[AUT-FR-003] ...')`).

## Riscos e alternativas descartadas
- **Validade da sessão no Supabase Free:** o "inactivity timeout" do Supabase é do plano Pro; por isso a regra fica no nosso código (`maxAge` deslizante + `last_seen_at`).
- **Checar papel no `proxy.ts`:** descartado; o guia do Next pede só checagem otimista no proxy (sem banco). Papel e loja são checados nos layouts e em cada action.
- **Sessão própria (iron-session) em vez do Supabase Auth:** descartado; o ADR 0002 escolheu o Supabase Auth.
- **Cache Components:** páginas que leem a sessão ficam atrás de `<Suspense>` (exigência do Next 16 com `cacheComponents`).

## Decisões (aprovadas em 2026-10-23)
1. Dependências da tabela acima: aprovadas.
2. Tela provisória de senha temporária no admin: aprovada.
3. `SUPPORT_WHATSAPP` temporária até a spec 002: aprovada; número principal no `.env.local` (há um segundo atendente, a decidir na 002 se aparece também).
4. `SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SECRET_KEY` no `.env.local`: feito e testado.

## Conformidade (SDD §6.3)
- [x] Todo requisito da spec aparece no mapa requisito → solução (15 FR, 2 NFR, 9 SEC)
- [x] Actions seguem o `API.md` §2 (zod, sessão, posse, saída explícita); `signIn` não precisa de idempotência (sem efeito duplicável além do contador)
- [x] Toda action com id checa posse/papel (`switchPanel`, `setTemporaryPassword`)
- [x] Schemas de entrada sem campos privilegiados (`roles`, `storeId`, `last_panel`)
- [x] Dados pessoais novos: nenhum além de e-mail/senha já tratados no `SECURITY.md` §8
- [x] Formulários públicos: login com rate limit por IP e por e-mail (honeypot não se aplica ao login, conforme `SECURITY.md` §6)
- [x] Consultas novas com índice: `profiles(id)` (pk); `rate_limits` (pk)
- [x] Migrations aditivas; a remoção de `role` é a segunda etapa, depois do código migrado
- [x] Nada do Supabase além de Postgres e Auth
