import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PerformanceBlock } from "./performance-block";

describe("Desempenho do anúncio", () => {
  it("[LED-FR-012] mostra Visualizações, Leads e Dias no ar", () => {
    // Act
    const html = renderToStaticMarkup(
      <PerformanceBlock views={1200} leads={4} daysOnAir={10} />,
    );

    // Assert
    expect(html).toContain("Desempenho do anúncio");
    expect(html).toMatch(/data-testid="perf-views">1\.200</);
    expect(html).toMatch(/data-testid="perf-leads">4</);
    expect(html).toMatch(/data-testid="days-on-air">10</);
  });

  it("[LED-FR-012] veículo fora do ar mostra traço nos dias", () => {
    // Act
    const html = renderToStaticMarkup(
      <PerformanceBlock views={0} leads={0} daysOnAir={null} />,
    );

    // Assert
    expect(html).toMatch(/data-testid="days-on-air">–</);
  });
});
