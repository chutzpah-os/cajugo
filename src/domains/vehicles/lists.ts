/** Listas fechadas do formulário [2a] (PRD, VEH-FR-006). Código em inglês, tela em pt-BR. */

const list = <const T extends Record<string, string>>(t: T) => t;

export const TRANSMISSIONS = list({
  manual: "Manual",
  automatic: "Automático",
  cvt: "CVT",
  automated: "Automatizado",
});

export const FUELS = list({
  flex: "Flex",
  gasoline: "Gasolina",
  ethanol: "Etanol",
  diesel: "Diesel",
  electric: "Elétrico",
  hybrid: "Híbrido",
  cng: "GNV",
});

export const BODIES = list({
  hatchback: "Hatchback",
  sedan: "Sedã",
  suv: "SUV",
  pickup: "Picape",
  minivan: "Minivan",
  coupe: "Cupê",
  convertible: "Conversível",
  wagon: "Perua",
});

export const DOORS = [2, 3, 4, 5] as const;

export const CONDITIONS = list({
  acceptsTrade: "Aceita troca",
  singleOwner: "Único dono",
  ipvaPaid: "IPVA pago",
  licensed: "Licenciado",
  dealerServiced: "Revisões na concessionária",
  factoryWarranty: "Garantia de fábrica",
  armored: "Blindado",
});

export const FEATURES = list({
  airbag: "Airbag",
  alarm: "Alarme",
  heater: "Ar quente",
  airConditioning: "Ar condicionado",
  tripComputer: "Computador de bordo",
  rearDefroster: "Desembaçador traseiro",
  abs: "Freio ABS",
  absEbd: "Freios ABS com EBD",
  rearWiper: "Limpador traseiro",
  powerLocks: "Travas elétricas",
  powerWindows: "Vidros elétricos",
  electricSteering: "Direção elétrica",
  adjustableSteering: "Direção com ajuste",
  parkingSensor: "Sensor de estacionamento",
  rearCamera: "Câmera de ré",
  multimedia: "Central multimídia",
  leatherSeats: "Bancos de couro",
  sunroof: "Teto solar",
  alloyWheels: "Rodas de liga leve",
  cruiseControl: "Piloto automático",
});

export const keysOf = <T extends Record<string, string>>(t: T) =>
  Object.keys(t) as [keyof T & string, ...(keyof T & string)[]];

/** Limites do produto (D2 do plano 005): fixos, não são regras editáveis. */
export const MAX_PHOTOS = 20;
export const MAX_DESCRIPTION = 2000;
export const UNDO_SALE_DAYS = 7;
