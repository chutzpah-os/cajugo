/**
 * Robôs conhecidos pelo `User-Agent` (LED-FR-015): buscadores, prévias de link de redes
 * sociais, navegadores automatizados e clientes HTTP. Lista curta e própria, sem
 * dependência; quem não executa JavaScript já não chega a contar.
 */
const BOT =
  /bot\b|bot\/|crawl|spider|slurp|facebookexternalhit|facebookcatalog|whatsapp|telegram|twitterbot|linkedinbot|pinterest|embedly|headlesschrome|lighthouse|pagespeed|playwright|puppeteer|curl\/|wget\/|python-requests|axios\/|node-fetch|go-http-client|okhttp/i;

export const isKnownBot = (userAgent: string | null): boolean =>
  !userAgent || BOT.test(userAgent);
