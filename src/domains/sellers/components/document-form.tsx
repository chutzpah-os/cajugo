"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { uploadSigned } from "@/platform/cloudinary/browser-upload";
import { Button } from "@/ui/button";
import {
  attachSellerDocumentAction,
  sellerDocumentUploadAction,
} from "../actions";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,.heic,application/pdf";
const SIDES = [
  ["front", "Frente do documento"],
  ["back", "Verso do documento"],
] as const;
type Side = (typeof SIDES)[number][0];

/**
 * Fotos do documento com foto [7a] (SEL-FR-001, SEL-SEC-009): frente e verso, foto ou
 * PDF de até 10 MB, enviados direto ao Cloudinary privado com a assinatura do
 * servidor. Com as duas, segue para "Em análise".
 */
export function DocumentForm({ sent }: { sent: Record<Side, boolean> }) {
  const router = useRouter();
  const inputs = useRef<Partial<Record<Side, HTMLInputElement | null>>>({});
  const [done, setDone] = useState(sent);
  const [busy, setBusy] = useState<Side | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(side: Side, file: File) {
    if (file.size > MAX_BYTES)
      return setError("O arquivo pode ter no máximo 10 MB.");
    setBusy(side);
    setError(null);
    try {
      const signed = await sellerDocumentUploadAction(side);
      if (!signed.ok) throw new Error(signed.message);
      const publicId = await uploadSigned(
        signed.upload,
        file,
        "Envie uma foto (JPG, PNG, WEBP ou HEIC) ou um PDF de até 10 MB.",
      );
      const r = await attachSellerDocumentAction({ side, publicId });
      if (!r.ok) throw new Error(r.message);
      setDone((d) => ({ ...d, [side]: true }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível enviar.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      {SIDES.map(([side, label]) => (
        <div key={side}>
          <input
            ref={(el) => {
              inputs.current[side] = el;
            }}
            id={`document-${side}`}
            type="file"
            accept={ACCEPT}
            tabIndex={-1}
            aria-hidden
            className="sr-only"
            data-testid={`document-${side}`}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void send(side, f);
            }}
          />
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => inputs.current[side]?.click()}
            className="flex min-h-24 w-full flex-col items-center justify-center gap-1 rounded-card border-2 border-dashed border-field-dash bg-surface p-4 text-sm"
          >
            <span className="font-bold">{label}</span>
            <span className="text-text-3">
              {busy === side
                ? "Enviando…"
                : done[side]
                  ? "✓ Enviada · toque para trocar"
                  : "Foto ou PDF, até 10 MB"}
            </span>
          </button>
        </div>
      ))}
      {error && (
        <p role="alert" className="text-sm text-caju-deep">
          {error}
        </p>
      )}
      <Button
        disabled={!done.front || !done.back || busy !== null}
        onClick={() => router.push("/rede")}
      >
        Concluir cadastro
      </Button>
    </section>
  );
}
