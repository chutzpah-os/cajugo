# Contrato · 006d Avisar quando chegar

| Método | Path | Auth | Rate limit | Idempotente | Requisitos |
|---|---|---|---|---|---|
| GET | /api/v1/cron/daily | `Authorization: Bearer {CRON_SECRET}` (Vercel Cron) | não (só o cron chama) | sim | ALR-SEC-004 |

## Respostas
- `200`: `{ "data": { "expiredAlerts": number, "purgedLeads": number, "rateLimitsBefore": ISO 8601, "opened": number, "pastDue": number, "suspended": number, "ended": number, "archived": number, "slugsReleased": number } }` (quantos alertas venceram agora, quantos leads perderam os dados pessoais por terem mais de 2 anos (007), até quando os contadores de rate limit foram apagados e, no ciclo de cobrança da 011, quantas faturas abriram e quantas lojas entraram em atraso ou foram suspensas; na 011b, quantas lojas terminaram o período depois do cancelamento, quantas foram arquivadas e quantos endereços viraram provisórios), com `Cache-Control: no-store`.
- `401`: sem o cabeçalho ou com segredo diferente (comparação em tempo constante); nada é executado.
- `500`: falha numa etapa; o erro vai para o log sem dado pessoal, e a próxima execução refaz.
- Erros no formato do `API.md` §3 (`{ error: { code, message } }`): `unauthorized`, `internal`.

## Notas
- **Agenda:** 1×/dia às 06:00 UTC (03:00 em Brasília), em `vercel.json` › `crons`; o plano Hobby só permite diário.
- **Repetição:** rodar duas vezes no mesmo dia não muda nada. Alerta já vencido não volta a contar, e rate limit já limpo não existe mais.
- **Etapas:**
  - `purgeExpired`: alerta pendente com `created_at` + validade das regras no passado → `expired`, apagando nome e celular.
  - `purgeRateLimits`: apaga as janelas com mais de 2 dias (a maior janela é de 1 dia).
  - `purgeOldLeads` (007): lead com mais de 2 anos perde nome, e-mail, telefone e mensagem (LED-SEC-006).
  - `runBillingCycle` (011): abre a fatura 3 dias antes do vencimento (uma por período), marca em atraso a loja com fatura vencida e suspende depois da tolerância; ao suspender, invalida o cache público. Cada mudança parte do status esperado, então repetir não faz nada.
- **Jobs das próximas specs** (cancelamento, arquivamento, endereços reservados) entram nesta mesma rota, cada um idempotente.
- Fora do `robots.txt` (`/api` já está em `PRIVATE`).
