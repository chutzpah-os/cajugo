# Segurança

> Regras de segurança e privacidade do CajuGo (Next.js na Vercel + Supabase Postgres e Auth + Cloudinary). Referências: OWASP API Top 10 e LGPD.
>
> **Este arquivo é lido pelo Claude Code.** As seções marcadas com 🤖 são obrigatórias. Em conflito com outro documento, este prevalece.

---

## 1. Princípios
1. **Seguro por padrão:** rota e action exigem sessão, a menos que sejam explicitamente públicas.
2. **Menor privilégio:** cada papel vê e altera só o que precisa.
3. **Dado pessoal é passivo:** não colete o que não usa, não exiba o que não precisa.

## 2. Ameaças principais

| Ameaça | Exemplo | Controle |
|---|---|---|
| Acesso a dado de outra loja (BOLA/IDOR) | Lojista edita veículo de outra loja trocando o id | Checagem de posse em toda action (§4) |
| Mass assignment | Lojista envia `hiddenByAdmin: false` | Schema de entrada sem campos privilegiados (`API.md` §2) |
| Spam de leads / denúncias | Bot envia milhares de formulários | Honeypot + rate limit (§6) |
| Anúncio fraudulento | Preço muito abaixo da FIPE, fotos roubadas | Botão de denúncia + ocultar pelo admin + aviso na UI |
| Clonagem de veículo | Usa a placa pública | Placa nunca exibida; só o último dígito |
| Upload malicioso | SVG com script, arquivo enorme | Upload assinado no Cloudinary com formatos e tamanho fixos (§5) |
| Fraude de pagamento | Webhook falso ativa a assinatura | Verificação de assinatura do webhook + consulta ao gateway (§7) |
| Exposição do banco | Data API do Supabase aberta com a `anon key` | Data API desligada + RLS sem policy (§4) |

## 3. Autenticação 🤖
- **Supabase Auth** com e-mail e senha. Senha mínima de 8 caracteres (configurada no painel do Auth).
- Login, logout e nova senha são **Server Actions**, que usam o cliente de servidor do Supabase (`@supabase/ssr`). O navegador não carrega o SDK do Supabase.
- Os cookies de sessão são gravados pelo servidor com `HttpOnly; Secure; SameSite=Lax; Path=/`.
- Para identificar o usuário no servidor, use `auth.getUser()` (ou `getClaims()`), que valida o token. **Nunca confie em `getSession()`** no servidor.
- O middleware do Next renova a sessão expirada a cada requisição.
- **Papel e loja ficam na tabela `profiles`**, lida no servidor junto com o usuário. O usuário não consegue alterar o próprio papel: nenhuma action aceita `role` ou `store_id`.
- **Recuperação de senha no MVP é manual** (PRD [6b]): o admin confere a identidade pelo WhatsApp e define uma senha temporária (`auth.admin.updateUserById`). A senha é gerada pelo servidor (aleatória, ≥ 12 caracteres), exibida uma vez ao admin, nunca gravada em log, e marca `profiles.must_change_password = true`. Enquanto a marca estiver ligada, o servidor só libera a tela Nova senha. A ação grava `activity_log`.
- Sem e-mails do Supabase Auth no MVP: confirmação de e-mail no cadastro desligada; contas criadas pelo admin já nascem com senha temporária.
- Erro de login genérico: "E-mail ou senha incorretos". Além do limite do próprio Supabase Auth, aplique rate limit por IP na action de login (§6).
- Logout e troca de senha encerram as outras sessões (`signOut({ scope: 'global' })` na troca de senha).
- Conta da equipe CajuGo só criada pelo admin (com senha temporária); não existe cadastro público de admin.

## 4. Autorização 🤖
- Helper único no servidor: `requireSession({ roles })` devolve `{ userId, role, storeId }` (de `auth.getUser()` + `profiles`) ou encerra com 401/403.
- **Posse:** `storeId` vem da sessão e entra **no `where` da própria query** (`where id = $1 and store_id = $2`). Sem resultado → **404**. Não busque primeiro para checar depois.
- Rotas `/admin` e actions de admin exigem `role` `admin` (ou `support` nas ações de leitura e moderação, conforme PRD §2.1).
- Lojista com assinatura `suspended` ou `canceled` só acessa a Conta (PRD §5.3). Isso é checado no servidor, não só na navegação.
- Todo teste de feature inclui o caso **"loja B tenta acessar o recurso da loja A"**.

### Supabase fechado por padrão
O navegador não acessa o Supabase, então tudo que ele expõe por padrão é fechado:
- **Desative a Data API (PostgREST)** no projeto, ou remova o schema `public` dos schemas expostos.
- **RLS ligado em todas as tabelas, sem nenhuma policy.** Nega tudo para `anon` e `authenticated`, como defesa extra.
- **Usuário de banco no MVP: o `postgres` do Supabase**, pelo pooler, tanto para a aplicação quanto para as migrations. Ele é dono das tabelas, então o RLS não se aplica a ele. A senha fica só no `.env.local` e nas variáveis da Vercel (`DEPLOYMENT.md`).
  - Consequência: o banco não impede a aplicação de alterar ou apagar qualquer tabela. A proteção é o código: toda escrita passa pela camada de serviço, e `activity_log` só recebe `insert` (nenhum serviço faz `update`/`delete` nela; revisar no `security-review`).
  - **Fase 2:** criar um usuário próprio (`app_user`) com acesso só às tabelas da aplicação e `activity_log` só com `INSERT`, deixando o `postgres` só para migrations.
- A `service_role key` só é usada no servidor, e apenas para tarefas administrativas do Auth (criar conta, definir senha temporária). A `anon key` também fica só no servidor.
- SSL obrigatório na conexão.

## 5. Uploads (Cloudinary) 🤖
- Só upload **assinado**; nunca habilite upload preset sem assinatura.
- O servidor define pasta, `public_id`, formatos permitidos (`jpg,png,webp,heic`), tamanho máximo (15 MB) e remoção de metadados (EXIF/GPS). O nome do arquivo do usuário é ignorado.
- Proibido: SVG, PDF, GIF animado.
- Ao receber o `publicId`, o servidor confere que está na pasta do veículo da loja da sessão.
- `CLOUDINARY_API_SECRET` só no servidor.

## 6. Entrada, saída e abuso 🤖
- Validação com schema e limites em todo campo (`API.md` §2). Texto livre até 2.000 caracteres (descrição) e 1.000 (mensagem de lead).
- **Nunca renderize HTML vindo do usuário** (sem `dangerouslySetInnerHTML` com conteúdo de usuário). O React já escapa texto.
- Ordenação e filtros vêm de listas fixas (whitelist), nunca direto da query string para a consulta.
- Formulários públicos (lead, denúncia, cadastro, login): campo **honeypot** (exceto no login) + **rate limit por IP** (ex.: 5/min e 30/dia), guardado na tabela `rate_limits`. Respostas 429 levam `Retry-After`.
- SQL só pelo Drizzle ou com `sql` template parametrizado. Proibido montar SQL concatenando texto de entrada.
- `?next=` após login só aceita caminho relativo interno.
- A API nunca busca URL informada pelo usuário.

## 7. Pagamentos 🤖
- Dados de cartão **nunca** passam pelo nosso servidor: tokenização no front pelo SDK do gateway.
- Webhook: valide a assinatura/segredo do gateway, **consulte o status no gateway** antes de ativar, e processe de forma idempotente (ID do evento gravado).
- CPF/CNPJ só é coletado para a nota fiscal e nunca aparece em tela pública.

## 8. Dados pessoais e LGPD 🤖

| Dado | Exibição | Log |
|---|---|---|
| CPF/CNPJ | só ao dono (mascarado) e ao admin | ❌ |
| E-mail e telefone do lojista | só no painel e no admin; o WhatsApp da loja é público por escolha dela | ❌ |
| Nome, e-mail e telefone de quem envia lead | só à loja do lead e ao admin | ❌ |
| Placa | nunca; só o último dígito | ❌ |
| IP de denúncia/rate limit | guardado como hash | ❌ |

- Formulário de lead com aviso de privacidade e link para a política.
- Exclusão de dados a pedido (manual pelo admin no MVP).
- Retenção: dados da loja 90 dias após cancelamento (PRD §5.3); leads 2 anos.
- Crie o projeto Supabase na região **São Paulo (`sa-east-1`)** e fixe as functions da Vercel em `gru1` (São Paulo), para ficarem perto do banco. O que rodar fora do Brasil entra na política de privacidade como transferência internacional.

## 9. Web (Next.js) 🤖
- Headers via `next.config`: `Content-Security-Policy` (`img-src` com o domínio do Cloudinary; `frame-ancestors 'none'`), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- Só `NEXT_PUBLIC_*` vai ao navegador. **Nunca** coloque com esse prefixo a URL do banco, as chaves do Supabase, o segredo do Cloudinary, o do gateway ou o `CRON_SECRET`.
- Cada Server Action revalida sessão e autorização.

## 10. Segredos e Claude Code
- Nada de segredo no repositório: `.env*` no `.gitignore`, `.env.example` só com nomes.
- Segredos de produção só nas variáveis de ambiente da Vercel, separadas por ambiente (Preview usa o projeto Supabase de **staging**).
- MFA nas contas Supabase, Vercel, Cloudinary, gateway e GitHub.
- O Claude Code não lê `.env*` (regra `deny` no `.claude/settings.json`) e só commita quando o dono pede.

## 11. Logs e auditoria
- Logs do servidor em JSON (`console` estruturado na Vercel), sem PII: use IDs, nunca nome, e-mail, telefone ou placa.
- `activity_log` (só inserção): login de admin, mudanças de status de veículo e assinatura, ações de admin, cancelamentos.

## 12. Checklist por PR 🤖
- [ ] Action/rota nova exige sessão; pública só se justificado
- [ ] Posse no `where` da query (`storeId` da sessão) + teste "loja B"
- [ ] Schema de entrada com limites e sem campos privilegiados; saída montada à mão
- [ ] Nenhum dado pessoal em resposta pública, log ou erro
- [ ] Formulário público com honeypot + rate limit
- [ ] Nada de HTML de usuário nem fetch de URL externa
- [ ] Segredo só no servidor
- [ ] Ação relevante registrada em `activity_log`
- [ ] Mudança de schema só por migration do Drizzle
