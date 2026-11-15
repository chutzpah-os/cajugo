/**
 * Nome da marca como o comprador conhece (DSC-FR-011). A FIPE grava alguns nomes com
 * prefixo ("GM - Chevrolet") ou todo em maiúsculas; siglas reais (BMW, BYD) ficam. Marca
 * nova fora da lista aparece com o nome da FIPE até entrar aqui.
 */
const CORRECTIONS: Record<string, string> = {
  "GM - Chevrolet": "Chevrolet",
  "VW - VolksWagen": "Volkswagen",
  "Kia Motors": "Kia",
  "Caoa Chery/Chery": "Caoa Chery",
  Mclaren: "McLaren",
  smart: "Smart",
  ARROW: "Arrow",
  "ASTON MARTIN": "Aston Martin",
  CHANA: "Chana",
  CHANGAN: "Changan",
  FEVER: "Fever",
  FOTON: "Foton",
  GEELY: "Geely",
  "GREAT WALL": "Great Wall",
  HAFEI: "Hafei",
  "HITECH ELECTRIC": "Hitech Electric",
  IVECO: "Iveco",
  JINBEI: "Jinbei",
  LAMBORGHINI: "Lamborghini",
  LIFAN: "Lifan",
  LOBINI: "Lobini",
  NETA: "Neta",
  RELY: "Rely",
  SERES: "Seres",
  SHINERAY: "Shineray",
  SSANGYONG: "SsangYong",
  ZEEKR: "Zeekr",
};

export function brandName(fipeName: string): string {
  const name = fipeName.trim();
  return CORRECTIONS[name] ?? name;
}
