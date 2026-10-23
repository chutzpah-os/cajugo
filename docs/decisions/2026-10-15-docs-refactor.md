# 2026-10-15 · Por que o stack mudou
- Custo zero no início: serverless na Vercel + Firebase Spark + Cloudinary Free (pedido do dono).
- Firebase Storage não está no Spark para projetos novos → imagens no Cloudinary.
- Next.js full-stack em vez de NestJS: um deploy só, sem servidor ligado; OpenAPI só quando o app Expo existir.
- Pagamento online fica para depois de leads/vitrine: ativação manual pelo admin permite pilotar com lojas reais antes.

# 2026-10-15 · Por que Supabase em vez de Firebase
- Filtros da vitrine, painéis e relações loja/assinatura/veículo são simples em SQL e complicados no Firestore.
- Supabase Auth: banco e login no mesmo provedor. Drizzle só no servidor: regra no código, não em RLS, e SQL portável.
- Vercel continua por enquanto; antes de cobrar, decidir entre Vercel Pro e migrar o Next para VPS.

# 2026-10-22 · Por que senha manual
- O e-mail nativo do Supabase Auth só serve para teste; SMTP próprio seria um provedor a mais só por isso.
- Poucos lojistas no piloto: resolver pelo WhatsApp é suficiente e custa zero.

# 2026-10-22 · Ferramentas (F01)
- Escolhas padrão do ecossistema Next.js, todas gratuitas; zod integra com Drizzle; Tailwind recebe os tokens do DESIGN.md.

# 2026-10-22 · Por que sem GitHub Actions
- Pedido do dono: menos uma peça para configurar; projeto de uma pessoa, a Vercel já barra build quebrado.

# 2026-10-22 · Pastas por domínio (F03)
- Feature fica num lugar só (serviço, actions, schemas, UI, testes); casa com as specs por domínio e o GLOSSARY.

# 2026-10-22 · AGENTS.md do Next (F04)
- Mantido: é gerado e recriado pelo `next dev` e avisa que o Next 16 difere do conhecimento do modelo; o CLAUDE.md aponta para ele.

# 2026-10-22 · Por que liberar commit
- Pedido do dono; o controle continua com ele (commit só quando pedido) e as operações que mexem em histórico/PR seguem bloqueadas.

# 2026-10-22 · Banco (F06)
- postgres.js: driver indicado pelo Drizzle para Supabase; prepare:false por causa do pooler em modo transação.
- Sem FK para auth.users e slug sem citext: mantém o schema igual no Postgres local e no Supabase.

# 2026-10-22 · Por que Husky no pre-commit
- Pedido do dono: testes automáticos antes de cada commit. Sem GitHub Actions, o hook local é a barreira; e2e fica fora do hook por ser lento.

# 2026-10-22 · Por que PGlite
- Sem Docker: nada para instalar nem ligar antes do commit; banco novo por teste. Diferenças raras são pegas ao migrar o staging.

# 2026-10-22 · Componentes com campos nativos (F09)
- Toggle e Sim/Não são checkbox/radio nativos: funcionam em formulário de Server Action sem JS e já são acessíveis. Componentes interativos (sheet, toast) entram com as telas.

# 2026-10-22 · Por que postgres no MVP
- Decisão do dono: já funciona e evita configurar permissões agora. A proteção fica na camada de serviço; app_user entra na fase 2.

# 2026-10-22 · Por que fatias verticais
- A skill tdd mostra que "todos os testes antes" prende os testes a um desenho imaginado; um teste por vez continua sendo teste primeiro e acompanha o aprendizado.

# 2026-10-23 · Infra comum (F10)
- Rate limit no próprio Postgres (sem Redis, custo zero), janela fixa com upsert atômico; IP só como HMAC; sessão do Supabase fica na spec 001 para não antecipar o login.

# 2026-10-23 · Por que liberar leitura do .env
- Decisão do dono, para permitir que o agente configure variáveis; a proteção passa a ser a regra de não exibir valores.

# 2026-10-23 · Credenciais expostas no chat
- Dono decidiu não trocar agora: banco só tem dados de teste e repo não contém segredos. Troca obrigatória antes do lançamento (PLAN 009).
