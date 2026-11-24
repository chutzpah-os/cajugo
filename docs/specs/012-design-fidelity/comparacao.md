# Comparação com o design · 012

Rotina:
1. `pnpm e2e:seed` e `pnpm dev`.
2. `pnpm design:shots [tela]` grava as capturas em `test-results/design/` (fora do git).
3. Comparar lado a lado com a captura de `docs/design/telas/<Turno>/` em 390 px (e com [15a]–[15c] em 1280 px).
4. Registrar abaixo: estrutura, ordem, componentes e textos. Diferença só com justificativa:
   - "conteúdo da spec NNN" (DSG-FR-016);
   - "sem captura de desktop: padrão [15b]/[15c]" (DSG-FR-017).

Legenda: ✅ igual ao design · ⚠️ diferença justificada · ⏳ a fazer.

| Tela | Captura | 390 | 1280 | Diferenças justificadas |
|---|---|---|---|---|
| Moldura do lojista | 1c, 15b | ✅ | ✅ | Avatar abre o menu da conta (trocar de painel e sair), já que o design não mostra onde ficam |
| Moldura do admin | 4a, 15c | ✅ | ✅ | O mesmo |
| [6f] Confirmações | Turno 06 | ✅ | ✅ | [12h]: motivos da lista da 011b, com as consequências da 011b numa nota (conteúdo da spec 011b) |
| [1c] Meus veículos | Turno 01 | ✅ | — | Status da assinatura no texto ("Ativo") e no selo, como na captura |
| [15b] Meus veículos | Turno 15 | — | ✅ | "Vendidos no mês" sem a dica "via Rede Caju" (o dado não existe na tela; conteúdo da spec 005) |
| [3a] Leads | Turno 03 | ⏳ | ⏳ | |
| [3b] Minha loja | Turno 03 | ⏳ | ⏳ | |
| [3c] Conta | Turno 03 | ⏳ | ⏳ | |
| [10c], [6c], [10a], [5d], [12e], [12f] | Turnos 06, 10, 12 | ⏳ | ⏳ | |
| [2a], [6e] | Turnos 02, 06 | ⏳ | ⏳ | |
| [4b] Assinaturas | Turno 04 | ⏳ | ⏳ | |
| [4c] Conta admin | Turno 04 | ⏳ | ⏳ | |
| [10b], [7h], [14c], [14e], [12a], [8f] | Turnos 07, 08, 10, 12, 14 | ⏳ | ⏳ | |
| [7a]–[7d], [13c] | Turnos 07, 13 | ⏳ | ⏳ | |
| [7e]–[7g] | Turno 07 | ⏳ | ⏳ | |
| [8a]–[8e], [9a], [9b], [9d] | Turnos 08, 09 | ⏳ | ⏳ | |
| [9f], Nova senha, [6b] | Turnos 06, 09 | ⏳ | ⏳ | |
| [1a], [15a], [6d] | Turnos 01, 06, 15 | ⏳ | ⏳ | |
| [1b], [14b], [14d], [12d] | Turnos 01, 12, 14 | ⏳ | ⏳ | |
| Página da loja, [12g], [12a]–[12c], [14a] | Turnos 05, 12, 14 | ⏳ | ⏳ | |
| [11a], [5b], [5c] | Turnos 05, 11 | ⏳ | ⏳ | |
