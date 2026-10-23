# Deploy

## Ambientes
| Ambiente | Web | Banco + Auth | Cloudinary |
|---|---|---|---|
| Local | `next dev` | projeto Supabase `cajugo-staging` (banco + Auth); testes usam PGlite em memória | pasta `staging/` |
| Preview (cada PR) | Vercel, protegido por senha | `cajugo-staging` | pasta `staging/` |
| Produção | Vercel, branch `main` | `cajugo-prod` | pasta `prod/` |

Os dois projetos Supabase no plano Free, região **São Paulo**. Functions da Vercel na região `gru1` (São Paulo), perto do banco.

## Contas dos serviços
Quem é dono de cada conta. Nenhuma senha ou chave aqui (`.env.local` e gerenciador de senhas).

| Serviço | Conta | Identificação (não é segredo) |
|---|---|---|
| GitHub | `chutzpah-os` | repositório público `chutzpah-os/cajugo` |
| Supabase | organização `CajuGo` (Free) | projeto `cajugo-staging`, ref `yrjodykcnjotauyenpbu`, região `sa-east-1` (São Paulo) |
| Cloudinary | `victorhanielbusiness@gmail.com` (Free) | cloud name `zr1zxzni` |
| Vercel | `victorhanielbusiness-8743's projects` (Hobby) | projeto `cajugo`, importado de `chutzpah-os/cajugo` (branch `main`), funções em `gru1`; produção em **https://cajugo.vercel.app** |

## Variáveis de ambiente (Vercel, por ambiente; todas só no servidor)
| Nome | Uso |
|---|---|
| `DATABASE_URL` | pooler do Supabase em modo transação (porta 6543), usuário `postgres` (MVP; ver `SECURITY.md` §4) |
| `DATABASE_URL_MIGRATIONS` | pooler em modo sessão (porta 5432), usuário `postgres` (só no `.env.local`; não vai para a Vercel) |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | cliente de Auth no servidor (chave `sb_publishable_…`) |
| `SUPABASE_SECRET_KEY` | ações administrativas do Auth: criar conta, senha temporária (chave `sb_secret_…`) |
| `SUPPORT_WHATSAPP` | WhatsApp de atendimento (temporária, até a spec 002) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | assinatura de upload |
| `CRON_SECRET` | protege `/api/v1/cron/*` |
| `HASH_SECRET` | segredo do hash de IP (rate limit, denúncias); `openssl rand -hex 32` |
| `PAYMENT_*` | fase 2, com o gateway (MVP: pagamento manual, sem variável) |
| `MAIL_*` | quando o e-mail transacional for escolhido |
| `APP_URL` | links em e-mails e WhatsApp |
| `ENABLE_EXPERIMENTAL_COREPACK=1` | só na Vercel: faz o build usar o pnpm fixado em `packageManager` (12.x) |

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
- **Domínio** `cajugo.com.br`: registro.br (~R$ 40/ano); quanto antes, melhor para o SEO (`SEO.md` §3). Basta apontar o domínio para a Vercel (sem curinga: lojas ficam em `/loja/{slug}`, ADR 0009), trocar `APP_URL` e redirecionar `cajugo.vercel.app` com 301. Até lá, tudo roda em `cajugo.vercel.app` (PRD §1.7).

## Saída da Vercel (futuro)
O Next roda em qualquer Node: `output: 'standalone'` no `next.config` desde o início; o Dockerfile é escrito quando a migração for decidida. O cron da Vercel vira um cron do servidor chamando a mesma rota. O banco continua no Supabase; só muda onde o Next roda.

## Checklist de produção
- [ ] Data API do Supabase desligada; RLS ligado em todas as tabelas sem policy (`SECURITY.md` §4)
- [ ] Confirmação de e-mail desligada no Supabase Auth (MVP sem e-mails do Auth)
- [ ] URL do site e redirect URLs configuradas no Supabase Auth
- [ ] Upload sem assinatura **desligado** no Cloudinary
- [ ] Cloudinary → Settings → Security: liberar a entrega de PDF (contas Free bloqueiam por padrão), necessária para o admin ver comprovantes em PDF por URL assinada
- [x] Deployment Protection ligado nos Previews (Vercel Authentication, Standard Protection: prévias exigem login na Vercel; produção é pública)
- [ ] MFA em Supabase, Vercel, Cloudinary, gateway e GitHub
- [ ] Google Search Console e Bing Webmaster verificados, com o sitemap enviado (`SEO.md` §4)
