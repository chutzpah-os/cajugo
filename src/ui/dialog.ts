/**
 * Diálogo nativo aberto por Invoker Commands do HTML (`commandfor`/`command`): o botão
 * abre e fecha antes de o JavaScript carregar, como num 4G lento. Sem suporte no
 * navegador, `openDialog` abre pelo JavaScript. O React ainda não tipa os atributos.
 */
export const dialogCommand = (id: string, action: "show-modal" | "close") =>
  ({ commandfor: id, command: action }) as Record<string, string>;

const find = (id: string) =>
  document.getElementById(id) as HTMLDialogElement | null;

export function openDialog(id: string) {
  const d = find(id);
  if (d && !d.open) d.showModal();
}

export const closeDialog = (id: string) => find(id)?.close();

/** Folha de baixo no celular; centralizado no desktop (DESIGN.md). */
export const SHEET_CLASS =
  "m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-[20px] bg-surface p-5 backdrop:bg-[rgba(28,27,32,.55)] md:m-auto md:max-w-md md:rounded-card";
