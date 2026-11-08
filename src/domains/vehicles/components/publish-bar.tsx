"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/ui/button";
import { publishAction } from "../actions";
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
    const id = saved ? await ctx.ensureVehicleId() : null;
    if (!id) {
      setBusy(false);
      return setMessage("Não foi possível salvar o rascunho. Tente de novo.");
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
    <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-line bg-bg px-4 py-3">
      {message && (
        <p role="alert" className="text-sm text-caju-deep">
          {message}
        </p>
      )}
      {status === "draft" ? (
        <Button block disabled={busy || ctx.saving} onClick={publish}>
          {busy ? "Publicando…" : "Publicar"}
        </Button>
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
