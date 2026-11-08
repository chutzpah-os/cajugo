# Contrato · 004 Pix manual e ativação da loja

| Método | Path | Auth | Rate limit | Idempotente | Requisitos |
|---|---|---|---|---|---|
| GET | /api/v1/payments/{paymentId}/receipt | admin, suporte ou o lojista dono do pagamento | não (sessão obrigatória) | sim (leitura) | PIX-FR-007, PIX-SEC-001, PIX-SEC-002, PIX-SEC-003 |

## Respostas
- `200`: o arquivo do comprovante (`image/jpeg`, `image/png`, `image/webp`, `image/heic` ou `application/pdf`), com:
  - `Cache-Control: private, no-store`
  - `Content-Disposition: inline; filename="comprovante-{referencia}.{ext}"` (sem o nome original do arquivo)
  - `X-Content-Type-Options: nosniff`
- `401`: sem sessão.
- `404`:
  - pagamento inexistente;
  - pagamento de outra loja (para o lojista);
  - registro manual sem arquivo.
- Erros no formato do `API.md` §3 (`{ error: { code, message } }`): `unauthorized`, `not-found`.

## Notas
- `paymentId` é validado como UUID; fora do formato → 404.
- O servidor lê o arquivo no Cloudinary pela Admin API (`type: authenticated`). Nenhuma URL do Cloudinary chega ao navegador.
- O acesso não grava no `activity_log` (é leitura); ver o arquivo não muda o pagamento.
