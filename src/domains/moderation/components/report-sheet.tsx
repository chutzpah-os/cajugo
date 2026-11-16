"use client";

import { useState, type FormEvent } from "react";
import { browserStorage, claimOncePer } from "@/platform/browser/marks";
import { uuidv7 } from "@/platform/db/uuid";
import { HONEYPOT_FIELD } from "@/platform/http/honeypot";
import { Button } from "@/ui/button";
import {
  closeDialog,
  dialogCommand,
  openDialog,
  SHEET_CLASS,
} from "@/ui/dialog";
import { HoneypotField } from "@/ui/honeypot-field";
import { TextAreaField } from "@/ui/textarea-field";
import { reportVehicleAction } from "../actions";
import { REASON_LABEL, REPORT_REASONS, type ReportReason } from "../reasons";

const REPORT_ID = "denunciar";
const REPORTED_KEY = "cajugo:report:v1";
const DAY_MS = 86_400_000;
const PICK_REASON = "Escolha um motivo.";

/** "Denunciar anúncio" em [1b] (RPT-FR-001): abre [14d] antes do JavaScript. */
export function ReportTrigger() {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-controls={REPORT_ID}
      {...dialogCommand(REPORT_ID, "show-modal")}
      onClick={() => openDialog(REPORT_ID)}
      data-testid="report-open"
      className="flex min-h-11 items-center self-center text-sm font-semibold text-text-2 underline"
    >
      Denunciar anúncio
    </button>
  );
}

/**
 * Denúncia [14d] (RPT-FR-001, 010, RPT-SEC-002): motivo obrigatório, descrição opcional e
 * honeypot. O mesmo aparelho conta uma vez a cada 24 horas por anúncio: as seguintes
 * confirmam sem enviar. Nada de quem denunciou sai daqui.
 */
export function ReportSheet({ vehicleId }: { vehicleId: string }) {
  // Chave deste envio (API.md §2.6): repetir o mesmo envio não duplica.
  const [requestId] = useState(() => uuidv7());
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const close = () => closeDialog(REPORT_ID);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!reason) return setErrors({ reason: PICK_REASON });
    const website = String(
      new FormData(e.currentTarget).get(HONEYPOT_FIELD) ?? "",
    );
    const first = claimOncePer(
      browserStorage("local"),
      REPORTED_KEY,
      vehicleId,
      new Date(),
      DAY_MS,
    );
    if (!first) return setSent(true);
    setBusy(true);
    const result = await reportVehicleAction({
      requestId,
      vehicleId,
      reason,
      details,
      website,
    });
    setBusy(false);
    if (result.ok) return setSent(true);
    setNotice(result.message);
    setErrors(
      Object.fromEntries(result.errors.map((x) => [x.field, x.message])),
    );
  }

  return (
    <dialog
      id={REPORT_ID}
      aria-labelledby="report-title"
      onClick={(e) => e.target === e.currentTarget && close()}
      className={SHEET_CLASS}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 id="report-title" className="text-[19px] font-extrabold">
            Denunciar anúncio
          </h2>
          <button
            type="button"
            {...dialogCommand(REPORT_ID, "close")}
            onClick={close}
            className="flex h-11 items-center px-2 text-sm font-semibold text-text-2"
          >
            Fechar
          </button>
        </div>
        {sent ? (
          <p
            role="status"
            data-testid="report-sent"
            className="rounded-card border border-line p-3 font-semibold"
          >
            Denúncia enviada. Vamos analisar.
          </p>
        ) : (
          <form
            onSubmit={submit}
            aria-label="Denunciar anúncio"
            className="relative flex flex-col gap-4"
            noValidate
          >
            <HoneypotField />
            <fieldset
              className="flex flex-col gap-1"
              aria-invalid={errors.reason ? true : undefined}
            >
              <legend className="mb-2 text-sm font-bold">Motivo</legend>
              {REPORT_REASONS.map((r) => (
                <label
                  key={r}
                  className="flex min-h-11 items-center gap-3 rounded-input border border-line px-3"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => {
                      setReason(r);
                      setErrors((x) => ({ ...x, reason: "" }));
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
            <TextAreaField
              id="report-details"
              name="details"
              label="Descreva (opcional)"
              max={1000}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              error={errors.details}
            />
            <p className="text-xs text-text-3">
              A loja não fica sabendo quem denunciou.
            </p>
            {notice && !Object.values(errors).some(Boolean) && (
              <p role="alert" className="text-sm text-caju-deep">
                {notice}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? "Enviando…" : "Enviar denúncia"}
            </Button>
          </form>
        )}
      </div>
    </dialog>
  );
}
