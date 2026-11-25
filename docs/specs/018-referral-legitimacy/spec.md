---
id: 018
slug: referral-legitimacy
title: Indicação legítima · o lojista indicado vê e contesta
status: planned
owner: dono do produto
created: 2026-11-25
---

# 018 · Indicação legítima · o lojista indicado vê e contesta

## Contexto
No Caju Indica (010), quem indica ganha parte das mensalidades da loja indicada. Para evitar golpe (alguém que se diz indicador de uma loja que nunca falou com ele), o dono do produto quer que a pessoa da loja indicada, ligada ao CPF ou CNPJ da loja, **saiba que há uma indicação ativa** e possa **contestá-la**, falando com a equipe CajuGo, que pode invalidá-la. A checagem automática que já existe continua: autoindicação por e-mail, celular (no cadastro) e CPF/CNPJ (no pagamento) não vale (010, IND-FR-017).

## Atores
- **Lojista indicado** (dono da loja): vê e contesta.
- **Admin**: confere a contestação e invalida ou mantém. **Suporte**: vê, sem decidir.
- **Indicador**: vê o status da indicação (Contestada, Não válida) no próprio painel, sem o motivo.

## Requisitos funcionais
- **LEG-FR-001** A Conta do lojista, no card Caju Indica, mostra "Sua loja foi indicada por {nome de quem indicou}", com a data e o status, quando a loja tem indicação.
- **LEG-FR-002** **Não reconheço esta indicação** marca a indicação como **Contestada** (a recompensa fica suspensa enquanto isso) e abre o WhatsApp do atendimento CajuGo com a mensagem pronta (loja e código da indicação).
- **LEG-FR-003** O admin vê as indicações contestadas em Caju Indica, com contador no menu, e decide: **Invalidar** (com motivo; a indicação vira Não válida e não rende mais) ou **Manter** (volta a Ativa).
- **LEG-FR-004** O indicador vê "Contestada" ou "Não válida" na lista dele (010), sem o motivo nem os dados da loja além do nome.

## Requisitos de segurança e privacidade
- **LEG-SEC-001** O lojista indicado vê só o nome de quem indicou, nunca o contato dele.
- **LEG-SEC-002** Só o dono da própria loja contesta a indicação dela; loja B não contesta a da loja A. Só admin invalida ou mantém; tudo vai para o registro de atividade.

## Critérios de aceite
### LEG-FR-001
- **Dado** a loja indicada por "Ana"
- **Quando** o lojista abre a Conta
- **Então** vê "Sua loja foi indicada por Ana", a data e o status Ativa

### LEG-FR-002
- **Dado** a indicação ativa
- **Quando** o lojista toca em Não reconheço esta indicação
- **Então** ela fica Contestada, a recompensa do mês não é paga enquanto isso, e o WhatsApp do atendimento abre com a mensagem pronta

### LEG-FR-003
- **Dado** uma indicação contestada
- **Quando** o admin invalida com o motivo "indicação não reconhecida"
- **Então** ela fica Não válida e não rende mais; com Manter, volta a Ativa

### LEG-FR-004
- **Dado** a indicação invalidada
- **Quando** o indicador abre a lista
- **Então** vê "Não válida", sem o motivo

### LEG-SEC-001
- **Dado** a loja indicada
- **Quando** o lojista vê a indicação
- **Então** não aparece e-mail nem celular de quem indicou

### LEG-SEC-002
- **Dado** o lojista da loja B
- **Quando** tenta contestar a indicação da loja A
- **Então** recebe "não encontrado"; o suporte vê a fila sem os botões

## Pendências
Nenhuma: pedido do dono em 2026-11-25 ("quero que as indicações sejam legítimas"). Recomendadas e adotadas: recompensa suspensa enquanto contestada; contestação pelo WhatsApp do atendimento já cadastrado nas regras.
