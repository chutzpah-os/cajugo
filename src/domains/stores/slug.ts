import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { storeSlugRedirects, stores } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";

/** Endereço do catálogo `/loja/{slug}` (STO-FR-005, ADR 0009). */
export const slugSchema = z
  .string()
  .trim()
  .min(3, "Use pelo menos 3 caracteres.")
  .max(40, "Use no máximo 40 caracteres.")
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "Use só letras minúsculas, números e hífen (sem hífen no começo ou no fim).",
  );

/** Sugestão a partir do nome da loja: sem acento, minúsculas, palavras com hífen. */
export function suggestSlug(name: string): string {
  let slug = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  if (slug.length < 3) slug = `${slug}${slug ? "-" : ""}loja`.slice(0, 40);
  return slug;
}

export type SlugCheck =
  | { status: "available" }
  | { status: "taken" }
  | { status: "invalid"; message: string };

/**
 * Disponibilidade ao vivo (STO-FR-005). Endereço antigo ainda redirecionando conta
 * como em uso (STO-FR-013). A garantia final é o `unique` do banco no cadastro.
 */
export async function checkSlug(db: Db, slug: string): Promise<SlugCheck> {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success)
    return { status: "invalid", message: parsed.error.issues[0].message };
  const [store] = await db
    .select({ id: stores.id })
    .from(stores)
    .where(eq(stores.slug, parsed.data));
  if (store) return { status: "taken" };
  const [redirect] = await db
    .select({ slug: storeSlugRedirects.oldSlug })
    .from(storeSlugRedirects)
    .where(
      and(
        eq(storeSlugRedirects.oldSlug, parsed.data),
        gt(storeSlugRedirects.expiresAt, new Date()),
      ),
    );
  return redirect ? { status: "taken" } : { status: "available" };
}
