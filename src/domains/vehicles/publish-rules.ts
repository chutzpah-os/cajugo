/**
 * O que um veículo precisa ter para ficar publicado (VEH-FR-009). Sem dependência de
 * servidor: a tela usa as mesmas mensagens antes de existir rascunho.
 */
export const PUBLISH_REQUIRED = [
  ["fipeBrandId", "Escolha a marca."],
  ["fipeModelId", "Escolha o modelo e a versão."],
  ["fipeYearId", "Escolha o ano modelo."],
  ["yearManufacture", "Informe o ano de fabricação."],
  ["mileageKm", "Informe a quilometragem."],
  ["transmission", "Escolha o câmbio."],
  ["fuel", "Escolha o combustível."],
  ["priceCents", "Informe o preço."],
] as const;

export const PHOTO_REQUIRED = "Envie pelo menos 1 foto.";
