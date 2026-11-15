import Link from "next/link";

/** Links internos para as páginas de descoberta com veículos (DSC-FR-008, 009). */
export function RelatedLinks({
  links,
  title = "Veja também",
}: {
  links: { name: string; path: string }[];
  title?: string;
}) {
  if (!links.length) return null;
  return (
    <nav aria-label={title} className="flex flex-col gap-2">
      <h2 className="text-[17px] font-extrabold">{title}</h2>
      <ul className="flex flex-wrap gap-2">
        {links.map((l) => (
          <li key={l.path}>
            <Link
              href={l.path}
              className="flex min-h-11 items-center rounded-full border border-field bg-surface px-3.5 text-sm font-semibold"
            >
              {l.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
