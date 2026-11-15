import Link from "next/link";

/** Caminho de navegação visível (DSC-FR-007); o JSON-LD vem de `breadcrumbJsonLd`. */
export function Breadcrumbs({
  crumbs,
}: {
  crumbs: { name: string; path: string }[];
}) {
  return (
    <nav aria-label="Caminho" className="text-sm text-text-3">
      <ol className="flex flex-wrap items-center gap-x-1.5">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.path} className="flex items-center gap-x-1.5">
              {last ? (
                <span aria-current="page" className="font-semibold text-ink">
                  {c.name}
                </span>
              ) : (
                <>
                  <Link
                    href={c.path}
                    className="flex min-h-11 items-center underline"
                  >
                    {c.name}
                  </Link>
                  <span aria-hidden>›</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
