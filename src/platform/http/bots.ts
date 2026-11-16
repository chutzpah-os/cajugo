/**
 * Robôs conhecidos pelo `User-Agent` (LED-FR-015): buscadores, prévias de link de redes
 * sociais, navegadores automatizados e clientes HTTP. Lista curta e própria, sem
 * dependência; quem não executa JavaScript já não chega a contar.
 */
const BOT = new RegExp(
  [
    // "Googlebot/2.1", "bingbot/2.0", "Pinterestbot/1.0", "TelegramBot (like…)"; não
    // pega aparelho com "bot" no nome ("CUBOT X30 Build/…").
    "[a-z]bot\\/\\d",
    "\\b(telegram|twitter|linkedin|slack|discord|pinterest)bot\\b",
    "\\b(crawler|spider|slurp)\\b",
    "facebookexternalhit|facebookcatalog|embedly",
    // Prévia de link do WhatsApp ("WhatsApp/2.23…" no começo); o navegador dentro de
    // apps (Telegram-Android, [Pinterest/Android], Instagram) é gente e conta.
    "^whatsapp\\/",
    "headlesschrome|lighthouse|pagespeed|playwright|puppeteer",
    "^(curl|wget)\\/|python-requests|axios\\/|node-fetch|go-http-client|okhttp",
  ].join("|"),
  "i",
);

export const isKnownBot = (userAgent: string | null): boolean =>
  !userAgent || BOT.test(userAgent);
