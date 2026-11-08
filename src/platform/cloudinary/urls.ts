/**
 * URL pública de entrega de imagem (VEH-NFR-002): formato e qualidade automáticos e
 * largura fixa. Sem segredo: o nome da nuvem aparece em toda URL de imagem.
 */
export function imageUrlFor(
  cloudName: string,
  publicId: string,
  width: number,
): string {
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_${width}/${publicId}`;
}

/** Larguras fixas de entrega: miniatura, card e tela cheia. */
export const IMAGE_WIDTHS = { thumb: 320, card: 640, full: 1600 } as const;
