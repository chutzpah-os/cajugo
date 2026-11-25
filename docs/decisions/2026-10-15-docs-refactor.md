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

# 2026-11-08 · Uma função de documentos de quem indica (004/T011)
- taxIdsOf concentra "quais CPF/CNPJ esta pessoa tem": hoje os das lojas dela; quando vendedor e indicador tiverem CPF (008/010), entram ali e a checagem nos dois sentidos passa a cobrir os novos casos sem mudar quem chama.

# 2026-11-08 · Status da loja mudado só pelo domínio stores (004/T013)
- O billing não escreve stores.status direto: chama transições com status de origem fixo (registered → payment_review → active ou de volta), que devolvem se mudaram. Repetição ou ordem errada não corrompem o estado, e a 011 acrescenta as suas transições no mesmo lugar.

# 2026-11-08 · Ajustes vindos do e2e (004/T024)
- Aviso no painel: o papel status/alerta foi para dentro do item da lista (no próprio <li> ele apagava o item para o leitor de tela). Campo de arquivo atrás de botão sai da navegação e do leitor (o botão é o controle), e a checagem de acessibilidade ignora campo aria-hidden nas duas regras.

# 2026-11-08 · Corrida resolvida no banco (004 verificação)
- O banco de testes executa uma transação por vez, então teste de concorrência ali não prova nada; a garantia de "conferido uma vez só" passou para o Postgres (fatura open → paid condicional, índice único de pagamento confirmado por fatura, SELECT ... FOR UPDATE da loja no registro manual), que vale com conexões paralelas de verdade. PIX-SEC-002 e PIX-FR-003 da spec reescritos para refletir D2 e a tela do admin na 010.

# 2026-11-08 · FIPE sob demanda e histórico genérico (005/T001)
- A API gratuita da FIPE aceita 500 consultas/dia; copiar no uso cabe na cota e o formulário não depende dela no ar (ADR 0012). O histórico de preço usa a vehicle_history genérica já prevista no ARCHITECTURE, para outros campos entrarem sem tabela nova.

# 2026-11-08 · Metadados removidos no servidor (005/T005)
- A transformação de entrada faz o Cloudinary guardar só a imagem regravada: o original com GPS nunca fica acessível, nem por URL sem transformação. A redução no navegador continua como economia de banda, não como proteção.

# 2026-11-08 · Renovar cache só para veículo público (005/T018)
- updateTag recarrega a rota atual; num rascunho em edição isso remontava o formulário e apagava listas e estado. Como rascunho não aparece em página pública, a renovação só acontece quando o veículo é ou passa a ser publicado. Arquivos do campo de foto são copiados antes de esperar o rascunho ser criado.

# 2026-11-09 · Data em SQL manual vai como texto ISO (005/T019)
- O driver do Postgres recusa Date dentro de sql`...` e o PGlite aceita, então os testes de unidade não pegam; o teste no navegador contra o staging pegou. Regra: em SQL manual, data vai com toISOString() e ::timestamptz.

# 2026-11-09 · Log sem parâmetros e veículo publicado sempre completo (005 verificação)
- O erro do Drizzle traz os valores da consulta no texto (placa, CPF), então só a causa vai para o log, em todos os domínios. Publicar é uma garantia contínua, não só um clique: o salvamento automático e remover foto respeitam os mesmos obrigatórios. FR-004 e FR-005 da spec ajustados: setas além do arrastar (celular) e a ordem real da FIPE.

# 2026-11-09 · Testar contra o build de produção (006/T001)
- Erros de pré-renderização do Next 16 não aparecem no modo de desenvolvimento e o conteúdo pode sair certo na 1ª resposta; só o log do servidor do build mostra. Por isso a etapa própria, que lê esse log.

# 2026-11-15 · 006/T021
- O 308 de `/vitrine` direta criava laço no build de produção: a reescrita interna de `/?filtros` passa de novo pelo proxy. Sem a regra, o acesso direto só mostra a vitrine com canônica `/`.
- Medido no build de produção em 4G (Lighthouse móvel): LCP 1,3–2,0 s e CLS ≤ 0,002 na vitrine, no catálogo e no veículo; a prova final no Lighthouse segue na 013.

# 2026-11-15 · 006b/T002
- Cidade do endereço como coluna gerada (D1): nenhum caminho de cadastro pode esquecer de gravá-la. `translate` antes de `lower` para não depender do locale do banco (PGlite e Supabase).

# 2026-11-15 · 006b/T007
- A 006 não tinha índice de marca (o plano dizia que sim). A `0013` cria `(make_slug, model_slug)`, que serve o filtro por marca, por modelo e a regra "a página já existiu" em qualquer status, e tira o `(status, model_slug)` da `0012`, que ficou redundante. A `0012` já estava no staging, então não foi reescrita.

# 2026-11-15 · 006b/T014
- O menu da home perdia o clique feito antes da hidratação quando a máquina estava carregada; o teste repete o clique só com o menu fechado, sem esconder falha real (se nunca abrir, falha em 20 s).

# 2026-11-15 · 006b/verify
- A revisão achou correções de marca que mudam o endereço sem migration (Kia, Caoa Chery): o teste-guarda força a próxima correção a vir com o UPDATE, em vez de depender de lembrar. Marca na cidade passa a exigir veículo da marca numa loja da cidade para "já existiu" (D2), para não abrir uma página 200 para cada combinação inventada.

# 2026-11-16 · 006c/T001
- O ARCHITECTURE já previa `buyers/` para favoritos e alertas; usar ele em vez de criar `favorites` deixa a 006d (alertas) no mesmo domínio.

# 2026-11-16 · 006c/T004
- Favorito feito no catálogo pode ser de veículo não divulgado na CajuGo; ele é público na página dele, então os favoritos seguem a regra da página do veículo, não a da vitrine.

# 2026-11-16 · 006c/T008
- O card (`showcase`) usa o componente do coração de `buyers/components`, como `auth` já usa `notices/components`: é UI de cliente, sem banco; a regra "só pelo service.ts" continua valendo para regra de negócio e dados. Zod ficou fora do arquivo que vai a toda página pública.

# 2026-11-16 · 006c/T010
- Com a máquina carregada, o toque em "Simular" antes da hidratação se perdia, o que também aconteceria num 4G lento: `commandfor`/`command` abrem o diálogo sem JavaScript, e o `onClick` fica para navegador sem suporte.

# 2026-11-16 · 006c/verify
- "Ver veículos parecidos" levava à página do veículo, que só mostra parecidos quando ele foi vendido; despublicado ou de loja fora do ar dava 404. Passa a levar à página de descoberta do modelo, que existe enquanto houver registro dele. A leitura devolve só o endereço, nenhum dado do veículo.
- Um favorito estragado no aparelho apagava a lista inteira no próximo toque; agora só ele sai. `buyers/components/favorites-view` usa o card de `showcase/components`, como o card usa o coração de `buyers`: UI de cliente, sem banco (mesma exceção da T008).

# 2026-11-16 · 006d/T001
- O cron do plano Hobby roda 1×/dia: calcular o compatível na leitura do admin (cache de 60 s) cumpre o "até 60 s" da spec. Como avisar fecha o alerta e apaga o contato, o link de cancelar só serve de verdade na confirmação do pedido; na mensagem, ele informa que o alerta foi encerrado.

# 2026-11-16 · 006d/T013
- O link de cancelar não cancela ao abrir: o WhatsApp abre links para montar a prévia, o que cancelaria o alerta sem a pessoa pedir. Só o toque em "Cancelar aviso" fecha.

# 2026-11-16 · 006d/verify
- O contador do menu passou a vir da rota (`app/`), que pode usar qualquer domínio: assim `auth` não lê dado de `buyers` fora do `service.ts`. A trava por celular evita que dois pedidos simultâneos passem dos 5 pendentes; o job invalida o cache para o nome e o celular de um vencido não ficarem guardados nele.

# 2026-11-16 · 006d/T015
- A spec foi alinhada ao que o plano aprovou: o suporte é equipe da CajuGo e já vê outras filas do admin. Contar só veículos publicados depois do alerta evita uma coluna nova para a data em que a divulgação começou; o caso é raro, porque a loja divulga por padrão ao publicar.

# 2026-11-16 · 006d log do cron
- Sem log no sucesso, o Runtime Logs da Vercel ficava vazio e não dava para saber se o job rodou; o `OBSERVABILITY.md` já pedia o evento `cron.daily`.

# 2026-11-16 · 007/T001
- Uma URL só para o veículo (D1) evita conteúdo duplicado no Google; a origem "Seu catálogo" vem da marca da aba.

# 2026-11-16 · 007/T002
- FK com cascade porque veículo e loja só são apagados de verdade na limpeza dos e2e; no app a exclusão é lógica e o lead fica.

# 2026-11-16 · 007/T003
- Marcas no aparelho com falha silenciosa: sem armazenamento o registro segue e o limite por IP do servidor segura o abuso.

# 2026-11-16 · 007/T004
- Lista própria em vez de pacote (sem dependência nova); visualização é número de referência, não cobrança.

# 2026-11-16 · 007/T009
- Lista limitada a 200 no MVP: paginação por cursor quando uma loja passar disso (API.md §3).

# 2026-11-16 · 007/T010
- Permissão separada de `leads.view` porque admin e suporte vão ler leads na 012, mas só a loja muda o status (LED-SEC-005).

# 2026-11-16 · 007/T013
- `showcase` importa componentes de `leads` na página do veículo, como já faz com `buyers` (favoritos): exceção de UI registrada; a regra continua no serviço de cada domínio. Slug como chave da aba: já é público, sem expor o id da loja.

# 2026-11-16 · 007/T015
- Contador lido a cada abertura do painel (uma contagem com índice) para o lead aparecer na hora (LED-NFR-003); cache aqui atrasaria o aviso.

# 2026-11-16 · 007/T017
- Dias no ar continuam vindo do `daysOnAir` da 005 (VEH-FR-011): uma regra só para o mesmo número, em vez de repetir a conta no domínio `leads`.

# 2026-11-16 · 007/T018
- O contador do menu só aparecia na gaveta "Mais" e na barra lateral; "Leads" é item fixo da barra do celular, então o selo passou a valer ali também.

# 2026-11-16 · 007/verify ajustes da revisão
- API.md §2.6 pede criação de lead que aguente repetição; a chave no id dispensa coluna e migration nova. A lista de robôs cortava gente real (aparelhos e navegadores dentro de apps), justamente quem abre link compartilhado.

# 2026-11-16 · 007b/T001 documentos
- D1–D4 aprovadas: tabela própria sem autor nem IP; marca de moderação no veículo para o Ocultar sobreviver a republicar; oculto fora do Google mas vendável pelo catálogo; marca no aparelho compartilhada em platform/browser.

# 2026-11-16 · 007b/T005 denunciar anúncio
- O mesmo laço de limite por IP estava copiado em leads e buyers e entraria uma terceira vez; foi para a plataforma.

# 2026-11-16 · 007b/T010 avisos à loja
- O aviso guarda o motivo já em texto, para notices não depender do domínio moderation.

# 2026-11-16 · 007b/T013 leitura do lojista
- Os rótulos dos motivos ficam só em moderation/reasons; vehicles devolve a marca crua e a página monta o texto, para vehicles não depender de moderation (que já depende dele).

# 2026-11-16 · 007b/T019 painel do lojista
- Exceção de tela registrada no ARCHITECTURE §3: o card de vehicles usa os rótulos de moderation/reasons, sem criar dependência de serviço em sentido contrário.

# 2026-11-16 · 007b/verify ajustes e fechamento
- Revisão em dois eixos: a marca gravada antes da resposta podia engolir uma denúncia recusada, e a leitura pública escondia da equipe anúncios de loja suspensa e o oculto despublicado.

# 2026-11-16 · 008/T001 documentos
- D1–D6 aprovadas: cadastro em dois passos (fotos logado), comissão no banco já na 008, CPF/Pix em profiles, pixKeySchema na plataforma, máscara de CPF existente, origem seller no lead.

# 2026-11-16 · 008/T007 fotos do documento
- Upload e entrega privados já existiam no billing; viraram helpers da plataforma em vez de uma segunda cópia.

# 2026-11-16 · 008/T016 vitrine do vendedor
- O botão desabilitado 'Esta loja não aceita vendedores' fica para a 009, que cria a escolha da loja; até lá o serviço não produz esse estado.

# 2026-11-16 · 008/verify ajustes e fechamento
- Revisão em dois eixos: CPF completo chegava ao suporte (SECURITY §8), a conta podia trocar o CPF já guardado e três actions não validavam a entrada com schema (API.md §2).

# 2026-11-16 · 009/T001 documentos
- D1–D4 aprovadas: Aceitar vendedores começa desligado; slots no VehicleActions; sale_id no veículo; taxa guardada na venda. PRD e PLAN do /clarify ainda aguardam o OK do dono.

# 2026-11-16 · 009/T007 ajuste por veículo
- Validação e permissão ficam em sellers: se vehicles validasse com os schemas da Rede Caju, importaria sellers, que já depende dele (ciclo).

# 2026-11-16 · deps: next 16.4.6
- Vulnerabilidade moderada do Next >=16.3.0 <=16.4.4 (vazamento entre root params com 'use cache' chamado por unstable_cache()), corrigida na 16.4.5; upgrade autorizado pelo dono, feito direto pelo pnpm em vez do modo --agent sugerido pelo next dev.

# 2026-11-16 · 009/verify ajustes e fechamento
- Revisão em dois eixos: o 'Vendido' simples só era bloqueado na tela (RCL-FR-008), a tela e a venda divergiam sem comissão definida e a parceria era conferida fora da transação.

# 2026-11-23 · 011 · spec, plano, tasks e documentos [011/T001]
- Fecha o ciclo da assinatura que a 004 deixou na 1ª mensalidade; créditos numa tabela só e quitação da mais antiga (D2, D3).

# 2026-11-23 · Migration 0020 do ciclo de cobrança [011/T002]
- past_due_since estava só no ARCHITECTURE; a tolerância precisa de um começo que a reativação do admin reinicia.

# 2026-11-23 · Taxa de venda desfeita [011/T007]
- D1: dependência num sentido só (sellers → billing); a fatura não copia as vendas.

# 2026-11-23 · Alerta da fatura no painel [011/T014]
- Slot como o navCounts: auth não passa a depender de billing.

# 2026-11-23 · Fatura do mês e Pix da mensal [011/T015]
- /lojistas/pagamento só existe para a loja recém-cadastrada; a mensal ganha o próprio endereço no painel.

# 2026-11-23 · e2e do ciclo de cobrança [011/T018]
- Sem CRON_SECRET local, o seed roda o ciclo real restrito à loja de teste; a migration 0020 foi aplicada no staging.

# 2026-11-23 · Fechamento da 011 [011/verify]
- Spec ajustada com o dono: volta a ativa sem fatura vencida, reativar sem nada vencido → ativa, sem alerta de cobrança com comprovante em conferência.

# 2026-11-23 · 008b · spec, plano, tasks e documentos [008b/T001]
- Desfazer o Recebi em 24 h pede a data do Recebi do vendedor (D1); 'Em análise' fica para a fase 2.

# 2026-11-23 · 010 · spec, plano, tasks e documentos [010/T001]
- Recompensa uma por fatura (idempotente) e status calculados (D1); billing lança o crédito (D3).

# 2026-11-23 · Avisos e área do Caju Indica [010/T003]
- D4: o vendedor indica pelo mesmo painel sem ganhar o papel de indicador.

# 2026-11-24 · Caju Indica na cobrança [010/T005]
- D3: billing lança o crédito com o que referrals devolve; D5: a paga com crédito também rende.

# 2026-11-24 · Landing do link e banner na vitrine [010/T011]
- Slot na vitrine para showcase não depender de referrals.

# 2026-11-24 · Fechamento da 010 [010/verify]
- A 009b (13a, 13b, 13d) não tinha seção no PLAN; entrou entre a 010 e a 010b.

# 2026-11-24 · 011b/T001 documentos do cancelamento
- Os documentos de referência descrevem o cancelamento antes do código, como pede o SDD.

# 2026-11-24 · 011b/T002 migration 0023
- Reassinar (CAN-FR-006) abre uma nova 1ª mensalidade; o índice antigo permitia só uma por loja para sempre. Só uma aberta por vez mantém a proteção contra dois checkouts.

# 2026-11-24 · 011b/T003 avisos e motivos do cancelamento
- Frases e motivos ficam prontos antes das ações que os usam.

# 2026-11-24 · 011b/T004 cancelar e desfazer
- O motivo vai para o registro e para a loja, nunca dado pessoal; cancelar em atraso sem dívida segue o /clarify.

# 2026-11-24 · 011b/T005 fim do período
- A loja sai do ar no dia do vencimento que não será cobrado; partir do status esperado mantém o job idempotente.

# 2026-11-24 · 011b/T006 reassinar
- Reaproveita o fluxo da 004 em vez de um fluxo de pagamento novo; a arquivada não reassina porque os dados já foram apagados.

# 2026-11-24 · 011b/T007 arquivamento
- LGPD (CAN-SEC-003): apagamento real depois da retenção. D7 no plano: perfil anônimo e veículo vendido mantidos para a contabilidade e o extrato.

# 2026-11-24 · 011b/T008 endereço provisório
- Quem não paga em 7 dias não segura o endereço de outra loja (CAN-FR-008).

# 2026-11-24 · 011b/T009 editar plano
- D3: a vigência das regras (ADR 0010) já escolhe o valor na abertura de cada fatura, sem tabela de planos.

# 2026-11-24 · 011b/T010 telas no servidor
- Os dados das telas [3c], [4b] e do aviso ficam prontos e testados antes dos componentes.

# 2026-11-24 · 011b/T011 tela do cancelamento
- O lojista cancela e desfaz sozinho, sem falar com a CajuGo (CAN-FR-001..003, 006).

# 2026-11-24 · 011b/T012 404 da loja cancelada e [4b]
- ADR 0013: o status real sai do proxy; o ajuste da D4 está no plano.

# 2026-11-24 · 011b/T013 e2e do cancelamento
- O e2e de Editar plano não salva: setting_values só aceita inserção e uma mensalidade futura ficaria no staging; o caminho que salva está nos testes de integração.

# 2026-11-24 · 011b/T014 verificação
- Achado na revisão: cancelar na hora com um pagamento por conferir deixaria o comprovante sem fatura aberta.

# 2026-11-24 · 012/T001 base visual
- O dono do produto pediu o design seguido à risca; a base do DESIGN.md §3 vem antes das telas.

# 2026-11-24 · 012/T002 confirmações [6f]
- Fidelidade ao [6f] do design.

# 2026-11-24 · 012/T003 moldura
- Os menus do design: sidebar escura no desktop, barra branca no celular.

# 2026-11-24 · 012/T004 fotos e capturas
- A comparação com o design precisa de fotos de carro e de capturas repetíveis.

# 2026-11-24 · 012/T005-T006 Meus veículos [1c]/[15b]
- Fidelidade às capturas [1c] e [15b].

# 2026-11-24 · 012/T019 vitrine [15a]/[9a] e filtros na própria tela
- Pedido do dono do produto: vitrine idêntica ao design, fundo claro sem a faixa laranja, filtros na própria tela (DSG-FR-018).

# 2026-11-24 · 012 logo e specs 014/014b
- Pedido do dono do produto: a CajuGo vende todos os tipos de veículo, e a marca passa a ser 'CajuGo Veículos'.

# 2026-11-24 · 012/T007-T009 Leads, Minha loja, Conta e página da loja
- Fidelidade às capturas do Turno 03 e [1a] modo lojista; pedidos do dono (filtro Vendido, Vendidos no mês).

# 2026-11-24 · 012 Leads com Perdido e espaço do botão flutuante
- Pedido do dono (a conta dos filtros não fechava); o último card ficava embaixo do botão flutuante.

# 2026-11-24 · 012 simulador [14b], avisos compactos e marcas mais procuradas
- Pedidos do dono do produto: tela de simulação, avisos tomando a tela do admin, marcas do Brasil e mais informações do veículo.

# 2026-11-24 · 012 marcas de carro na ordem do dono e anexo de marcas na 014
- Pedido do dono do produto com as principais marcas do Brasil por tipo.

# 2026-11-24 · 012/T010 fatura e Pix; avisos em 'Atualizações'
- Fidelidade a [10c]/[6c]; pedido do dono de levar os avisos para baixo, num card.

# 2026-11-24 · 012/T011 cadastro de veículo [2a]
- Fidelidade ao [2a] (Turno 02).

# 2026-11-24 · 012/T012 Assinaturas [4b]
- Fidelidade ao [4b] (Turno 04).

# 2026-11-24 · 012 avisos só na tela Avisos
- Pedido do dono do produto: avisos num único lugar por painel (DSG-FR-020).

# 2026-11-24 · 012/T013 Conta admin [4c]
- Fidelidade ao [4c]; a Equipe CajuGo com Convidar fica na 012b.

# 2026-11-24 · 012b/T001 documentos e permissões
- Base da 012b; reaproveita admin.read em vez de criar admin.view (ajuste da D5).

# 2026-11-24 · 012b/T002 migration 0024
- Logs e histórico da loja paginados sem varrer a tabela.

# 2026-11-24 · feat(settings): histórico das regras na própria tela [012]
- O dono do produto não quer abrir outra página para ver informação que cabe na tela anterior.

# 2026-11-24 · feat(admin): item Log com o histórico das regras [012]
- O dono do produto quer os históricos num só lugar, sem poluir as outras telas.

# 2026-11-24 · feat(painel): informações na própria tela [012]
- O dono do produto não quer botões que só levam a outra página com informação que cabe na tela de origem.

# 2026-11-24 · feat(admin): painel [4a]/[15c] [012b/T003]
- Dar ao admin a saúde do negócio em 5 segundos (ADM-FR-001..003); o domínio admin só compõe, sem regra própria.

# 2026-11-24 · feat(stores): lista de lojas do admin [012b/T004]
- ADM-FR-004 e ADM-NFR-003; regra do dono do produto de manter a informação na tela de origem.

# 2026-11-24 · feat(admin): detalhe da loja [012b/T006]
- ADM-FR-008, ADM-SEC-004/005; o domínio admin só compõe as leituras de cada domínio.

# 2026-11-24 · docs(vehicle-types): máquinas pesadas [014]
- Pedido do dono: o lojista também vende máquinas pesadas, que não têm FIPE.

# 2026-11-24 · feat(stores): nova loja pelo admin [012b/T007]
- ADM-FR-005, ADM-SEC-002/003; reaproveita o createStore do cadastro com a origem do papel e o autor do registro como parâmetro.

# 2026-11-24 · feat(stores): editar dados da loja pelo admin [012b/T008]
- ADM-FR-010, ADM-SEC-002; mesmo schema de Minha loja para não divergir das regras da 003.

# 2026-11-24 · feat(showcase): vitrine de veículos e faixa de tipos na spec [014]
- Pedido do dono: a vitrine não é só de carros, e o primeiro filtro é o tipo de veículo, com ilustração.

# 2026-11-24 · feat(admin): logs de atividade com filtros [012b/T009]
- ADM-FR-011, ADM-FR-015, ADM-SEC-005; o histórico da loja é o Log filtrado por ela (regra do dono, 2026-11-25).

# 2026-11-24 · feat(showcase): veículos novos e seminovos; abas Buscar e Vender na spec [014]
- Pedidos do dono do produto em 2026-11-25, com a referência visual das abas Buscar/Vender.

# 2026-11-24 · feat(auth): equipe CajuGo [012b/T010]
- ADM-FR-012, ADM-SEC-002/003; equipe e clientes não se misturam (AUT-SEC-009).

# 2026-11-24 · docs(vehicle-types): ilustrações SVG dos tipos [014]
- Fonte das ilustrações da faixa de tipos (TIP-FR-007/020), enviadas pelo dono do produto; as versões leves para o site saem na implementação.

# 2026-11-24 · feat(moderation): veículos CajuGo do admin [012b/T011]
- ADM-FR-006; no domínio moderation porque reaproveita o card e a regra de [14e] e a mesma permissão (admin.moderate).

# 2026-11-24 · feat(admin): lojas [1d] com as abas [012b/T013]
- ADM-FR-004, 006, 007, ADM-NFR-001; o título some no celular como na captura [1d], e fica para leitor de tela.

# 2026-11-24 · feat(admin): ocultados e mostrar de novo em Veículos [012b]
- Pedido do dono: o admin precisa desfazer o ocultar e ter certeza antes de ocultar; o veículo oculto sumia da lista.

# 2026-11-24 · fix(showcase): rodapé da parcela estimada diz onde simular [006c]
- O dono leu 'Simule a sua parcela' como algo pendente: a lista não tem simulador, ele fica na página do veículo [14b].

# 2026-11-24 · feat(admin): nova loja dentro de Lojas [012b/T014]
- ADM-FR-005, ADM-SEC-003; regra do dono: sem página própria, o formulário abre onde está o botão.

# 2026-11-24 · docs(price-compare): spec, plano e tasks [015]
- Pedido do dono do produto em 2026-11-25, com as referências da Webmotors: nada de 'simulação imaginária'.

# 2026-11-24 · feat(fipe): FIPE pela fipe.api.br v2 [015/T001]
- PRC-FR-002: escolha do dono do produto (API gratuita, sem chave, 500 consultas/dia); a v2 também cobre motos e caminhões (spec 014).

# 2026-11-24 · docs(laudo-caju): rascunho da spec [016]
- Pedido do dono em 2026-11-25, com a referência do Vistoriado da Webmotors; as decisões de negócio ficam como pendências para o /clarify.

# 2026-11-24 · docs(laudo-caju): consulta veicular por Pix, plano e tasks [016]
- Decisões do dono em 2026-11-25 ('bem simples').

# 2026-11-24 · feat(showcase): faixa de tipos, Buscar e Vender e abertura da vitrine [014]
- Pedido do dono com as referências da Boat24; as ilustrações vêm dos SVGs enviados (os tipos sem desenho repetem o mais parecido).

# 2026-11-24 · feat(site): página inicial, vitrine em /veiculos e menus do site [017]
- Pedidos do dono em 2026-11-25 (referências dos grandes classificados); ADR 0013 atualizada para a nova rota da vitrine.

# 2026-11-24 · feat(site): Rede Caju em /rede-caju, cabeçalho centralizado e menu nas páginas de erro [017]
- Pedidos do dono em 2026-11-25: 'rede' sozinho não diz o que é; menu em todas as páginas públicas, inclusive as de erro.

# 2026-11-24 · feat(showcase): Comprar · Vender, faixa do Caju Indica abaixo do quadro e abertura sem contagem [017]
- Pedidos do dono em 2026-11-25 (preferiu a faixa simples ao carrossel).

# 2026-11-24 · feat(showcase): página de cada tipo (/carros, /motos…) e fim do índice de marcas e cidades [014]
- Pedido do dono: caminhos em vez de filtro, melhor para o SEO; e não gostou do índice.

# 2026-11-24 · feat(showcase): fim da parcela estimada e filtro de condição [015/T002]
- PRC-FR-003 e pedido do dono: nada de 'simulação imaginária'; e saber se o veículo é novo, seminovo ou usado.

# 2026-11-24 · feat(showcase): Conversar no card e dados do Compare os preços [015]
- Pedido do dono (botão no card) e PRC-FR-001/PRC-SEC-002; o bloco na tela vem com o novo layout da página do veículo.

# 2026-11-24 · feat(showcase): só novo e usado; Conversar ao lado do modelo e preço [017]
- Pedidos do dono em 2026-11-25.

# 2026-11-24 · feat(site): rodapé do site em todas as páginas públicas [015/T008]
- PRC-FR-009 e pedido do dono: footer em toda página com header, inspirado no da Webmotors e com o menu da CajuGo.

# 2026-11-24 · feat(showcase): página do veículo completa [015/T003-T007]
- PRC-FR-001/004–008 e pedidos do dono em 2026-11-25 (referência da Webmotors; imagem menor para não perder qualidade; sem emojis).

# 2026-11-24 · feat(site): entrar e cadastros com versão para desktop [017]
- Pedido do dono: melhorar essas telas, com desktop e ajustes no celular.

# 2026-11-24 · fix(site): painel das telas de cadastro acompanha a rolagem [017]
- Pedido do dono: nos cadastros longos o painel acabava e deixava um vazio ao lado dos campos.

# 2026-11-24 · feat(site): cadastros com Como funciona e perguntas frequentes no lugar do painel fixo [017]
- O dono não gostou do painel congelado: 'dá agonia'.

# 2026-11-24 · fix(site): /lojistas sem a barra fixa; e2e ajustados ao novo layout [017]
- Pedido do dono: a linha congelada não ficou boa.

# 2026-11-24 · feat(db): remove a coluna da parcela estimada [015]
- Remoção autorizada pelo dono; apagar o histórico das regras exigiria desligar a proteção de auditoria, então ele fica (o código não lê mais essas chaves).

# 2026-11-24 · feat(site): páginas de vendas do Caju Indica e da Rede Caju; Vender e Descobrir separados [017]
- Pedidos do dono em 2026-11-25: uma página exclusiva e completa por produto, ligada aos cadastros; contato fica para depois.

# 2026-11-24 · feat(site): página de vendas do Catálogo para lojas em Descobrir [017]
- Pedido do dono: em Descobrir, uma página de vendas própria para o lojista, não o atalho para /lojistas.

# 2026-11-24 · test(showcase): e2e da página do veículo e do rodapé; 015 implementada [015/T005]
- Fechamento da 015: todo FR e SEC com teste nomeado pelo ID.

# 2026-11-24 · docs(referrals): spec da indicação legítima [018]
- Pedido do dono: indicações legítimas, contra golpe.

# 2026-11-24 · feat(sellers): Rede Caju deixa claro que é vendedor independente [017]
- Pedido do dono.

# 2026-11-24 · feat(sellers): aprovação dupla e avaliação dos vendedores na Rede Caju [017]
- Pedido do dono: deixar claro como os vendedores são escolhidos e acompanhados.

# 2026-11-24 · feat(showcase): vitrine vazia fala com o comprador; Rede Caju pela plataforma [017]
- Pedidos do dono em 2026-11-25.

# 2026-11-24 · fix(showcase): filtro sem marcas diz que ainda não há veículos [017]
- Pedido do dono: a lista vazia parecia falta de marcas, mas é falta de veículos.

# 2026-11-24 · feat(site): abertura mais direta, setas no celular e página do leilão [017]
- Pedidos do dono em 2026-11-25.

# 2026-11-24 · docs(vehicles): spec da procedência e situação do veículo [019]
- Regras do dono do produto em 2026-11-25 contra golpe e desistência; ele pediu para completar como fosse melhor.

# 2026-11-24 · feat(db): pedidos do LaudoCaju, preço e permissão [016/T001]
- LAU-FR-007, LAU-SEC-003; base para o pedido, o Pix e a fila.

# 2026-11-25 · feat(laudos): pedido do LaudoCaju e tela do Pix [016/T002]
- LAU-FR-003, 004, 007, LAU-SEC-001; o código no Pix ajuda o admin a achar o pagamento no extrato.

# 2026-11-25 · fix(site): página do leilão estática; build da Vercel volta a passar [017]
- Deploy quebrado na Vercel (Cache Components não aceita connection() fora de Suspense); a página de vendas estática também é melhor para o SEO.

# 2026-11-25 · fix(settings): regra nova sem valor no banco usa o valor inicial [002]
- O build da Vercel quebrou no prerender: o prod ainda não tem a migration 0026 (laudo_price_cents). Uma regra nova nunca mais derruba o site.

# 2026-11-25 · docs: migrations 0024, 0025 e 0026 aplicadas no prod
- Autorizado pelo dono em 2026-11-25, depois de conferir que o deploy no ar já não usava a coluna removida.

# 2026-11-25 · Pedidos de contato no admin [017]
- Regra do dono: nenhum telefone ou dado pessoal da equipe/donos em página pública (HOM-SEC-001). Quem quer falar com a CajuGo deixa o contato e a equipe chama; o pedido fica em Contatos (admin e suporte), e não em Alertas, porque não depende de veículo.
- O valor inicial do WhatsApp de atendimento continua igual ao da migration 0005 (já aplicada e no histórico do Git); ele só aparece em áreas logadas da loja. A vitrine sem veículo mantém o filtro lateral para a página não perder a estrutura (pedido do dono).

# 2026-11-25 · Faixa do Caju Indica no fim da vitrine [010]
- Pedido do dono: o rodapé não fica colado no fim do filtro lateral; o espaço recebe a faixa, e o topo fica só com a busca.

# 2026-11-25 · Botão Sair visível e barra escura [012]
- Pedido do dono: o avatar solto não parecia botão e escondia o Sair; o botão diz o que faz. A barra do celular segue a cor da sidebar do desktop, para as áreas logadas terem uma identidade só.

# 2026-11-25 · Planos da 014, 018 e 019
- Ficha por tipo e procedência em colunas (não jsonb) para filtrar com índice; FIPE de motos e caminhões na mesma cópia sob demanda, com prefixo no id para não mexer nos carros. Indicação contestada retém a recompensa e, mantida, paga as retidas uma vez (recompensa é por fatura).

# 2026-11-25 · 017 fechada [017/T004]
- A auditoria de acessibilidade do e2e achou as setas da faixa de tipos com 36 px; subiram para 44 px (DESIGN.md §7). Com isso a 017 fecha e o próximo é o resto da 012b.
