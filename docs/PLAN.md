# Plano do CajuGo (MVP)

> Ordem de construção do MVP. Cada bloco numerado é uma **spec** (`SDD.md`): passa por `/spec → /clarify → /plan → /tasks → /implement → /verify`. As tarefas abaixo são o roteiro de alto nível; o `tasks.md` de cada spec detalha.

## Estratégia
1. **Primeiro o valor, depois a cobrança.** Lojista cadastra veículos e recebe leads antes de existir pagamento online. Enquanto o pagamento (spec 007) não fica pronto, o **admin ativa a loja manualmente**, e os primeiros lojistas pagam por Pix fora do sistema. Assim dá para validar com lojas reais cedo.
2. **Uma fatia vertical por spec:** dados + servidor + tela + testes.
3. **Custo zero** até ter cliente pagando (Vercel Hobby, Supabase Free, Cloudinary Free).

## Decisões pendentes (preciso de você)
| # | Decisão | Quando é necessária | Sugestão |
|---|---|---|---|
| D1 | Gerenciador de pacotes | Fase 0 | ✅ **pnpm** |
| D2 | Lint/format | Fase 0 | ✅ **ESLint + Prettier** |
| D3 | Testes | Fase 0 | ✅ **Vitest** (serviços contra Postgres local em Docker) + **Playwright** (e2e) |
| D4 | Validação de schema | Fase 0 | ✅ **zod** |
| D5 | CSS / componentes | Fase 0 | ✅ **Tailwind** com os tokens do `DESIGN.md` |
| D6 | Fonte da FIPE | spec 003 | API pública gratuita da FIPE (parallelum) com cache no banco; ou lista manual |
| D7 | E-mail transacional (aviso de novo lead) | spec 005 | Resend (plano gratuito) |
| D8 | Gateway de pagamento | spec 007 | Asaas, Mercado Pago ou Efí (com Pix Automático) |
| D9 | Pendências do PRD §12.1 | antes de cada spec afetada | — |

---

## Fase 0 — Fundação (sem spec, é infraestrutura)
- [x] **F01** Decidir D1–D5.
- [x] **F02a** `CLAUDE.md` na raiz do repositório e `.claude/settings.json` com as regras de `deny`.
- [x] **F02b** `git init` e `.gitignore` (com `.env*`, `node_modules`, `.next`).
- [x] **F03** Definir a estrutura de pastas e registrá-la em `ARCHITECTURE.md` §3 e no `CLAUDE.md`.
- [x] **F04** Criar o app Next.js (TypeScript, App Router) e os comandos `dev`, `lint`, `typecheck`, `test`; registrar em `CLAUDE.md` › Comandos.
- [ ] **F05** Criar os projetos Supabase `cajugo-staging` e `cajugo-prod` (Free, região São Paulo): desligar Data API, criar `app_user`, Auth com e-mail/senha e templates em pt-BR (`SECURITY.md` §3–4).
- [~] **F06** Drizzle + Drizzle Kit: conexão pelo pooler, primeira migration (enums, `profiles`, `stores`, RLS ligado sem policy) e Postgres local em Docker para desenvolvimento e testes.
  - Feito: Drizzle + postgres.js, schema `profiles`/`stores` com RLS, migration `0000_init`, `docker-compose.yml`, `.env.example`. Falta: aplicar a migration no Postgres local (precisa de acesso ao Docker).
- [ ] **F07** Conta Cloudinary; desligar upload sem assinatura; pastas `staging/` e `prod/`.
- [ ] **F08** Projeto na Vercel ligado ao GitHub; variáveis de ambiente (`DEPLOYMENT.md`); Preview protegido.
- [ ] **F09** Tokens de design (cores, tipografia Archivo/JetBrains Mono, raios) e componentes base do `DESIGN.md` §3: botão, input, chip, selo, toggle, segmentado, bottom sheet, nav inferior, cabeçalho escuro/claro, estado vazio, skeleton, toast.
- [ ] **F10** Infra de servidor comum: `requireSession`, helper de erro (problem+json / `{ ok:false, errors }`), rate limit por IP (`rate_limits`), honeypot, `activity_log`, logger JSON.
- [x] **F11** Verificação local única (`pnpm check`) rodada pelo Husky no pre-commit (`docs/TESTING.md`); comandos de migration. Sem GitHub Actions.
- [ ] **F12** Script de seed com lojas e veículos de exemplo (fotos de `design/carexamplesimages/`).
- [ ] **F13** Criar as skills de processo SDD (`/spec`, `/clarify`, `/plan`, `/tasks`, `/implement`, `/verify`) a partir do `SDD.md` §12.

**Pronto quando:** `dev` sobe, o deploy de preview funciona, a tela de componentes base renderiza e o `pnpm check` passa.

---

## 001 · Auth e sessão — telas 6a, 6b (manual), nova senha
- Login com Supabase Auth via Server Action → cookies httpOnly; middleware renova a sessão.
- Tabela `profiles` com papel (`store_owner`, `admin`, `support`) e loja; o primeiro admin é criado por script.
- Redirecionamento pós-login por papel e status da assinatura (PRD [6a]).
- Recuperar senha **manual**: 6b mostra o WhatsApp do suporte; senha temporária definida pelo admin (script até a spec 006); troca obrigatória na tela "Nova senha".
- Logout; proteção de `/painel/*` e `/admin/*` no servidor.
- **Testes-chave:** loja B não acessa o painel da loja A; lojista não acessa `/admin`.

## 002 · Cadastro do lojista e Minha loja — telas 5a, 5b, 5c, 3b
- Menu (gaveta) e landing de lojistas.
- Cadastro 1/2: loja + responsável, slug com verificação ao vivo e lista de reservados, criação de usuário + loja + assinatura `awaiting_payment` numa transação.
- **Ativação provisória pelo admin** (botão simples) até a spec 007.
- Minha loja: dados públicos, horário, logo e capa (Cloudinary), link + QR code (copiar/baixar), "divulgar novos veículos por padrão", troca de slug com redirecionamento por 90 dias.

## 003 · Veículos do lojista — telas 1c, 2a, 6e, 6f (vendido)
- Formulário completo de [2a] com autosave de rascunho.
- Fotos: upload assinado no Cloudinary, até 20, reordenar, capa = primeira.
- Marca/modelo/versão (FIPE, D6) e valor de referência FIPE.
- Máquina de estados: rascunho → publicado → vendido (desfazer em 7 dias) → excluído (soft delete); despublicar.
- Toggle "Divulgar na CajuGo" com legendas por estado; `revalidateTag`.
- Histórico de preço (`history`); lista "Meus veículos" com KPIs, busca e filtros por status; resumo [6e].
- Estado vazio + onboarding [5e] (checklist "Primeiros passos").

## 004 · Vitrine e catálogo público — telas 1a, 1b, 6d
- Vitrine `/` e catálogo da loja `/{slug}` (mesmo layout, dois modos).
- Busca textual, filtros e ordenação (bottom sheet), filtros na URL, contador ao vivo, "carregar mais" (cursor).
- View `showcase_vehicles`, busca com full-text (`tsvector` + `unaccent`), índices; ISR + `revalidateTag`.
- Página do veículo: galeria com swipe, ficha, itens, card da loja, parcela estimada e simulador local, compartilhar.
- Veículo vendido/oculto: "não está mais disponível" + similares.
- Favoritos no `localStorage`.
- SEO: títulos, schema.org `Vehicle`/`Offer`, sitemap, `noindex` em vendidos.
- Responsivo desktop: grade 2–4 colunas, coluna lateral de preço na página do veículo.

## 005 · Leads — telas 1b (formulário/WhatsApp), 3a
- Formulário "Envie uma mensagem" com honeypot, rate limit e aviso de privacidade.
- Clique no WhatsApp gera lead (`channel: whatsapp`) e abre `wa.me` com a mensagem pronta.
- Origem: vitrine CajuGo × catálogo da loja.
- Tela Leads: KPIs, filtros, avanço de status, "Perdido", destaque para novo há mais de 24 h, ligar/WhatsApp.
- Lead vendido ↔ veículo vendido (sugestão cruzada).
- E-mail de novo lead para o lojista (D7).
- Métricas do veículo: visualizações, cliques, leads (`stats` diário).

## 006 · Admin: lojas, vitrine e moderação — telas 4a, 1d, 6g, 4c, 6f (ocultar/suspender)
- Painel com KPIs, "Precisa de atenção" e origem dos leads.
- Lojas: lista, detalhe [6g], criar loja com senha temporária do dono, definir senha temporária, suspender/reativar manual.
- Veículos CajuGo: lista, ocultar com motivo (avisa o lojista), aprovação prévia (opcional, config).
- Denúncias: botão "Denunciar" na página do veículo + fila no admin.
- Usuários; equipe CajuGo (convidar admin/suporte); configurações da vitrine; logs de atividade.

> **Marco: piloto.** Depois da 006 dá para colocar lojistas reais no ar com ativação manual.

## 007 · Assinatura e pagamento — telas 5d, 6c, 5e
- Integração com o gateway (D8): cliente, assinatura recorrente, Pix Automático e cartão (tokenizado no front).
- Tela de pagamento, Pix gerado com expiração, copia e cola, polling de status, "Já paguei".
- Webhook idempotente → assinatura `active` → loja no ar → onboarding [5e].
- Remover a ativação provisória da spec 002.

## 008 · Ciclo de cobrança e Conta — telas 3c, 4b, 6f (cancelar)
- Faturas e recibos; alterar forma de pagamento.
- Atraso → banner no painel → suspensão automática após a tolerância (cron diário) → reativação ao pagar.
- Cancelamento com data de fim, desfazer até a data, efetivação pelo cron.
- Liberação de slug reservado sem pagamento (7 dias).
- Admin Assinaturas: MRR, filtros, editar plano (aviso de 30 dias).
- Conta do lojista: perfil, alterar senha, preferências de notificação.
- E-mails de cobrança (D+1, D+5, D+9), suspensão, reativação e cancelamento.

## 009 · Lançamento
- Termos de uso e política de privacidade (LGPD, transferência internacional).
- Checklist de produção do `DEPLOYMENT.md`; domínio `cajugo.com.br`; Vercel Pro.
- Revisão de segurança completa (`SECURITY.md` §12) e de acessibilidade (`DESIGN.md` §7).
- Performance: LCP < 2,5 s em 4G na vitrine e na página do veículo.
- Decidir: Vercel Pro ou migração para VPS antes de cobrar.

---

## Fase 2 (depois do MVP)
Backup do banco (Supabase Pro ou `pg_dump` agendado) quando houver lojistas pagando. Recuperação de senha automática por e-mail (SMTP próprio no Supabase Auth). Usuários da loja (funcionários), vendedores com comissão, consulta de placa, notificação por WhatsApp/push, analytics de funil, app Expo (aí entra a API com Bearer e a spec OpenAPI), motos/caminhões, versões desktop dos painéis.
