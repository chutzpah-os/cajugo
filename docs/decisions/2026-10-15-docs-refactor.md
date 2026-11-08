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

# 2026-10-23 · Cada página checa a própria permissão (001/T016)
- O layout sempre renderiza a página (o Next 16 não valida segmento descartado) e a página mostra "Sem permissão": nenhuma tela depende do layout para se proteger. Leitura de sessão dentro de <Suspense> por página, para navegação instantânea.

# 2026-10-23 · Busca por POST (001/T017)
- A busca de conta usa action (POST), não ?email= na URL, para o e-mail não ir para logs e histórico. Suporte vê a busca sem o botão, conforme AUT-SEC-008.

# 2026-10-23 · Conexão preguiçosa com o banco
- O build só carrega as páginas e não deve depender de variáveis de runtime; a falta de DATABASE_URL continua falhando alto, mas no primeiro uso, não ao importar.

# 2026-10-23 · Menu do admin completo agora
- Dono pediu navegação no /admin; o menu sai final (itens do PRD) e cada spec troca a página em construção pela real, sem mexer no menu. Produção no banco de staging até a 013: evita um 2º projeto Supabase antes do lançamento.

# 2026-10-23 · Fim da coluna role (001/T020)
- Remoção em migration separada da cópia (0002 → 0003), depois que nenhum código lia mais `role`: o deploy em produção nunca dependeu da coluna removida.

# 2026-10-23 · Produção com banco próprio já
- Contas de teste e2e (com senha conhecida, inclusive suporte) não podem viver no banco da produção; o plano Free permite 2 projetos, então o cajugo-prod foi antecipado da 013. Staging fica para desenvolvimento, testes e Preview. Chave secreta do prod passou pelo chat: rotacionar na 013.

# 2026-10-23 · Meta de tempo só em deploy (001/T019)
- Localmente o login mede a distância até São Paulo (50–230 ms por ida e volta), não o app; a meta de 2 s só é cobrada contra um deploy. Na Vercel o mesmo caminho é ~2,6× mais rápido, mas o cold start passa de 2 s: risco anotado para a 013.

# 2026-10-23 · Ajustes da revisão da 001 (decididos pelo dono)
- Sair encerra só este aparelho (SECURITY.md alinhado à spec); bloqueio por e-mail em janela deslizante de verdade; limite por rede conta só falhas, para lojas com Wi-Fi compartilhado. Sessões de outra conta são encerradas apagando auth.sessions (o Supabase não tem API por id; testado: token e refresh recusados).

# 2026-10-23 · Spec 002 (respostas do dono)
- Regras valem só daqui para frente; nova chave Pix pede senha; troca de senha entra na 002 (ninguém trocava a própria senha); alteração vale em até 1 min (cache); mensalidade fica no plano (011); nome e domínio só informativos; lança com os valores provisórios do PRD.

# 2026-10-23 · "Mais" no menu do celular
- Dono escolheu manter os 4 itens do PRD e acrescentar "Mais" (gaveta do DESIGN.md), em vez de esconder Conta: os itens mais usados continuam a um toque e nada fica inacessível no celular.

# 2026-10-23 · Regras com histórico (002, ADR 0010)
- Uma linha de settings sobrescreveria o passado; a spec exige quem mudou e o valor da época. Limites das regras aprovados pelo dono como trava contra erro de digitação; SUPPORT_WHATSAPP sai do ambiente; troca de senha em /conta/senha.

# 2026-10-23 · Provisórios desde 2000 (002/T001)
- Valores provisórios com vigência em 2000-01-01 (não -infinity): qualquer data consultada tem valor e o driver lê a data sem caso especial. Gatilho no banco garante o histórico mesmo para SQL manual.

# 2026-10-24 · jsonb lido como texto (002/T002)
- O Drizzle reinterpreta jsonb de texto ("557981360206" vira número) no PGlite e no postgres.js; valores de regra são lidos com value::text e JSON.parse num helper único. CPF/CNPJ da chave Pix com dígito verificador para evitar pagamento em chave errada.

# 2026-10-24 · Conferência de senha em cliente à parte (002/T003)
- signInWithPassword no cliente com cookie trocaria a sessão do admin; o cliente sem cookie confere e encerra a sessão de conferência na hora, sem deixar sessão órfã.

# 2026-10-30 · Cache de 1 min e limite de 20 s nos testes (002/T005)
- revalidate 60 cumpre a CFG-NFR-001 sem cache remoto pago. Testes de integração criam Postgres e aplicam migrations; com a máquina carregada, 5/10 s estouravam: dono aprovou 20 s para todos.

# 2026-11-07 · Banco de teste por clone
- Aplicar todas as migrations em cada teste dominava o tempo da suíte (e crescia a cada migration). O clone mantém cada teste com um banco próprio e limpo, sem mudar nenhum teste.

# 2026-11-07 · Auditoria de regras sem valores (002/T006)
- O activity_log guarda só quais regras mudaram; os valores ficam no histórico das regras. Assim a chave Pix (dado protegido, SECURITY §8) nunca vai para o log.

# 2026-11-07 · Mesmo bloqueio para confirmar senha (002/T007)
- Errar a senha numa confirmação conta como errar no login: quem pegar uma sessão de admin aberta não testa senhas à vontade pela tela da chave Pix.

# 2026-11-07 · Chave Pix só trocada, nunca apagada (002/T008)
- Uma vez configurada, sempre há chave para o lojista pagar. O histórico mostra a chave inteira só a admin e suporte (SECURITY §8); a auditoria nunca guarda o valor.

# 2026-11-07 · Troca de senha pede a atual (002/T010)
- Sem a senha atual, quem pegasse uma sessão aberta trocaria a senha e tomaria a conta. Erro na atual vai para o campo "current" e conta no bloqueio do login.

# 2026-11-07 · Reset de regras por inserção (002/T011)
- O gatilho impede apagar; o reset do staging insere o provisório como alteração nova, vigente no horário do banco, para os e2e começarem sempre do mesmo estado.

# 2026-11-07 · Conversão de % e R$ no servidor (002/T012)
- Os campos só mostram texto pt-BR; a conversão para centésimos de ponto e centavos fica em settings/format.ts, no servidor, para não depender de JavaScript no navegador nem duplicar regra.

# 2026-11-08 · 0005 no staging antes da T020 (002/T013)
- A tela precisa da tabela para rodar localmente; o prod só recebe a migration na T020, junto do primeiro push que lê as regras. Conta e2e-admin separada da do dono, para os e2e editarem regras.

# 2026-11-08 · Pix em um formulário de 2 passos (002/T014)
- Os campos do passo 1 ficam escondidos no passo 2 e seguem no envio: uma action só, sem guardar rascunho no servidor. O passo se ajusta na renderização (sem efeito), como pede a regra do React.

# 2026-11-08 · 404 "suave" nas páginas logadas (002/T015)
- Com streaming e layout em <Suspense>, regra inexistente mostra a tela 404 mas com status 200. Em página logada e noindex não há efeito; páginas públicas (SEO) precisam validar antes do streaming e devolver 404 de verdade.

# 2026-11-08 · Build sem depender do banco (002/T018)
- Página que lê regras usa connection() antes: o build não consulta o banco, então deploy não falha com o banco pausado (plano gratuito) nem antes de a migration chegar ao prod.

# 2026-11-08 · Rascunho do Pix em campos ocultos (002/T019)
- O React reinicia o formulário depois de cada envio; o <select> visível voltava ao 1º tipo enquanto o estado guardava outro. Campos ocultos ligados ao estado não são afetados pelo reinício.

# 2026-11-08 · Exceções aceitas na 002
- Os 14 valores provisórios da migration 0005 usam uuid v4 (gen_random_uuid): a migration já está aplicada em staging e prod e o Postgres 17 não gera v7; toda linha nova usa v7. A chave Pix fica em card próprio, fora de "Pagamento", por ter fluxo de 2 passos com senha. CFG-NFR-001 sem teste automático: garantido pelo cacheLife (expire 60 s).

# 2026-11-08 · Decisões da 003
- Código pessoal antecipado da 010; autoindicação por e-mail/celular aqui e CPF/CNPJ na 004; conta existente adiciona a loja; termos com o rascunho do PRD; troca de endereço 1×/30 dias; endereço em campos (SEO local). Plano: qrcode (D1), remover stores.address vazia (D2), cidades do IBGE no repo (D3), /loja/{slug} mínima até a 005 (D4).

# 2026-11-08 · Migration em dois passos (003/T001)
- Remover address e criar address_* no mesmo passo faz o drizzle-kit perguntar se é renomeação (pede terminal interativo). Separar em 0006 e 0007 tira a ambiguidade e deixa explícito que address foi apagada, não renomeada.

# 2026-11-08 · Cloudinary sem SDK, SHA-1 (003/T003)
- A assinatura é um hash de poucos parâmetros; o SDK não traria ganho. SHA-1 é o padrão aceito pelo Cloudinary sem configurar a conta (o plano dizia SHA-256, que exige ajuste no painel). CLOUDINARY_FOLDER explícita em vez de inferir o ambiente da Vercel, para rodar igual numa VPS.

# 2026-11-08 · Conta antes da transação (003/T008)
- O Supabase Auth fica fora da transação do banco; a conta é criada antes e apagada se a transação falhar (testado com falha simulada). Código de indicação e endereço são checados antes de criar a conta, para erro comum não gerar conta.

# 2026-11-08 · Limite conta toda tentativa de cadastro (003/T009)
- Diferente do login (só falhas), o cadastro é formulário público: SECURITY §6 manda limitar toda tentativa por rede. O limite vem antes da validação, para não virar sonda de e-mails cadastrados.

# 2026-11-08 · FAQ sem número fixo de taxa (003/T016)
- A resposta sobre comissão não cita o % da taxa CajuGo (regra editável, spec 002) para a página continuar estática e boa para SEO; o valor aparece no painel. O preço R$ 100 é o texto do PRD até o plano editável da 011.

# 2026-11-08 · Texto inicial dos termos (003/T017)
- O PRD só lista os tópicos; o texto usa apenas o que PRD e SECURITY já definem, sem cláusulas novas, e fica marcado como versão inicial até a revisão jurídica (PRD §12.1 #5). Abas viraram âncoras: funcionam sem JS e ficam no HTML para busca.

# 2026-11-08 · /i/{codigo} como Route Handler (003/T018)
- Rota dinâmica de página exige generateStaticParams com cacheComponents; o link só redireciona, então um Route Handler GET (307) é mais simples e não depende da lista de códigos. Campos do cadastro controlados: o React limpa o formulário a cada envio.

# 2026-11-08 · Horário opcional, mas completo (003/T019)
- Loja sem nenhum horário salva normalmente (hours = null); se começar a preencher, cada dia precisa de horário ou Fechado, com o aviso no próprio dia, para o catálogo nunca mostrar semana pela metade.

# 2026-11-08 · e2e sem cabeçalho forçado em requisições externas (003/T020)
- O x-forwarded-for que os e2e usam para variar a rede vai em toda requisição e faz o Cloudinary recusar o CORS; o teste de upload roda sem ele (navegador real não envia esse cabeçalho). Nos e2e da T022, o cabeçalho será aplicado só ao localhost.

# 2026-11-08 · /loja/{slug} com cache e status "suave" (003/T021)
- Página pública com cache (cota gratuita) e placeholder no generateStaticParams para o build não depender do banco. Limitação: com streaming, redirecionamento e 404 saem como 200 (redirecionamento no navegador; noindex). Aceito enquanto a página é mínima e noindex; status real virou item obrigatório da 006 no PLAN.

# 2026-11-08 · Checagem de alvo de toque segue o WCAG 2.5.8 (003/T022)
- O alvo de um checkbox dentro de <label> é o rótulo inteiro (min-h-11), link no meio de uma frase é exceção do WCAG e o campo isca (aria-hidden) não é alvo; a checagem passou a medir assim em vez de reprovar telas corretas. Seed busca a loja de teste pelo dono porque o e2e troca o endereço.

# 2026-11-08 · Ajustes da verificação da 003 (003/T024)
- A revisão achou que um publicId com `../` depois do prefixo da loja apontava para a pasta de outra loja: agora só vale o nome exato que o servidor assinou. Loja cadastrada/suspensa não aparece em /loja (SECURITY §4). FR-007/SEC-005 reescritos: a tela de quem indicou é da 010 (decisão do /clarify). Tamanho e EXIF na assinatura ficaram para antes das fotos de veículo (005).

# 2026-11-08 · Build de produção falha sem APP_URL
- O primeiro deploy saiu com canônica, sitemap e robots apontando para localhost porque APP_URL não chegou ao build; para o SEO isso é pior que um build quebrado. A checagem usa VERCEL_ENV (só lê a variável, nada exclusivo da Vercel) e muda junto na saída para a VPS.

# 2026-11-08 · Comprovante privado pela nossa rota (004/T001, ADR 0011)
- URL assinada do Cloudinary não expira e o plano gratuito bloqueia PDF; servir pelo servidor confere sessão a cada abertura e vale igual para documentos do vendedor (008) e para a VPS. Documento fiscal fica na loja (quem paga), não no perfil.

# 2026-11-08 · Unicidade no banco, não só no código (004/T002)
- "Um comprovante em análise por fatura" e "uma 1ª mensalidade por loja" são índices únicos parciais: duas abas ou dois admins ao mesmo tempo não conseguem burlar a regra, e a 011 herda a mesma garantia para as faturas mensais.

# 2026-11-08 · BR Code próprio, sem biblioteca (004/T004)
- O formato do BACEN é curto e estável; implementar com teste contra o exemplo oficial evita dependência nova e é o mesmo código que a fatura mensal (011) vai usar.

# 2026-11-08 · Leitura privada pela API de download (004/T006)
- A prova mostrou que a URL de entrega bloqueia PDF no plano gratuito e que a URL assinada não expira; a API de download assinada lê PNG e PDF só no servidor. O navegador nunca recebe URL nossa do arquivo; o servidor só guarda o public_id.

# 2026-11-08 · Cidade opcional só na leitura (004/T008, D1)
- O histórico de regras é só de inserção, então valores antigos da chave Pix (sem cidade) existem para sempre; a leitura aceita, a gravação exige e, sem cidade, a chave conta como não pronta (sem QR). Assim o histórico nunca quebra e nenhum dado precisa ser reescrito.

# 2026-11-08 · Aviso guarda dados, não a frase (004/T009)
- O aviso grava o tipo e os dados (motivo, valores) e a frase é montada na leitura: mudar o texto não exige migrar avisos antigos, e nenhum dado pessoal vai para a tabela. Formatação de dinheiro foi para a plataforma para os domínios não dependerem das regras.
