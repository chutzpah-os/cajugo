import type { Pix } from "./definitions";

/** Centésimos de ponto percentual → texto da tela (179 → "1,79"). */
export function bpsToPercent(bps: number): string {
  return (bps / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

/** Texto da tela → centésimos de ponto ("1,79" → 179). Texto inválido → NaN. */
export function percentToBps(text: string): number {
  const n = Number(text.trim().replace(/\./g, "").replace(",", "."));
  return text.trim() === "" || Number.isNaN(n) ? NaN : Math.round(n * 100);
}

/** Centavos → texto em reais (5000 → "50,00"). */
export function centsToReais(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Texto em reais → centavos ("1.234,56" → 123456). Texto inválido → NaN. */
export function reaisToCents(text: string): number {
  return percentToBps(text);
}

/** Chave Pix mascarada para a tela [4c] (CFG-SEC-004: nunca a chave inteira à toa). */
export function maskPixKey(pix: Pix): string {
  const k = pix.key;
  switch (pix.type) {
    case "cpf":
      return `***.${k.slice(3, 6)}.${k.slice(6, 9)}-**`;
    case "cnpj":
      return `**.${k.slice(2, 5)}.${k.slice(5, 8)}/${k.slice(8, 12)}-**`;
    case "email": {
      const [user, domain] = k.split("@");
      return `${user[0]}***@${domain}`;
    }
    case "phone":
      return `+55 (${k.slice(3, 5)}) *****-${k.slice(-4)}`;
    case "random":
      return `${k.slice(0, 4)}…${k.slice(-4)}`;
  }
}
