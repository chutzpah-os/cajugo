import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { isActive, PanelNavView, type NavItem } from "./panel-nav";

const items: NavItem[] = [
  { href: "/admin", label: "Painel", mobile: true },
  { href: "/admin/lojas", label: "Lojas", mobile: true },
  { href: "/admin/pagamentos", label: "Pagamentos Pix" },
];

describe("menu do painel", () => {
  it("o início do painel só fica ativo nele mesmo; os outros também nas subpáginas", () => {
    expect(isActive("/admin", "/admin", "/admin")).toBe(true);
    expect(isActive("/admin/lojas", "/admin", "/admin")).toBe(false);
    expect(isActive("/admin/lojas/123", "/admin/lojas", "/admin")).toBe(true);
    expect(isActive("/admin/lojasx", "/admin/lojas", "/admin")).toBe(false);
  });

  it("marca o item atual com aria-current na barra lateral e na inferior", () => {
    // Act
    const html = renderToStaticMarkup(
      <PanelNavView items={items} pathname="/admin/lojas/1" />,
    );

    // Assert
    expect(html.match(/aria-current="page"/g)).toHaveLength(2); // celular + lateral
    expect(html).toMatch(/aria-current="page"[^>]*>.*?Lojas/);
  });

  it('no celular, os itens que não cabem na barra ficam no "Mais"', () => {
    // Act
    const html = renderToStaticMarkup(
      <PanelNavView items={items} pathname="/admin" />,
    );

    // Assert: a barra tem só os itens móveis + "Mais"; a gaveta tem o resto
    const bar = html
      .split('aria-label="Menu do painel (celular)"')[1]
      .split("</ul>")[0];
    expect(bar).toContain("Lojas");
    expect(bar).toContain("Mais");
    expect(bar).not.toContain("Pagamentos Pix");
    const drawer = html.split("<dialog")[1].split("</dialog>")[0];
    expect(drawer).toContain("Pagamentos Pix");
    expect(drawer).not.toContain("Lojas");
  });

  it('"Mais" fica ativo quando a página atual está na gaveta', () => {
    const html = renderToStaticMarkup(
      <PanelNavView items={items} pathname="/admin/pagamentos" />,
    );
    const bar = html
      .split('aria-label="Menu do painel (celular)"')[1]
      .split("</ul>")[0];
    expect(bar).toMatch(/aria-current="page"[^>]*>(?:(?!<\/button>).)*Mais/);
  });

  it('sem itens fora da barra, não há "Mais"', () => {
    const html = renderToStaticMarkup(
      <PanelNavView items={items.filter((i) => i.mobile)} pathname="/admin" />,
    );
    expect(html).not.toContain("Mais");
    expect(html).not.toContain("<dialog");
  });
});
