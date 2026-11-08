/**
 * BR Code do Pix estático (Manual do BR Code, BACEN; padrão EMV QRCPS-MPM), para o QR
 * code e o "copia e cola" da tela de pagamento [6c] (PIX-FR-004). Sem dependência.
 */

/** Campo EMV: id de 2 dígitos + tamanho de 2 dígitos + valor. */
const field = (id: string, value: string) =>
  `${id}${String(value.length).padStart(2, "0")}${value}`;

/** Sem acento e só caracteres que todo app de banco aceita. */
const plain = (s: string, max: number) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z0-9 .,\-/&]/g, "")
    .trim()
    .slice(0, max)
    .trim();

/** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), em 4 dígitos hexadecimais maiúsculos. */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (const byte of Buffer.from(payload, "utf8")) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++)
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function brCode(input: {
  key: string;
  /** Favorecido (até 25 caracteres). */
  name: string;
  /** Cidade do favorecido (até 15 caracteres). */
  city: string;
  amountCents?: number;
}): string {
  const account = field("00", "br.gov.bcb.pix") + field("01", input.key);
  const payload =
    field("00", "01") +
    field("26", account) +
    field("52", "0000") +
    field("53", "986") +
    (input.amountCents
      ? field("54", (input.amountCents / 100).toFixed(2))
      : "") +
    field("58", "BR") +
    field("59", plain(input.name, 25)) +
    field("60", plain(input.city, 15)) +
    field("62", field("05", "***")) +
    "6304";
  return payload + crc16(payload);
}
