import { describe, expect, it } from "vitest";
import { isKnownBot } from "./bots";

describe("isKnownBot", () => {
  it("[LED-FR-015] reconhece robôs de busca, de redes sociais e navegadores automatizados", () => {
    // Arrange
    const bots = [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "WhatsApp/2.23.20.0",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36",
      "curl/8.5.0",
      "",
    ];

    // Act / Assert
    for (const ua of bots) expect(isKnownBot(ua), ua).toBe(true);
    expect(isKnownBot(null)).toBe(true);
  });

  it("[LED-FR-015] navegador de gente conta", () => {
    // Arrange
    const people = [
      "Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
    ];

    // Act / Assert
    for (const ua of people) expect(isKnownBot(ua), ua).toBe(false);
  });
});
