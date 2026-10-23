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

# 2026-10-23 · Por que pagamento manual
- Decisão do dono: MVP sem custo e sem integração; Stripe ou outro gateway entra depois, com o registro manual mantido.

# 2026-10-23 · Como o PRD v2 entrou
- Dono decidiu: login só e-mail/senha e avisos por wa.me no MVP (custo zero); comprovante aceita imagem e PDF (privado); Rede Caju e Caju Indica prontos no lançamento.
- PRD v2 prevalece sobre o v1, exceto nesses pontos e nos endereços em duas fases (vercel.app → subdomínios).

# 2026-10-23 · Decisões do /clarify da 001
- Bloqueio e-mail+rede 15 min; sessão 30 dias sem uso (equipe 1 dia); último painel; senha temporária 24 h; usuário da loja sem dinheiro; suporte só modera; 1º admin por script e equipe em contas separadas.

# 2026-10-23 · AuthProvider (001/T001)
- Supabase atrás de uma interface pequena: testes do domínio auth rodam sem rede (PGlite + provedor falso), e o Supabase real fica num arquivo só.

# 2026-10-23 · Por que SEO.md
- Dono definiu o SEO como principal ativo; regras viram checklist obrigatório por página pública. Lojas por caminho em /loja/{slug} (decidido pelo dono, ADR 0009): subdomínio divide a autoridade de busca e exige DNS curinga; o prefixo evita colisão com rotas do sistema.

# 2026-10-23 · Permissão por papéis da conta (001/T003)
- Permissão vale para qualquer papel da conta; o painel ativo é só navegação, para que trocar de painel nunca dê nem tire acesso. Um mapa único de ações por papel serve às actions e aos botões, evitando regras espalhadas.

# 2026-10-23 · Bloqueio só por falha (001/T007)
- O contador por e-mail sobe só em falha e é consultado sem contar (peek), para o login certo nunca bloquear; falhas de e-mail inexistente também contam, para o bloqueio não revelar se a conta existe.

# 2026-10-23 · Papéis por uma porta só (001/T012)
- grantRole concentra as regras de AUT-SEC-009 para os cadastros das specs 003/008/010 não reimplementarem a checagem. updatePassword só exige sessão (não authorize), por ser a única ação liberada com senha temporária.

# 2026-10-23 · Aviso para o usuário da loja (AUT-FR-016)
- Dono aprovou: pagamento e Conta são só do lojista; em vez de "sem permissão", o usuário da loja vê "Loja indisponível, fale com o responsável". Leitura dos veículos nesse estado ficou fora do MVP.

# 2026-10-23 · proxy com getClaims (001/T013)
- O proxy usa getClaims (valida o token e renova quando vence) só como checagem otimista; papel e loja são conferidos no servidor. Erro 400 do Supabase vira "senha errada"; qualquer outro sobe, para uma queda do serviço não parecer credencial inválida.

# 2026-10-23 · /entrar (001/T014)
- O e-mail volta no estado da action para não sumir após erro (o React limpa o formulário); falha inesperada vai para o log e mostra mensagem neutra, nunca "senha incorreta".

# 2026-10-23 · tsx e nome só em profiles (001/T018)
- tsx (dev, aprovado pelo dono) para o script reaproveitar a função testada em vez de duplicar regra. O nome fica só em profiles, não no user_metadata do Supabase: uma fonte da verdade e menos dado pessoal duplicado.

# 2026-10-23 · Sessão sempre por requisição (001/T015)
- currentSession chama connection(): a inatividade depende da hora e o Next 16 recusa new Date() em pré-renderização. /recuperar não quebra sem SUPPORT_WHATSAPP (só esconde o botão), para uma variável faltando na Vercel não derrubar o build.
