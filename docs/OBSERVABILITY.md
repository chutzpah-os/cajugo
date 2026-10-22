# Observabilidade

Mínimo para o MVP, sem ferramenta paga.

## Logs
- `console.info/warn/error` com um objeto JSON: `{ event, requestId, userId?, storeId?, ... }`. Sem PII (`SECURITY.md` §11).
- Vistos em **Vercel → Logs** (retenção curta no Hobby: consulte o problema no mesmo dia).

## Eventos que valem log
| Evento | Nível |
|---|---|
| `auth.denied` (posse ou papel negado) | warn |
| `ratelimit.hit` | warn |
| `payment.webhook` (recebido, processado, duplicado, inválido) | info / error |
| `cron.daily` (início, fim, quantos registros alterados) | info |
| `upload.rejected` | warn |
| Erro não tratado | error |

## Auditoria de negócio
Tabela `activity_log` (`ARCHITECTURE.md` §4): quem fez o quê e quando. É o que o admin vê em "Logs de atividade" [4c].

## Cotas (olhar toda semana)
- Supabase → uso do banco (limite de 500 MB) e usuários ativos do Auth.
- Supabase → Query Performance: consultas lentas.
- Cloudinary → créditos do mês.
- Vercel → uso de funções e banda.

## Fase 2
Monitor de erros (ex.: Sentry, plano gratuito) e analytics de funil, quando escolhidos.
