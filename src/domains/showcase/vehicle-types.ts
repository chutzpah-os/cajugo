/**
 * Tipos de veículo da vitrine (spec 014, TIP-FR-001/007/008), na ordem da spec: o
 * `slug` é o valor do filtro, `path` a página do tipo (`/motos`, melhor para o SEO que
 * `?tipo=`), `title` é o título da vitrine com o tipo, e
 * `image` a ilustração da faixa de tipos (`public/tipos`, enviadas pelo dono; os
 * tipos sem desenho próprio repetem o mais parecido).
 */
export const VEHICLE_TYPES = [
  {
    slug: "carro",
    path: "/carros",
    label: "Carro",
    title: "Carros novos e usados à venda",
  },
  {
    slug: "moto",
    path: "/motos",
    label: "Moto",
    title: "Motos novas e usadas à venda",
  },
  {
    slug: "scooter",
    path: "/scooters",
    label: "Scooter",
    title: "Scooters novas e usadas à venda",
  },
  {
    slug: "picape",
    path: "/picapes",
    label: "Picape",
    title: "Picapes novas e usadas à venda",
  },
  {
    slug: "van",
    path: "/vans",
    label: "Van e furgão",
    title: "Vans e furgões novos e usados à venda",
  },
  {
    slug: "onibus",
    path: "/onibus",
    label: "Ônibus e micro-ônibus",
    title: "Ônibus e micro-ônibus novos e usados à venda",
  },
  {
    slug: "caminhao",
    path: "/caminhoes",
    label: "Caminhão",
    title: "Caminhões novos e usados à venda",
  },
  {
    slug: "trator",
    path: "/tratores",
    label: "Trator",
    title: "Tratores novos e usados à venda",
  },
  {
    slug: "quadriciclo",
    path: "/quadriciclos",
    label: "Quadriciclo e UTV",
    title: "Quadriciclos e UTVs novos e usados à venda",
  },
  {
    slug: "maquinas",
    path: "/maquinas",
    label: "Máquinas pesadas",
    title: "Máquinas pesadas novas e usadas à venda",
  },
  {
    slug: "motorhome",
    path: "/motorhomes",
    label: "Motorhome e trailer",
    title: "Motorhomes e trailers novos e usados à venda",
  },
  {
    slug: "implementos",
    path: "/implementos",
    label: "Implementos",
    title: "Implementos novos e usados à venda",
  },
] as const;

export type VehicleTypeSlug = (typeof VEHICLE_TYPES)[number]["slug"];

export const typeImage = (slug: VehicleTypeSlug) => `/tipos/${slug}.webp`;

export function vehicleType(slug: VehicleTypeSlug) {
  return VEHICLE_TYPES.find((t) => t.slug === slug)!;
}

export function isVehicleType(v: string): v is VehicleTypeSlug {
  return VEHICLE_TYPES.some((t) => t.slug === v);
}

/**
 * Até a 014 gravar o tipo no veículo, o cadastro só aceita carros (FIPE de carros):
 * todo veículo publicado é carro, e os outros tipos ainda não têm anúncio.
 */
export const TYPE_OF_EVERY_VEHICLE: VehicleTypeSlug = "carro";

/** Página do tipo pelo caminho (`/motos` → moto); o resto é `undefined`. */
export function typeByPath(path: string) {
  return VEHICLE_TYPES.find((t) => t.path === path);
}
