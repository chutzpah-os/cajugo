# Contrato · 008 Rede Caju · vendedor

| Método | Path | Auth | Rate limit | Idempotente | Requisitos |
|---|---|---|---|---|---|
| GET | /api/v1/sellers/{sellerId}/document/{side} | admin, suporte ou o próprio vendedor | não (sessão obrigatória) | sim (leitura) | SEL-FR-004, SEL-SEC-009 |

`side` é `front` ou `back`.

## Respostas
- `200`: a foto do documento (`image/jpeg`, `image/png`, `image/webp`, `image/heic` ou `application/pdf`), com:
  - `Cache-Control: private, no-store`
  - `Content-Disposition: inline; filename="documento-{side}.{ext}"` (sem o nome original)
  - `X-Content-Type-Options: nosniff`
- `401`: sem sessão.
- `404`:
  - vendedor inexistente ou sem a foto daquele lado;
  - `side` fora de `front`/`back`;
  - quem pede não é admin, suporte nem o próprio vendedor.
- Erros no formato do `API.md` §3 (`{ error: { code, message } }`): `unauthorized`, `not-found`.

## Notas
- `sellerId` é validado como UUID; fora do formato → 404.
- O servidor lê o arquivo no Cloudinary pela Admin API (`type: authenticated`), como o comprovante da 004 (ADR 0011). Nenhuma URL do Cloudinary chega ao navegador.
- Abrir não grava no `activity_log` (é leitura).
