---
id: 019
slug: vehicle-provenance
title: Procedência e situação do veículo (leilão, sinistro, restrições)
status: planned
owner: dono do produto
created: 2026-11-25
---

# 019 · Procedência e situação do veículo

## Contexto
Veículo de leilão, sinistrado ou com restrição é a maior fonte de golpe e de desistência na compra de usados. O dono do produto definiu (2026-11-25) três grupos: o que é anunciado livremente, o que é anunciado com **aviso obrigatório** e o que é **bloqueado** na plataforma. Quem cadastra o veículo informa a procedência e a situação; a CajuGo mostra os avisos ao comprador, marca o que é de leilão e não deixa publicar o que não é apto ao varejo. Substitui e amplia o "Histórico do veículo" da 014 (TIP-FR-018).

## Atores
- **Lojista / usuário da loja**: informa a procedência e a situação no cadastro do veículo [2a].
- **Comprador**: vê o selo Leilão, os avisos e filtra pela procedência.
- **Admin**: vê o que a loja informou nas filas de aprovação e de denúncias.

## Requisitos funcionais
- **PRO-FR-001** O cadastro do veículo [2a] tem a seção obrigatória **Procedência e situação**, com estas perguntas:
  - **Procedência**: particular ou loja (sem restrições); ex-frota ou locadora; leilão de montadora ou fábrica; leilão de financiadora (banco);
  - **Sinistro**: nenhum; pequena monta; média monta já recuperada (CSV emitido e desbloqueio no Detran); inundação ou enchente recuperada (CSV concluído); média monta não regularizada (batido, sem CSV); grande monta ou sucata;
  - **GNV**: não tem; regularizado (no CRLV-e, CSV anual em dia); não averbado (clandestino);
  - **Chassi ou motor remarcado**: não; sim, regularizado e averbado no documento;
  - **Gravame (financiado)**: não; sim, com saldo a quitar ou transferir;
  - **Restrição judicial (RENAJUD) ou tributária**: não; sim;
  - **Roubo ou furto ativo**: não; sim.
- **PRO-FR-002** **Anunciados livremente** (padrão de mercado): sem restrições, ex-frota ou locadora, leilão de montadora, pequena monta e GNV regularizado. Nenhum aviso além do selo Leilão quando houver.
- **PRO-FR-003** **Anunciados com aviso obrigatório** (transparência): média monta recuperada, leilão de financiadora, inundação recuperada, chassi ou motor remarcado regularizado e gravame. A página do veículo [1b] mostra cada aviso num quadro em destaque, com o texto do que significa para o comprador (ex.: "Gravame: há saldo devedor a ser quitado ou transferido na negociação").
- **PRO-FR-004** **Bloqueados** (não aptos ao varejo): grande monta ou sucata, média monta não regularizada, restrição judicial ou tributária, roubo ou furto ativo e GNV não averbado. Ao escolher qualquer um, o cadastro mostra na hora "Este veículo não pode ser anunciado na CajuGo" com o motivo, e o veículo não é publicado (o servidor recusa, não só a tela).
- **PRO-FR-005** Veículo com passagem por **leilão** (de montadora ou de financiadora) mostra o selo **Leilão** no card [1a] e na página [1b].
- **PRO-FR-006** A vitrine tem o filtro **Procedência**: Histórico limpo (sem aviso nem leilão), Leilão, Média monta (recuperado) e Enchente (recuperado), na lateral e na folha de Filtros.
- **PRO-FR-007** Veículos já cadastrados antes desta spec ficam como "não informado" e não podem ser publicados de novo nem editados sem responder a seção (os publicados continuam no ar até a próxima edição).
- **PRO-FR-008** O cadastro só salva a seção com a caixa **"Declaro que as informações de procedência e situação são verdadeiras"** marcada; a declaração fica no registro de atividade com quem e quando.
- **PRO-FR-009** A ficha da página do veículo [1b] sempre mostra a **Procedência**, mesmo quando limpa ("Sem restrições"), com a observação "Informações declaradas pela loja".
- **PRO-FR-010** "Denunciar anúncio" [14d] ganha o motivo **Procedência ou sinistro omitido**; o admin trata como as outras denúncias (pode ocultar com motivo).
- **PRO-FR-011** Veículo com aviso obrigatório mostra, junto do quadro de avisos, a chamada para conferir com o **LaudoCaju** (quando a spec 016 estiver no ar).

## Requisitos de segurança e privacidade
- **PRO-SEC-001** A regra de bloqueio vale no servidor: publicar ou editar com qualquer item bloqueado responde erro, mesmo que a tela seja burlada.
- **PRO-SEC-002** Só a loja dona do veículo informa e altera a procedência dele; loja B não altera a da loja A.

## Critérios de aceite
### PRO-FR-003
- **Dado** um veículo com gravame
- **Quando** o comprador abre a página
- **Então** vê o aviso "Gravame: há saldo devedor a ser quitado ou transferido na negociação"

### PRO-FR-004
- **Dado** o cadastro de um veículo
- **Quando** o lojista marca "Grande monta ou sucata"
- **Então** vê "Este veículo não pode ser anunciado na CajuGo" e não consegue publicar; pela API, publicar responde erro

### PRO-FR-005
- **Dado** um veículo de leilão de financiadora
- **Quando** aparece na vitrine
- **Então** o card e a página mostram o selo Leilão e a página mostra o aviso

### PRO-FR-006
- **Dado** a vitrine com um veículo limpo, um de leilão e um de enchente recuperado
- **Quando** o comprador filtra Histórico limpo
- **Então** vê só o limpo

### PRO-FR-008
- **Dado** a seção preenchida sem marcar a declaração
- **Quando** o lojista salva
- **Então** vê o erro na caixa; marcada, salva e o registro guarda quem declarou e quando

### PRO-FR-010
- **Dado** um veículo anunciado como limpo que é de leilão
- **Quando** o comprador denuncia com o motivo Procedência ou sinistro omitido
- **Então** a denúncia aparece na fila do admin com esse motivo

### PRO-SEC-002
- **Dado** o lojista da loja B
- **Quando** tenta alterar a procedência do veículo da loja A
- **Então** recebe "não encontrado"

## Pendências
Nenhuma: regras do dono do produto em 2026-11-25. Recomendadas e adotadas (o dono pediu para completar como achar melhor): veículos antigos "não informado" até a próxima edição (PRO-FR-007), declaração de veracidade (PRO-FR-008), procedência sempre na ficha (PRO-FR-009), motivo novo de denúncia (PRO-FR-010) e a chamada do LaudoCaju (PRO-FR-011).
