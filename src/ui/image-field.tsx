"use client";

import { useRef, useState } from "react";
import { Button } from "./button";

/** Formatos de imagem aceitos (SECURITY.md §5); a conferência final é no servidor. */
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,.heic";

/**
 * Enviar ou trocar uma imagem (logo, capa). Recusa no aparelho o que passa do tamanho
 * máximo, antes de gastar envio; quem usa faz o upload em `onFile`.
 */
export function ImageField({
  id,
  label,
  imageUrl,
  maxBytes,
  onFile,
  busy,
  error,
  shape = "square",
}: {
  id: string;
  label: string;
  imageUrl: string | null;
  maxBytes: number;
  onFile: (file: File) => void;
  busy?: boolean;
  error?: string;
  shape?: "square" | "wide";
}) {
  const input = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string>();
  const shown = localError ?? error;
  return (
    <div className="flex flex-col gap-2">
      <p id={`${id}-label`} className="text-[13px] font-semibold">
        {label}
      </p>
      <div
        className={
          shape === "wide"
            ? "aspect-[16/7] w-full overflow-hidden rounded-card bg-line-2"
            : "size-24 overflow-hidden rounded-card bg-line-2"
        }
      >
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- URL do Cloudinary já otimizada (f_auto,q_auto)
          <img src={imageUrl} alt={label} className="size-full object-cover" />
        )}
      </div>
      <input
        ref={input}
        id={id}
        type="file"
        accept={IMAGE_ACCEPT}
        aria-labelledby={`${id}-label`}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          if (file.size > maxBytes) {
            setLocalError(
              `A imagem pode ter no máximo ${Math.round(maxBytes / 1024 / 1024)} MB.`,
            );
            return;
          }
          setLocalError(undefined);
          onFile(file);
        }}
      />
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        {busy
          ? "Enviando…"
          : imageUrl
            ? `Trocar ${label.toLowerCase()}`
            : `Enviar ${label.toLowerCase()}`}
      </Button>
      {shown && (
        <p role="alert" className="text-xs text-caju-deep">
          {shown}
        </p>
      )}
    </div>
  );
}
