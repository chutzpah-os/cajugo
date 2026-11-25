/**
 * Tipos de veículo da vitrine (spec 014, TIP-FR-001/007/008), na ordem da spec: o
 * `slug` vai na URL (`?tipo=moto`), `title` é o título da vitrine com o tipo, e
 * `image` a ilustração da faixa de tipos (`public/tipos`, enviadas pelo dono; os
 * tipos sem desenho próprio repetem o mais parecido).
 */
export const VEHICLE_TYPES = [
  { slug: "carro", label: "Carro", title: "Carros novos e seminovos à venda" },
  { slug: "moto", label: "Moto", title: "Motos novas e seminovas à venda" },
  {
    slug: "scooter",
    label: "Scooter",
    title: "Scooters novas e seminovas à venda",
  },
  {
    slug: "picape",
    label: "Picape",
    title: "Picapes novas e seminovas à venda",
  },
  {
    slug: "van",
    label: "Van e furgão",
    title: "Vans e furgões novos e seminovos à venda",
  },
  {
    slug: "onibus",
    label: "Ônibus e micro-ônibus",
    title: "Ônibus e micro-ônibus novos e seminovos à venda",
  },
  {
    slug: "caminhao",
    label: "Caminhão",
    title: "Caminhões novos e seminovos à venda",
  },
  {
    slug: "trator",
    label: "Trator",
    title: "Tratores novos e seminovos à venda",
  },
  {
    slug: "quadriciclo",
    label: "Quadriciclo e UTV",
    title: "Quadriciclos e UTVs novos e seminovos à venda",
  },
  {
    slug: "maquinas",
    label: "Máquinas pesadas",
    title: "Máquinas pesadas novas e seminovas à venda",
  },
  {
    slug: "motorhome",
    label: "Motorhome e trailer",
    title: "Motorhomes e trailers novos e seminovos à venda",
  },
  {
    slug: "implementos",
    label: "Implementos",
    title: "Implementos novos e seminovos à venda",
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
