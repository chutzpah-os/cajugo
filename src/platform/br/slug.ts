/** Minúsculas e sem acento, para busca (SHW-FR-004). */
export function plainText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/** Só letras, números e hífen, para filtros e endereços (`docs/SEO.md`). */
export function slugify(text: string): string {
  return plainText(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
