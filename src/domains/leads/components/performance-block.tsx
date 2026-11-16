const n = new Intl.NumberFormat("pt-BR");

/**
 * "Desempenho do anúncio" em [6e] (LED-FR-012): Visualizações (1 por aparelho por dia),
 * Leads e Dias no ar (do resumo do veículo; "–" se não está publicado).
 */
export function PerformanceBlock({
  views,
  leads,
  daysOnAir,
}: {
  views: number;
  leads: number;
  daysOnAir: number | null;
}) {
  const items = [
    ["Visualizações", n.format(views), "perf-views"],
    ["Leads", n.format(leads), "perf-leads"],
    [
      "Dias no ar",
      daysOnAir === null ? "–" : n.format(daysOnAir),
      "days-on-air",
    ],
  ] as const;
  return (
    <section
      aria-labelledby="performance-title"
      className="flex flex-col gap-2 rounded-card border border-line bg-surface p-3"
    >
      <h2 id="performance-title" className="text-[15px] font-extrabold">
        Desempenho do anúncio
      </h2>
      <dl className="grid grid-cols-3 gap-2">
        {items.map(([label, value, testId]) => (
          <div key={label} className="flex flex-col">
            <dt className="order-2 text-xs text-text-3">{label}</dt>
            <dd className="text-[22px] font-extrabold" data-testid={testId}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
