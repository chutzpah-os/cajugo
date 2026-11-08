"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { reaisToCents } from "@/platform/br/money";
import { uploadSigned } from "@/platform/cloudinary/browser-upload";
import { Button } from "@/ui/button";
import { TextField } from "@/ui/text-field";
import { receiptUploadAction, submitReceiptAction } from "../actions";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,.heic,application/pdf";

/**
 * Anexar comprovante e informar o valor pago [6c] (PIX-FR-005, PIX-FR-006): foto ou
 * PDF de até 10 MB com pré-visualização; envio direto ao Cloudinary privado com a
 * assinatura do servidor; depois, [10a].
 */
export function ReceiptForm({ suggestedAmount }: { suggestedAmount: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [paid, setPaid] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{
    field?: string;
    message: string;
  } | null>(null);

  const preview = useMemo(
    () => (file?.type.startsWith("image/") ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const send = async () => {
    if (!file) return;
    const paidCents = reaisToCents(paid);
    if (!Number.isFinite(paidCents) || paidCents <= 0)
      return setError({ field: "paid", message: "Informe o valor pago." });
    setBusy(true);
    setError(null);
    try {
      const signed = await receiptUploadAction();
      if (!signed.ok) throw new Error(signed.message);
      const publicId = await uploadSigned(
        signed.upload,
        file,
        "Envie uma foto (JPG, PNG, WEBP ou HEIC) ou um PDF de até 10 MB.",
      );
      const result = await submitReceiptAction({ publicId, paidCents });
      if (!result?.ok)
        throw new Error(
          result?.message ??
            Object.values(result?.errors ?? {})[0] ??
            "Não foi possível enviar.",
        );
      router.push("/painel/pagamento");
    } catch (e) {
      setError({
        message: e instanceof Error ? e.message : "Não foi possível enviar.",
      });
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[17px] font-extrabold">Comprovante</h2>
      <input
        ref={input}
        id="receipt"
        type="file"
        accept={ACCEPT}
        // O controle é o botão abaixo (toque e teclado); o campo só recebe o arquivo.
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          e.target.value = "";
          if (f && f.size > MAX_BYTES) {
            setFile(null);
            return setError({ message: "O arquivo pode ter no máximo 10 MB." });
          }
          setError(null);
          setFile(f);
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-field-dash bg-surface p-4 text-sm"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- pré-visualização local (blob:)
          <img
            src={preview}
            alt="Pré-visualização do comprovante"
            className="max-h-48 rounded-input object-contain"
          />
        ) : file ? (
          <span className="font-bold" data-testid="receipt-file">
            📄 {file.name} · {(file.size / 1024).toFixed(0)} KB
          </span>
        ) : (
          <>
            <span className="font-bold">Anexar comprovante</span>
            <span className="text-text-3">Foto ou PDF, até 10 MB</span>
          </>
        )}
        {file && <span className="text-caju-ink">Trocar arquivo</span>}
      </button>
      <TextField
        id="paid"
        label="Valor pago"
        prefix="R$"
        inputMode="decimal"
        autoComplete="off"
        placeholder={suggestedAmount}
        value={paid}
        onChange={(e) => setPaid(e.target.value)}
        error={error?.field === "paid" ? error.message : undefined}
      />
      {error && !error.field && (
        <p role="alert" className="text-sm text-caju-deep">
          {error.message}
        </p>
      )}
      <div className="sticky bottom-0 -mx-4 border-t border-line bg-bg px-4 py-3">
        <Button block disabled={!file || !paid.trim() || busy} onClick={send}>
          {busy ? "Enviando…" : "Enviar comprovante"}
        </Button>
      </div>
    </section>
  );
}
