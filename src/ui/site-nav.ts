/**
 * Menus do site (017, HOM-FR-003): o mesmo conteúdo no cabeçalho do desktop e no menu
 * do celular. `href: null` é um serviço que ainda não existe (selo **Em breve**).
 */
export type NavItem = { label: string; href: string | null };
export type NavSection = { key: string; label: string; items: NavItem[] };

export const SITE_NAV: NavSection[] = [
  {
    key: "comprar",
    label: "Comprar",
    items: [
      { label: "Veículos novos (0 km)", href: "/veiculos?estado=novo" },
      { label: "Veículos usados", href: "/veiculos?estado=usado" },
      { label: "Carros", href: "/carros" },
      { label: "Motos", href: "/motos" },
      { label: "Picapes", href: "/picapes" },
      { label: "Caminhões", href: "/caminhoes" },
      { label: "Todos os veículos", href: "/veiculos" },
      { label: "Favoritos", href: "/favoritos" },
    ],
  },
  {
    key: "vender",
    label: "Vender",
    items: [
      { label: "Anunciar minha loja", href: "/lojistas" },
      { label: "Ser vendedor da Rede Caju", href: "/rede-caju/cadastro" },
      { label: "Indicar uma loja (Caju Indica)", href: "/indica/cadastro" },
    ],
  },
  {
    key: "aluguel",
    label: "Aluguel",
    items: [{ label: "Aluguel de veículos", href: null }],
  },
  {
    key: "financiar",
    label: "Financiar",
    items: [{ label: "Simular financiamento", href: null }],
  },
  {
    key: "servicos",
    label: "Serviços",
    items: [
      { label: "LaudoCaju · Laudo", href: null },
      { label: "Skipper · Entrega", href: null },
      { label: "Leilão", href: null },
    ],
  },
  {
    key: "cuidar",
    label: "Cuidar",
    items: [
      { label: "Mecânica", href: null },
      { label: "Lava-jato", href: null },
      { label: "Funilaria e pintura", href: null },
      { label: "Revisão", href: null },
      { label: "Seguro do veículo", href: null },
    ],
  },
  {
    key: "assinar",
    label: "Assinar",
    items: [
      { label: "Plano Catálogo para lojas", href: "/lojistas" },
      { label: "Carro por assinatura", href: null },
    ],
  },
  {
    key: "descobrir",
    label: "Descobrir",
    items: [
      { label: "Tabela FIPE", href: null },
      { label: "Caju Indica", href: "/indica/cadastro" },
    ],
  },
];
