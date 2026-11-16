# Contrato · 006d Avisar quando chegar

| Método | Path | Auth | Rate limit | Idempotente | Requisitos |
|---|---|---|---|---|---|
| GET | /api/v1/cron/daily | `Authorization: Bearer {CRON_SECRET}` (Vercel Cron) | não (só o cron chama) | sim | ALR-SEC-004 |

## Respostas
- `200`: `{ "data": { "expiredAlerts": number, "rateLimitsBefore": ISO 8601 } }` (quantos alertas venceram agora e até quando os contadores de rate limit foram apagados), com `Cache-Control: no-store`.
- `401`: sem o cabeçalho ou com segredo diferente (comparação em tempo constante); nada é executado.
- `500`: falha numa etapa; o erro vai para o log sem dado pessoal, e a próxima execução refaz.
- Erros no formato do `API.md` §3 (`{ error: { code, message } }`): `unauthorized`, `internal`.

## Notas
- **Agenda:** 1×/dia às 06:00 UTC (03:00 em Brasília), em `vercel.json` › `crons`; o plano Hobby só permite diário.
- **Repetição:** rodar duas vezes no mesmo dia não muda nada. Alerta já vencido não volta a contar, e rate limit já limpo não existe mais.
- **Etapas:**
  - `purgeExpired`: alerta pendente com `created_at` + validade das regras no passado → `expired`, apagando nome e celular.
  - `purgeRateLimits`: apaga as janelas com mais de 2 dias (a maior janela é de 1 dia).
- **Jobs das próximas specs** (vencimentos, faturas, suspensão) entram nesta mesma rota, cada um idempotente.
- Fora do `robots.txt` (`/api` já está em `PRIVATE`).
