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

  it("marca o item atual com aria-current e mostra no celular só os itens móveis", () => {
    // Act
    const html = renderToStaticMarkup(
      <PanelNavView items={items} pathname="/admin/lojas/1" />,
    );

    // Assert
    expect(html.match(/aria-current="page"/g)).toHaveLength(2); // celular + lateral
    expect(html).toMatch(/aria-current="page"[^>]*>.*?Lojas/);
    const mobile = html.split('aria-label="Menu do painel (celular)"')[1];
    expect(mobile.split("</nav>")[0]).not.toContain("Pagamentos Pix");
    expect(html).toContain("Pagamentos Pix");
  });
});
