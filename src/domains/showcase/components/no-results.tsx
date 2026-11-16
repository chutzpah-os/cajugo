import Link from "next/link";
import { AlertForm } from "@/domains/buyers/components/alert-form";
import {
  filterHref,
  filtersToQuery,
  parseFilters,
  type Filters,
} from "../filters";
import type { ListSource } from "../list-source";

const linkClass =
  "flex min-h-11 items-center text-sm font-semibold text-caju-deep underline";

/** Só a marca escolhida; sem marca, a 1ª palavra de uma busca com mais de uma. */
function narrower(f: Filters): Record<string, string> | null {
  if (f.makes.length) return { marca: f.makes[0] };
  const words = f.q?.split(/\s+/) ?? [];
  return words.length > 1 ? { q: words[0] } : null;
}

/**
 * Busca sem resultado [12a] (SHW-FR-012). Com `alertSource` (vitrine ou descoberta),
 * oferece "Avisar quando chegar" (ALR-FR-001); o catálogo da loja não tem alerta.
 */
export function NoResults({
  filters,
  basePath,
  alertSource,
}: {
  filters: Filters;
  basePath: string;
  alertSource?: ListSource;
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
      {alertSource !== undefined && (
        <div className="mt-3 w-full border-t border-line pt-4">
          <AlertForm source={alertSource} query={filtersToQuery(filters)} />
        </div>
      )}
    </div>
  );
}
