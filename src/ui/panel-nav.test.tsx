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

  it("[ALR-FR-003] contador de pendências no item, no Mais e na barra lateral", () => {
    // Act
    const html = renderToStaticMarkup(
      <PanelNavView
        items={[
          ...items,
          { href: "/admin/alertas", label: "Alertas", count: 2 },
        ]}
        pathname="/admin"
      />,
    );

    // Assert
    expect(html.match(/data-testid="nav-count"[^>]*>2</g)).toHaveLength(2); // gaveta + lateral
    expect(html).toContain("> pendentes</span>");
    expect(html).toContain('data-testid="more-dot"');
    expect(
      renderToStaticMarkup(
        <PanelNavView
          items={[
            ...items,
            { href: "/admin/alertas", label: "Alertas", count: 0 },
          ]}
          pathname="/admin"
        />,
      ),
    ).not.toContain("nav-count");
  });

  it("[LED-FR-011] item da barra do celular mostra o seu contador", () => {
    // Act
    const html = renderToStaticMarkup(
      <PanelNavView
        items={[
          { href: "/painel/veiculos", label: "Veículos", mobile: true },
          { href: "/painel/leads", label: "Leads", mobile: true, count: 3 },
        ]}
        pathname="/painel/veiculos"
      />,
    );

    // Assert
    const bar = html
      .split('aria-label="Menu do painel (celular)"')[1]
      .split("</ul>")[0];
    expect(bar).toMatch(/Leads<span data-testid="nav-count"[^>]*>3/);
  });

  it("[DSG-FR-003] [DSG-FR-001] sidebar escura com o logo, a identidade da loja, o selo da área e o pé; barra inferior com a barrinha do ativo", () => {
    const html = renderToStaticMarkup(
      <PanelNavView
        items={items}
        pathname="/admin"
        identity={{
          name: "Auto Center Silva",
          caption: "Plano Catálogo · em dia",
        }}
        tag="Admin"
        footer={<span>Sair</span>}
      />,
    );

    expect(html).toContain('data-testid="sidebar"');
    expect(html).toContain("bg-ink");
    expect(html).toMatch(
      /sidebar-identity[\s\S]*AS[\s\S]*Auto Center Silva[\s\S]*Plano Catálogo · em dia/,
    );
    expect(html).toContain(">Admin<");
    expect(html).toContain(">Sair<");
    expect(html).toContain("w-[22px]");
  });
});
