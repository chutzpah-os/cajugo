import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Badge } from "./badge";
import { DataTable } from "./data-table";
import { Avatar, Initials, initialsOf } from "./initials";
import { KeyValue } from "./key-value";
import { Kpi } from "./kpi";
import { BackHeader, DarkHeader, LightHeader } from "./page-header";
import { SettingsList } from "./settings-list";
import { StoreCard } from "./store-card";

const text = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("base visual do design (012)", () => {
  it("[DSG-FR-013] selo com a largura do texto, em caixa alta, 10 px no card", () => {
    const html = renderToStaticMarkup(
      <Badge tone="ok" size="sm">
        Publicado
      </Badge>,
    );

    expect(html).toContain("w-fit");
    expect(html).toContain("flex-none");
    expect(html).toContain("uppercase");
    expect(html).toContain("text-[10px]");
  });

  it("[DSG-FR-013] sigla de 2 letras do nome da loja", () => {
    expect(initialsOf("Auto Center Silva")).toBe("AS");
    expect(initialsOf("Garagem 77")).toBe("G7");
    expect(initialsOf("Líder")).toBe("LÍ");
    const html = renderToStaticMarkup(<Initials name="MD Motors" />);
    expect(html).toContain("bg-ink");
    expect(html).toContain("rounded-[11px]");
    expect(text(html)).toContain("MM");
    expect(
      renderToStaticMarkup(<Avatar name="Ricardo Silva" tone="dark" />),
    ).toContain("bg-ink-3");
  });

  it("[DSG-FR-013] KPI escuro no cabeçalho do celular e branco no desktop", () => {
    const html = renderToStaticMarkup(
      <Kpi value={2} label="Publicados" hint="1 na vitrine" tone="dark" />,
    );

    expect(html).toContain("bg-ink-2");
    expect(html).toContain("lg:bg-surface");
    expect(text(html)).toContain("2 Publicados 1 na vitrine");
  });

  it("[DSG-FR-001] [DSG-FR-002] cabeçalho escuro com subtítulo, título e avatar; claro do admin com o selo ADMIN e as abas", () => {
    const dark = renderToStaticMarkup(
      <DarkHeader
        eyebrow="Auto Center Silva"
        title="Meus veículos"
        avatar={<Avatar name="Ricardo Silva" tone="dark" />}
      >
        <Kpi value={2} label="Publicados" tone="dark" />
      </DarkHeader>,
    );
    const light = renderToStaticMarkup(
      <LightHeader
        avatar={<Avatar name="Ana Admin" />}
        tabs={[
          { href: "/admin/lojas", label: "Lojas", current: true },
          {
            href: "/admin/lojas?aba=usuarios",
            label: "Usuários",
            current: false,
          },
        ]}
      />,
    );

    expect(dark).toContain("bg-ink");
    expect(text(dark)).toContain("Auto Center Silva Meus veículos RS");
    expect(text(light)).toContain("Admin");
    expect(light).toContain("border-caju");
    expect(light).toContain('aria-current="page"');
  });

  it("[DSG-FR-013] voltar, chave–valor, lista de configurações e card de loja", () => {
    const back = renderToStaticMarkup(
      <BackHeader href="/admin/lojas" label="Lojas" />,
    );
    const kv = renderToStaticMarkup(
      <KeyValue rows={[["Nome", "Ricardo Silva"]]} />,
    );
    const list = renderToStaticMarkup(
      <SettingsList items={[{ href: "/x", label: "Alterar senha" }]} />,
    );
    const card = renderToStaticMarkup(
      <StoreCard
        name="Auto Center Silva"
        subtitle="Ricardo Silva · Campinas"
        badge={<Badge tone="ok">Em dia</Badge>}
        footer="24 veículos · 18 na CajuGo"
        action="Gerenciar"
      />,
    );

    expect(back).toContain('href="/admin/lojas"');
    expect(text(kv)).toContain("Nome Ricardo Silva");
    expect(list).toContain("min-h-[52px]");
    expect(text(card)).toContain(
      "AS Auto Center Silva Ricardo Silva · Campinas Em dia 24 veículos · 18 na CajuGo Gerenciar",
    );
  });

  it("[DSG-FR-005] tabela no desktop e cards no celular, com as mesmas linhas", () => {
    const html = renderToStaticMarkup(
      <DataTable
        caption="Veículos"
        rows={[{ id: "1", name: "BMW 420i" }]}
        rowKey={(r) => r.id}
        columns={[{ key: "v", label: "Veículo", cell: (r) => r.name }]}
        mobile={(r) => <p>{r.name}</p>}
      />,
    );

    expect(html).toContain("<table");
    expect(html).toContain("lg:hidden");
    expect(text(html).match(/BMW 420i/g)).toHaveLength(2);
  });
});
