"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/ui/button";
import { publishAction } from "../actions";
import { PHOTO_REQUIRED, PUBLISH_REQUIRED } from "../publish-rules";
import { useVehicleForm } from "./vehicle-form";

/** Onde fica cada campo que o "Publicar" pode reclamar (VEH-FR-009). */
const SECTION_OF: Record<string, string> = {
  photos: "fotos",
  fipeBrandId: "identificacao",
  fipeModelId: "identificacao",
  fipeYearId: "identificacao",
  yearManufacture: "identificacao",
  mileageKm: "ficha",
  transmission: "ficha",
  fuel: "ficha",
  priceCents: "preco",
};

/** Barra fixa com "Publicar" (rascunho) ou "Ver resumo" (publicado). */
export function PublishBar() {
  const ctx = useVehicleForm();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const status = ctx.view?.status ?? "draft";

  const publish = async () => {
    setBusy(true);
    setMessage(undefined);
    const saved = await ctx.flush();
    if (!saved) {
      setBusy(false);
      return setMessage("Corrija o que está marcado para publicar.");
    }
    const id = ctx.currentVehicleId();
    if (!id) {
      // Nada preenchido ainda: mostra o que falta, sem criar rascunho vazio.
      setBusy(false);
      ctx.showErrors({
        photos: PHOTO_REQUIRED,
        ...Object.fromEntries(PUBLISH_REQUIRED),
      });
      setMessage("Falta preencher o que está marcado.");
      return document
        .getElementById("fotos")
        ?.scrollIntoView({ behavior: "smooth" });
    }
    const r = await publishAction(id);
    if (r.ok) return router.push(`/painel/veiculos/${id}`);
    setBusy(false);
    ctx.showErrors(r.errors);
    setMessage(r.message ?? "Falta preencher o que está marcado.");
    const first = Object.keys(r.errors)[0];
    if (first && SECTION_OF[first])
      document
        .getElementById(SECTION_OF[first])
        ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="sticky bottom-[calc(72px+env(safe-area-inset-bottom))] z-10 -mx-4 flex flex-col gap-2 border-t border-line bg-surface px-4 py-3 lg:bottom-0 lg:mx-0 lg:rounded-card lg:border">
      {message && (
        <p role="alert" className="text-sm text-caju-deep">
          {message}
        </p>
      )}
      {status === "draft" ? (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              await ctx.flush();
              router.push("/painel/veiculos?status=draft");
            }}
          >
            Salvar rascunho
          </Button>
          <Button disabled={busy || ctx.saving} onClick={publish}>
            {busy ? "Publicando…" : "Publicar"}
          </Button>
        </div>
      ) : (
        ctx.view && (
          <ButtonLink block href={`/painel/veiculos/${ctx.view.vehicleId}`}>
            Ver resumo do veículo
          </ButtonLink>
        )
      )}
    </div>
  );
}
