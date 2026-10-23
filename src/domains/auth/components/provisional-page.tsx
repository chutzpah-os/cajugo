import { Badge } from "@/ui/badge";

/** Página provisória até a spec dona (001 › Telas provisórias). */
export function ProvisionalPage({
  title,
  screen,
  children,
}: {
  title: string;
  screen: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 py-6">
      <div>
        <Badge tone="neutral">Em construção · {screen}</Badge>
      </div>
      <h1 className="text-[22px] font-extrabold">{title}</h1>
      {children && <div className="text-[15px] text-text-2">{children}</div>}
    </section>
  );
}
