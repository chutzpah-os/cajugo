import { describe, expect, it } from "vitest";
import {
  HONEYPOT_FIELD,
  isHoneypotFilled,
  isHoneypotFilledIn,
} from "./honeypot";

describe("honeypot", () => {
  it("formulário de pessoa (campo vazio) passa", () => {
    const form = new FormData();
    form.set("name", "Mariana");
    form.set(HONEYPOT_FIELD, "");
    expect(isHoneypotFilled(form)).toBe(false);
  });

  it("formulário de bot (campo preenchido) é detectado", () => {
    const form = new FormData();
    form.set(HONEYPOT_FIELD, "https://spam.example");
    expect(isHoneypotFilled(form)).toBe(true);
  });

  it("entrada de action (objeto) com o campo preenchido também é detectada", () => {
    expect(isHoneypotFilledIn({ [HONEYPOT_FIELD]: "http://spam" })).toBe(true);
    expect(isHoneypotFilledIn({ [HONEYPOT_FIELD]: "  " })).toBe(false);
    expect(isHoneypotFilledIn(null)).toBe(false);
  });
});
