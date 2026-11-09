import { Skeleton } from "@/ui/skeleton";

const LIST_CLASS = "grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3";

/** Carregamento [12c] no formato do card. */
export function CatalogSkeleton() {
  return (
    <div data-testid="catalog-skeleton" aria-busy className={LIST_CLASS}>
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 overflow-hidden rounded-card border border-line bg-surface pb-3"
        >
          <Skeleton className="aspect-[4/3] rounded-none" />
          <Skeleton className="mx-3 h-4 w-2/3" />
          <Skeleton className="mx-3 h-3 w-1/2" />
          <Skeleton className="mx-3 h-5 w-1/3" />
        </div>
      ))}
    </div>
  );
}
