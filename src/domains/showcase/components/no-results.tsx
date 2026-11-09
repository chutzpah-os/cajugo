import Link from "next/link";
import { filterHref, parseFilters, type Filters } from "../filters";

const linkClass =
  "flex min-h-11 items-center text-sm font-semibold text-caju-deep underline";

/** Só a marca escolhida; sem marca, a 1ª palavra de uma busca com mais de uma. */
function narrower(f: Filters): Record<string, string> | null {
  if (f.makes.length) return { marca: f.makes[0] };
  const words = f.q?.split(/\s+/) ?? [];
  return words.length > 1 ? { q: words[0] } : null;
}

/** Busca sem resultado [12a] (SHW-FR-012). */
export function NoResults({
  filters,
  basePath,
}: {
  filters: Filters;
  basePath: string;
}) {
  const hint = narrower(filters);
  return (
    <div
      data-testid="no-results"
      className="flex flex-col items-start gap-1 rounded-card border border-line bg-surface p-5"
    >
      <p className="text-[17px] font-extrabold">Nenhum veículo encontrado</p>
      <p className="text-sm text-text-2">
        Tente mudar a busca ou tirar alguns filtros.
      </p>
      <Link href={basePath} className={linkClass}>
        Limpar filtros
      </Link>
      {hint && (
        <Link
          href={filterHref(basePath, parseFilters(hint))}
          className={linkClass}
        >
          Buscar só por {hint.marca ?? hint.q}
        </Link>
      )}
    </div>
  );
}
