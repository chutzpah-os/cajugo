"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/ui/button";
import { ConfirmSheet } from "@/ui/confirm-sheet";
import { Toggle } from "@/ui/toggle";
import {
  markSoldAction,
  removeAction,
  setShareAction,
  undoSoldAction,
  unpublishAction,
} from "../actions";
import type { VehicleSummary } from "../service";

type Kind = "sold" | "unpublish" | "remove";

const SHEETS: Record<
  Kind,
  { title: string; text: string; confirm: string; variant: "dark" | "primary" }
> = {
  sold: {
    title: "Marcar como vendido?",
    text: "Sai do seu catálogo, da vitrine CajuGo e dos links de vendedor na hora. Dá para desfazer em até 7 dias.",
    confirm: "Marcar como vendido",
    variant: "dark",
  },
  unpublish: {
    title: "Despublicar veículo?",
    text: "Ele volta a ser rascunho e sai do seu catálogo e da vitrine CajuGo.",
    confirm: "Despublicar",
    variant: "dark",
  },
  remove: {
    title: "Excluir veículo?",
    text: "Ele some da sua lista e de todas as páginas públicas. Você não poderá recuperá-lo depois.",
    confirm: "Excluir veículo",
    variant: "primary",
  },
};

/** Divulgação e ações do resumo [6e] (VEH-FR-010, 013, 014), com o diálogo [6f]. */
export function VehicleActions({ v }: { v: VehicleSummary }) {
  const router = useRouter();
  const [share, setShare] = useState(v.shareOnCajugo);
  const [sheet, setSheet] = useState<Kind | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const published = v.status === "published";

  const confirm = async () => {
    if (!sheet) return;
    setBusy(true);
    const action = {
      sold: markSoldAction,
      unpublish: unpublishAction,
      remove: removeAction,
    }[sheet];
    const r = await action(v.vehicleId);
    setBusy(false);
    const done = sheet;
    setSheet(null);
    if (!r.ok) return setError(r.message);
    if (done === "remove") return router.push("/painel/veiculos");
    router.refresh();
  };

  const undo = async () => {
    setBusy(true);
    const r = await undoSoldAction(v.vehicleId);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-card border border-line bg-surface p-4">
        <Toggle
          title="Divulgar na CajuGo"
          caption={v.shareCaption}
          checked={share}
          disabled={!published || busy}
          onChange={async (e) => {
            const on = e.target.checked;
            setShare(on);
            const r = await setShareAction(v.vehicleId, on);
            if (!r.ok) {
              setShare(!on);
              setError(r.message);
            } else router.refresh();
          }}
        />
      </section>
      <div className="flex flex-col gap-2">
        {published && (
          <Button
            variant="dark"
            block
            disabled={busy}
            onClick={() => setSheet("sold")}
          >
            Marcar como vendido
          </Button>
        )}
        {v.canUndoSale && (
          <Button variant="dark" block disabled={busy} onClick={undo}>
            Desfazer venda
          </Button>
        )}
        {published && (
          <Button
            variant="ghost"
            block
            disabled={busy}
            onClick={() => setSheet("unpublish")}
          >
            Despublicar
          </Button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => setSheet("remove")}
          className="flex min-h-11 items-center justify-center text-sm font-bold text-caju-deep"
        >
          Excluir veículo
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-caju-deep">
          {error}
        </p>
      )}
      <ConfirmSheet
        open={sheet !== null}
        title={sheet ? SHEETS[sheet].title : ""}
        confirmLabel={sheet ? SHEETS[sheet].confirm : ""}
        confirmVariant={sheet ? SHEETS[sheet].variant : "dark"}
        busy={busy}
        onClose={() => setSheet(null)}
        onConfirm={confirm}
      >
        {sheet ? SHEETS[sheet].text : ""}
      </ConfirmSheet>
    </div>
  );
}
