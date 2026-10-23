/** Link `wa.me` com mensagem pronta (notificações e suporte no MVP são por WhatsApp, ADR 0007). */
export function whatsappLink(number: string, text?: string): string {
  const digits = number.replace(/\D/g, "");
  if (digits.length < 10) throw new Error("Número de WhatsApp inválido.");
  const url = `https://wa.me/${digits}`;
  return text ? `${url}?text=${encodeURIComponent(text)}` : url;
}
