# Deploy

## Ambientes
| Ambiente | Web | Banco + Auth | Cloudinary |
|---|---|---|---|
| Local | `next dev` | projeto Supabase `cajugo-staging` (banco + Auth); testes usam PGlite em memória | pasta `staging/` |
| Preview (cada PR) | Vercel, protegido por senha | `cajugo-staging` | pasta `staging/` |
| Produção | Vercel, branch `main` | `cajugo-prod` | pasta `prod/` |

Os dois projetos Supabase no plano Free, região **São Paulo**. Functions da Vercel na região `gru1` (São Paulo), perto do banco.

## Variáveis de ambiente (Vercel, por ambiente; todas só no servidor)
| Nome | Uso |
|---|---|
| `DATABASE_URL` | pooler do Supabase em modo transação (porta 6543), usuário `app_user` |
| `DATABASE_URL_MIGRATIONS` | conexão direta, usuário de migrations (só na sua máquina, no `.env` local; não vai para a Vercel) |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | cliente de Auth no servidor |
| `SUPABASE_SERVICE_ROLE_KEY` | ações administrativas do Auth (criar conta, senha temporária) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | assinatura de upload |
| `CRON_SECRET` | protege `/api/v1/cron/*` |
| `PAYMENT_*`, `MAIL_*` | quando gateway e e-mail forem escolhidos |
| `APP_URL` | links em e-mails e WhatsApp |

`.env.example` no repositório só com os nomes.

### Onde ficam os segredos
- **Na sua máquina:** `.env.local` na raiz (no `.gitignore`, permissão `600`). Contém a senha do banco do `cajugo-staging` e, depois, as URLs de conexão e as chaves. Copie o modelo do `.env.example`.
- **Cópia de segurança:** num gerenciador de senhas (ex.: Bitwarden, gratuito). Se o `.env.local` se perder, é de lá que você recupera.
- **Na Vercel:** variáveis de ambiente do projeto, por ambiente.
- **Nunca** em documentação, issue, commit ou chat: o repositório é público.

## Ordem do deploy
Sem GitHub Actions: as verificações rodam na sua máquina.
1. A cada commit, o Husky roda `pnpm check` (lint, tipos, formatação, testes) e bloqueia se falhar (`TESTING.md`).
2. Se houver migration nova: rode as **migrations do Drizzle** contra staging e, antes do merge em `main`, contra produção (`DATABASE_URL_MIGRATIONS`).
3. Push → a Vercel faz o build e o deploy (Preview nos branches, Produção na `main`). Build quebrado não vai ao ar.

Migrations sempre aditivas; remover ou renomear coluna exige duas etapas (adiciona → migra o código → remove depois).

## Planos e custos
- **Vercel Hobby:** gratuito, mas proíbe uso comercial. Antes de cobrar lojistas: Vercel Pro (US$ 20/mês) ou migração do Next para uma VPS.
- **Supabase Free:** pausa após 7 dias sem atividade (relevante para staging). O Pro (US$ 25/mês) inclui backup diário; avalie quando houver lojistas pagando.
- **Cloudinary Free:** acompanhe os créditos mensais.
- **Domínio** `cajugo.com.br`: registro.br, DNS para a Vercel.

## Saída da Vercel (futuro)
O Next roda em qualquer Node: `output: 'standalone'` no `next.config` desde o início; o Dockerfile é escrito quando a migração for decidida. O cron da Vercel vira um cron do servidor chamando a mesma rota. O banco continua no Supabase; só muda onde o Next roda.

## Checklist de produção
- [ ] Data API do Supabase desligada; RLS ligado em todas as tabelas sem policy; `app_user` criado (`SECURITY.md` §4)
- [ ] Confirmação de e-mail desligada no Supabase Auth (MVP sem e-mails do Auth)
- [ ] URL do site e redirect URLs configuradas no Supabase Auth
- [ ] Upload sem assinatura **desligado** no Cloudinary
- [ ] Deployment Protection ligado nos Previews
- [ ] MFA em Supabase, Vercel, Cloudinary, gateway e GitHub
