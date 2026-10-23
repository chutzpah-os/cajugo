# CajuGo — Design do MVP

## Conteúdo
- `CajuGo Telas.dc.html` — telas 1a–6g (mobile, 390 px) num canvas navegável. Abra no navegador (precisa de internet para as fontes). Precisa do `support.js` na mesma pasta.
- `telas/` — capturas de **todas** as telas, uma pasta por turno (`Turno 01 · …` a `Turno 15 · …`). Nos turnos 7–15 cada arquivo tem o id da tela (ex.: `7e.png`).
- `carexamplesimages/` — fotos ilustrativas de veículos, úteis como dados de exemplo (seed).
- `DESIGN.md` — sistema visual, componentes, padrões de UX, telas e microcopy.
- Requisitos de cada tela: `../PRD.md` §7.

## Mapa de telas
| Turno | Pasta em `telas/` | Telas |
|---|---|---|
| 1 | Catálogo, veículo e gestão | 1a Catálogo (CajuGo / Lojista) · 1b Página do veículo · 1c Meus veículos · 1d Admin: Lojas, Veículos, Usuários |
| 2 | Cadastro de novo veículo | 2a Novo veículo |
| 3 | Leads, Minha loja e Conta | 3a Leads · 3b Minha loja · 3c Conta |
| 4 | Painel, Assinaturas e Conta | 4a Painel · 4b Assinaturas · 4c Conta (admin) |
| 5 | Do menu ao catálogo da loja | 5a Menu (antigo) · 5b Landing · 5c Cadastro · 5d Pagamento · 5e Assinatura ativa |
| 6 | Login, Pix, filtros… | 6a Entrar (antigo) · 6b Recuperar senha · 6c Pix · 6d Filtros · 6e Editar veículo · 6f Confirmações · 6g Detalhe da loja |
| 7 | Rede Caju | 7a Cadastro do vendedor · 7b Painel · 7c Vitrine/compartilhar · 7d Extrato · 7e Comissão · 7f Vendedores · 7g Confirmar venda · 7h Vendedores (admin) |
| 8 | Caju Indica | 8a Página · 8b Indicações · 8c Landing do link · 8d Cadastro com código · 8e Crédito · 8f Regras (admin) · 8g Indicações (admin) |
| 9 | Indicador e login único | 9a Vitrine com banner · 9b Cadastro rápido · 9c Código (fase 2) · 9d Painel · 9e Resgate Pix · 9f Login único |
| 10 | Pix manual | 10a Em análise · 10b Pagamentos (admin) · 10c Fatura |
| 11 | Menu da home | 11a Menu |
| 12 | Estados e casos | 12a Busca sem resultado · 12b Sem conexão · 12c Carregando · 12d Veículo indisponível · 12e Comprovante recusado · 12f/12g Loja suspensa · 12h Cancelar · 12i Termos |
| 13 | Rede Caju (lojista) | 13a Vendedores disponíveis · 13b Perfil · 13c Conta do vendedor · 13d Denunciar |
| 14 | Comprador e moderação | 14a Favoritos · 14b Simulador · 14c Aprovação (admin) · 14d Denunciar anúncio · 14e Denúncias (admin) |
| 15 | Desktop | 15a Vitrine · 15b Painel do lojista · 15c Admin |

> As capturas dos turnos 1–6 ainda mostram o nome antigo (CajuCar). Vale CajuGo. Onde o desenho diverge do PRD (ex.: aba "Celular" em 9f, cartão em 5d), vale o PRD.
