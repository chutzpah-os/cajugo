"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/ui/button";
import { ConfirmSheet } from "@/ui/confirm-sheet";
import { TextField } from "@/ui/text-field";
import { hideVehicleAction } from "../actions";
import { HIDE_REASONS, REASON_LABEL, type HideReason } from "../reasons";

/**
 * **Ocultar** em [14e] com a confirmação de [6f] "Ocultar veículo" (RPT-FR-004): motivo
 * obrigatório ("Outro" pede o texto) e o efeito escrito antes de confirmar.
 */
export function HideSheet({
  vehicleId,
  variant = "primary",
}: {
  vehicleId: string;
  /** `soft`: botão discreto nas listas ([1d]); a decisão continua na confirmação. */
  variant?: "primary" | "soft";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<HideReason | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  async function confirm() {
    if (!reason) return setErrors({ reason: "Escolha um motivo." });
    if (reason === "other" && !note.trim())
      return setErrors({ note: "Descreva o motivo." });
    setBusy(true);
    const r = await hideVehicleAction({
      vehicleId,
      reason,
      ...(reason === "other" ? { note } : {}),
    });
    setBusy(false);
    if (r.ok) {
      setOpen(false);
      return router.refresh();
    }
    setErrors(
      Object.fromEntries((r.errors ?? []).map((e) => [e.field, e.message])),
    );
    setMessage(r.message);
  }

  return (
    <>
      <Button
        block
        variant={variant}
        data-testid="report-hide"
        onClick={() => setOpen(true)}
      >
        Ocultar
      </Button>
      <ConfirmSheet
        open={open}
        title="Ocultar veículo"
        confirmLabel="Ocultar da vitrine"
        kind="hide"
        busy={busy}
        onConfirm={confirm}
        onClose={() => setOpen(false)}
        extra={
          <div className="flex flex-col gap-3">
            <fieldset className="flex flex-col gap-1">
              <legend className="mb-2 text-sm font-bold">Motivo</legend>
              {HIDE_REASONS.map((r) => (
                <label
                  key={r}
                  className="flex min-h-11 items-center gap-3 rounded-input border border-line px-3"
                >
                  <input
                    type="radio"
                    name={`hide-reason-${vehicleId}`}
                    value={r}
                    checked={reason === r}
                    onChange={() => {
                      setReason(r);
                      setErrors({});
                    }}
                    className="size-5 accent-ink"
                  />
                  <span className="text-[15px]">{REASON_LABEL[r]}</span>
                </label>
              ))}
              {errors.reason && (
                <p role="alert" className="text-xs text-caju-deep">
                  {errors.reason}
                </p>
              )}
            </fieldset>
            {reason === "other" && (
              <TextField
                id={`hide-note-${vehicleId}`}
                name="note"
                label="Qual o motivo?"
                maxLength={200}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                error={errors.note}
              />
            )}
            {message && !Object.keys(errors).length && (
              <p role="alert" className="text-sm text-caju-deep">
                {message}
              </p>
            )}
          </div>
        }
      >
        Sai só da vitrine, continua no catálogo da loja; o lojista é avisado com
        o motivo.
      </ConfirmSheet>
    </>
  );
}
