# Plano do CajuGo (MVP)

> Ordem de construção do MVP. Cada bloco numerado é uma **spec** (`SDD.md`): passa por `/spec → /clarify → /plan → /tasks → /implement → /verify`. As tarefas abaixo são o roteiro de alto nível; o `tasks.md` de cada spec detalha.

## Estratégia
1. **Lançamento completo:** Catálogo, vitrine, Pix manual, **Rede Caju e Caju Indica** ficam prontos juntos no lançamento do MVP (PRD v2 §3.1).
2. **Pix manual com comprovante** (PRD §5.6): sem gateway e sem taxa por cobrança. Gateway (Stripe ou outro) é fase 2.
3. **Uma fatia vertical por spec:** dados + servidor + tela + testes.
4. **Custo zero** até ter cliente pagando: Vercel Hobby, Supabase Free, Cloudinary Free; login só com e-mail e senha; avisos pelo painel + botões `wa.me` (sem SMS, WhatsApp automático ou e-mail obrigatório).

## Decisões pendentes (preciso de você)
| # | Decisão | Quando é necessária | Sugestão |
|---|---|---|---|
| D1 | Gerenciador de pacotes | Fase 0 | ✅ **pnpm** |
| D2 | Lint/format | Fase 0 | ✅ **ESLint + Prettier** |
| D3 | Testes | Fase 0 | ✅ **Vitest** (serviços contra PGlite, sem Docker) + **Playwright** (e2e) |
| D4 | Validação de schema | Fase 0 | ✅ **zod** |
| D5 | CSS / componentes | Fase 0 | ✅ **Tailwind** com os tokens do `DESIGN.md` |
| D6 | Fonte da FIPE | spec 005 | API pública gratuita da FIPE (parallelum) com cache no banco; ou lista manual |
| D7 | E-mail transacional | **fase 2** (opcional antes) | Resend (plano gratuito); no MVP os avisos são no painel + `wa.me` |
| D8 | Gateway de pagamento | **fase 2** | Stripe ou outro; MVP usa pagamento manual |
| D9 | Pendências do PRD §12.1 | antes de cada spec afetada | — |

---

## Fase 0 — Fundação (sem spec, é infraestrutura)
- [x] **F01** Decidir D1–D5.
- [x] **F02a** `CLAUDE.md` na raiz do repositório e `.claude/settings.json` com as regras de `deny`.
- [x] **F02b** `git init` e `.gitignore` (com `.env*`, `node_modules`, `.next`).
- [x] **F03** Definir a estrutura de pastas e registrá-la em `ARCHITECTURE.md` §3 e no `CLAUDE.md`.
- [x] **F04** Criar o app Next.js (TypeScript, App Router) e os comandos `dev`, `lint`, `typecheck`, `test`; registrar em `CLAUDE.md` › Comandos.
- [x] **F05** Criar os projetos Supabase `cajugo-staging` e `cajugo-prod` (Free, região São Paulo): desligar Data API, Auth com e-mail/senha e templates em pt-BR (`SECURITY.md` §3–4).
  - Feito: `cajugo-staging` (Free, São Paulo, Postgres 17), Data API desligada, RLS automático, Confirm email desligado, senha mínima 8, conexões pelo pooler no `.env.local` testadas; migration `0000_init` aplicada (tabelas com RLS, 0 policies). Decidido: o app usa o usuário `postgres` no MVP; `app_user` na fase 2 (`SECURITY.md` §4). `cajugo-prod` fica para o lançamento.
- [x] **F06** Drizzle + Drizzle Kit (postgres.js no runtime, pooler sem prepared statements), primeira migration (`profiles`, `stores`, RLS ligado sem policy) e testes de integração com **PGlite** (Postgres em memória, sem Docker).
- [x] **F07** Conta Cloudinary; desligar upload sem assinatura; pastas `staging/` e `prod/`.
  - Feito: conta Free (`victorhanielbusiness@gmail.com`, cloud name `zr1zxzni`), chaves no `.env.local`, conexão testada; único preset (`ml_default`) é assinado.
- [x] **F08** Projeto na Vercel ligado ao GitHub; variáveis de ambiente (`DEPLOYMENT.md`); Preview protegido.
  - Feito: projeto `cajugo` na Vercel (Hobby), deploy automático a cada push na `main`, região `gru1`, `ENABLE_EXPERIMENTAL_COREPACK=1`. Variáveis do banco, Cloudinary e `HASH_SECRET` entram na spec 001. Produção: https://cajugo.vercel.app; prévias protegidas (Vercel Authentication).
- [~] **F09** Tokens de design (cores, tipografia Archivo/JetBrains Mono, raios) e componentes base do `DESIGN.md` §3: botão, input, chip, selo, toggle, segmentado, bottom sheet, nav inferior, cabeçalho escuro/claro, estado vazio, skeleton, toast.
  - Feito: tokens no Tailwind, fontes Archivo/JetBrains Mono, `src/ui/` (Logo, Button, Badge, Chip, TextField, Toggle, YesNo, EmptyState, Skeleton) com testes de acessibilidade; vitrine em `/dev/ui` (só em desenvolvimento). Falta, junto com as telas que usam: bottom sheet, nav inferior, cabeçalhos, toast, slider, opção de rádio.
- [x] **F10** Infra de servidor comum: `requireSession`, helper de erro (problem+json / `{ ok:false, errors }`), rate limit por IP (`rate_limits`), honeypot, `activity_log`, logger JSON.
  - Em `src/platform/http/`: `AppError` + problem+json + `ActionResult`, `authorize`/`authorizeStore`, `consumeRateLimit` (tabela `rate_limits`), `clientIp`/`hashIp`, honeypot (+ `HoneypotField` em `src/ui`), `logActivity` (tabela `activity_log`), `logger` com redação de dados pessoais. A leitura da sessão do Supabase Auth fica para a spec 001.
- [x] **F11** Verificação local única (`pnpm check`) rodada pelo Husky no pre-commit (`docs/TESTING.md`); comandos de migration. Sem GitHub Actions.
- [ ] **F12** Script de seed com lojas e veículos de exemplo (fotos de `design/carexamplesimages/`).
- [x] **F13** Criar as skills de processo SDD (`/spec`, `/clarify`, `/plan`, `/tasks`, `/implement`, `/verify`) a partir do `SDD.md` §12.

**Pronto quando:** `dev` sobe, o deploy de preview funciona, a tela de componentes base renderiza e o `pnpm check` passa.

---

> Specs grandes podem ser divididas no `/spec` (limite do `SDD.md` §3.2: 15 FR / 25 tasks). Todas ficam prontas antes do lançamento (013).

## 001 · Contas, papéis e login — telas 9f (e-mail e senha), 6b (manual), nova senha
- Login com Supabase Auth via Server Action → cookies httpOnly; `proxy.ts` renova a sessão.
- **Conta com vários papéis:** `profiles.role` vira `roles[]` (migration aditiva + cópia); `Session` e `authorize` passam a usar `roles` + papel ativo; `switchRole`.
- Redirecionamento pós-login por papel e status da loja (PRD [9f]); primeiro admin criado por script.
- Recuperar senha **manual** [6b]; senha temporária (script até a spec 012); troca obrigatória na tela "Nova senha".
- Logout; proteção de `/painel/*`, `/rede/*`, `/indica/*` e `/admin/*` no servidor.
- **Testes-chave:** usuário B não acessa dados de A; papel errado → 403; lojista não acessa `/admin`.

## 002 · Regras configuráveis — tabela `settings`, telas 4c (parte de regras), 8f (parte numérica)
- Tabela `settings` (PRD §5.14) com valores provisórios; leitura com cache curto; edição pelo admin com auditoria.
- Base para todas as specs seguintes (nada de número fixo no código).

## 003 · Cadastro do lojista, Minha loja e menu — telas 11a, 5b, 5c (+ código 8d), 3b
- Menu da home [11a] e landing [5b].
- Cadastro: loja + responsável, slug `[a-z0-9-]` (loja em `/loja/{slug}`), código Caju Indica opcional (validado, bloqueia autoindicação); loja nasce `registered`.
- Minha loja: dados públicos, horário, logo e capa (Cloudinary), link + QR code pela função única de URL, divulgar por padrão, troca de slug com redirecionamento.

## 004 · Pix manual e ativação — telas 5d, 6c, 10a, 10b, 12e, 5e, 6g (registro manual)
- [5d] só Pix → [6c] chave + **QR estático** + upload **privado** do comprovante (imagem/PDF) → [10a] "em análise" (rascunhos liberados).
- Admin [10b]: fila com alerta de valor divergente, **Confirmar** (ativa a loja, próximo vencimento, `wa.me`) / **Recusar** com motivo → [12e].
- Registro manual sem comprovante (exceção) em [6g]; onboarding [5e].

## 005 · Veículos do lojista e aprovação prévia — telas 1c, 2a, 6e, 6f, 14c
- Formulário [2a] com autosave; fotos (até 20, upload assinado); FIPE (D6).
- Estados: rascunho → (pendente de aprovação) → publicado ⇄ oculto → vendido (desfazer 7 dias) → excluído.
- Divulgar na CajuGo; histórico de preço; lista com KPIs, busca e filtros; resumo [6e].
- Aprovação prévia [14c]: checagens automáticas (fotos ≥ mínimo, preço vs. FIPE, placa/chassi), aprovar / pedir ajuste.
- **F12** (dados de exemplo) entra aqui.

## 006 · Vitrine e comprador — telas 1a, 1b, 6d, 9a, 12a–12d, 12g, 14a, 14b, 15a
- Vitrine e catálogo da loja (mesmo layout), busca full-text, filtros, ordenação, cursor; view `showcase_vehicles`; ISR + `revalidateTag`.
- Página do veículo; guarda `?ref=` do vendedor; [12d] para vendido/oculto; [12g] para loja suspensa.
- Simulador [14b] (Price, valores de `settings`); favoritos [14a] com selos; busca sem resultado + alerta [12a]; banner Caju Indica [9a].
- Estados [12b, 12c]; desktop [15a].
- **SEO completo (`SEO.md`)**: funções de título/descrição/canônica/JSON-LD/Open Graph em `src/platform/seo/`, sitemap índice, `robots.txt`, **páginas de descoberta** por marca, modelo e cidade, links internos. Pode virar spec própria no `/spec` se passar do limite.

## 007 · Leads e denúncias — telas 1b (formulário/WhatsApp), 3a, 14d, 14e
- Formulário com honeypot + rate limit; clique no WhatsApp gera lead; origem cajugo / catálogo / vendedor.
- Tela Leads com status, origem "via vendedor {nome}", destaque de novos; métricas do veículo.
- Denunciar anúncio [14d] (anônimo, rate limit) e fila do admin [14e] (manter / ocultar com motivo).

## 008 · Rede Caju: vendedor — telas 7a, 7b, 7c, 7d, 13c, 7h
- Cadastro do vendedor (CPF, chave Pix, documentos privados) → em análise → admin aprova/bloqueia [7h].
- Painel, vitrine com "Você ganha R$ X", link `?ref=`, pedir parceria; extrato com "Recebi"; conta.

## 009 · Rede Caju: lojista e venda — telas 7e, 7f, 7g, 13a, 13b, 13d
- Comissão da loja (% ou fixo, ajuste por veículo); aceitar vendedores.
- Parcerias (aprovar, recusar, convidar, encerrar); vendedores disponíveis e perfil; avaliar; denunciar vendedor.
- **Confirmar venda** [7g]: atribuição, valor final, comissão (A receber/Paga), **taxa CajuGo** registrada para a próxima fatura; veículo sai de todos os lugares.

## 010 · Caju Indica — telas 8a–8g, 9b, 9d, 9e
- Código/link pessoal, landing [8c], aplicação no cadastro (vem da 003), indicações e status.
- Recompensas creditadas na confirmação do pagamento da indicada (até 3 meses, pausa em atraso); crédito do lojista; saldo e resgate Pix ≥ mínimo; admin marca Pix pago; regras e links de campanha [8f].
- Antifraude: autoindicação, CPF único por resgate.

## 011 · Fatura, atraso, suspensão e cancelamento — telas 10c, 12f, 12g, 12h, 4b, 3c
- Fatura mensal = mensalidade + taxas Rede Caju − crédito Caju Indica; pagamento pela mesma fila de comprovantes (004).
- Jobs diários: vencimentos em 3 dias (lista + `wa.me`), `past_due`, suspensão após tolerância, reativação na confirmação, cancelamento no fim do período, arquivamento após retenção, liberação de slug.
- Cancelar [12h] com desfazer; Assinaturas do admin [4b]; Conta do lojista [3c].

## 012 · Admin: painel, lojas e equipe — telas 4a, 1d, 6g, 4c, 15b, 15c
- Painel com KPIs e "Precisa de atenção" (comprovantes, vencimentos, atrasos, vendedores em análise, aprovações, denúncias, resgates, alertas de busca).
- Lojas, usuários, detalhe da loja (senha temporária, suspender/reativar), equipe CajuGo, logs de atividade.
- Desktop: painel do lojista [15b] e admin [15c] com sidebar e filas inline.

## 013 · Lançamento — tela 12i
- Termos e privacidade [12i] (rascunho para revisão jurídica): Rede Caju, Caju Indica, LGPD, encarregado.
- Valores definitivos de `settings` (chave Pix etc.); projeto `cajugo-prod` no Supabase; checklist de produção do `DEPLOYMENT.md`.
- Revisão de segurança (`SECURITY.md` §12) e acessibilidade (`DESIGN.md` §7); performance (LCP < 2,5 s em 4G).
- **Auditoria de SEO** de todas as páginas públicas; Google Search Console e Bing Webmaster com sitemap enviado.
- Decidir: Vercel Pro ou migração para VPS antes de cobrar; fase 2 dos endereços (PRD §1.7) quando houver domínio.
- Trocar as credenciais que apareceram no chat durante o setup: senha do banco do `cajugo-staging`, a API Key Root do Cloudinary e a secret key do Supabase (`sb_secret_…`). Adiado por decisão do dono em 2026-10-23.

---

## Fase 2 (depois do MVP)
Cobrança automática com gateway (Stripe ou outro): Pix automático, cartão, webhooks, recibos e troca de forma de pagamento. Login por celular com código [9c]. Envio automático de avisos (WhatsApp Business API, SMS, e-mail) e alerta de queda de preço. Backup do banco (Supabase Pro ou `pg_dump` agendado) quando houver lojistas pagando. Usuário de banco próprio (`app_user`) com menos permissões. Recuperação de senha automática por e-mail (SMTP próprio no Supabase Auth). Pagamento de comissão intermediado pela plataforma. Consulta de placa, analytics de funil, app Expo (aí entra a API com Bearer e a spec OpenAPI), motos/caminhões.
