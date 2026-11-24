"use client";

import QRCode from "qrcode";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/ui/button";
import { uploadSigned } from "@/platform/cloudinary/browser-upload";
import { IMAGE_ACCEPT } from "@/ui/image-field";
import { PencilIcon } from "@/ui/icons";
import { initialsOf } from "@/ui/initials";
import { setStoreImageAction, storeImageUploadAction } from "../actions";

const MAX_BYTES = 15 * 1024 * 1024;

/** Logo ou capa: assinatura do servidor → envio direto → servidor confere e grava. */
async function uploadToCloudinary(kind: "logo" | "cover", file: File) {
  const signed = await storeImageUploadAction(kind);
  if (!signed.ok) throw new Error(signed.message);
  const publicId = await uploadSigned(
    signed.upload,
    file,
    "Use uma imagem JPG, PNG, WEBP ou HEIC de até 15 MB.",
  );
  const saved = await setStoreImageAction(kind, publicId);
  if (!saved.ok) throw new Error(saved.message);
}

/**
 * Minha loja [3b]: logo e capa (STO-FR-010) e divulgação do catálogo (STO-FR-011):
 * link, copiar, QR code em PNG, compartilhar e ver como cliente.
 */
export function StoreSharePanel({
  storeName,
  subtitle,
  catalogUrl,
  referralCode,
  referralUrl,
  logoUrl,
  coverUrl,
}: {
  storeName: string;
  /** "Campinas (SP) · 24 veículos" ([3b]). */
  subtitle?: string;
  catalogUrl: string;
  referralCode: string | null;
  referralUrl: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"logo" | "cover" | null>(null);
  const [error, setError] = useState<{
    kind: "logo" | "cover";
    message: string;
  } | null>(null);
  const [notice, setNotice] = useState<string>();
  const [qr, setQr] = useState<string>();
  const coverInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    QRCode.toDataURL(catalogUrl, { width: 160, margin: 0 }).then(
      setQr,
      () => {},
    );
  }, [catalogUrl]);

  const upload = (kind: "logo" | "cover") => async (file: File) => {
    setBusy(kind);
    setError(null);
    try {
      await uploadToCloudinary(kind, file);
      router.refresh();
    } catch (e) {
      setError({
        kind,
        message: e instanceof Error ? e.message : "Não foi possível enviar.",
      });
    } finally {
      setBusy(null);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(catalogUrl);
    setNotice("Link copiado.");
  };

  const downloadQr = async () => {
    const dataUrl = await QRCode.toDataURL(catalogUrl, {
      width: 1024,
      margin: 2,
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qrcode-${storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
    a.click();
    setNotice("QR code baixado.");
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: storeName, url: catalogUrl });
      } catch {
        // pessoa cancelou o compartilhamento
      }
    } else await copy();
  };

  const pick =
    (kind: "logo" | "cover") => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      if (file.size > MAX_BYTES)
        return setError({
          kind,
          message: "A imagem pode ter no máximo 15 MB.",
        });
      void upload(kind)(file);
    };
  const label = (kind: "logo" | "cover", has: boolean) =>
    busy === kind
      ? "Enviando…"
      : `${has ? "Trocar" : "Enviar"} ${kind === "logo" ? "logo" : "capa"}`;

  return (
    <div className="flex flex-col gap-5">
      {/* Capa 170 px com "Trocar capa" e o logo sobreposto ([3b]). */}
      <section className="-mx-4 -mt-0 flex flex-col bg-surface lg:mx-0 lg:overflow-hidden lg:rounded-card lg:border lg:border-line">
        <div className="relative h-[170px] bg-[repeating-linear-gradient(135deg,#E4E0D9_0_12px,#DDD8D0_12px_24px)] lg:h-[220px]">
          {coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- URL do Cloudinary já otimizada
            <img
              src={coverUrl}
              alt="Capa"
              className="absolute inset-0 size-full object-cover"
            />
          )}
          <input
            ref={coverInput}
            id="store-cover"
            type="file"
            accept={IMAGE_ACCEPT}
            aria-label="Capa"
            className="sr-only"
            onChange={pick("cover")}
          />
          <button
            type="button"
            disabled={busy === "cover"}
            onClick={() => coverInput.current?.click()}
            className="absolute right-3 bottom-2 flex h-11 items-center"
          >
            <span className="flex h-8 items-center gap-1.5 rounded-full bg-surface/95 px-3 text-xs font-bold text-ink">
              <PencilIcon size={13} />
              {label("cover", !!coverUrl)}
            </span>
          </button>
        </div>
        <div className="flex items-end gap-3 px-4 pb-4">
          <div className="relative -mt-9 flex-none">
            <div className="flex size-[72px] items-center justify-center overflow-hidden rounded-[16px] border-[3px] border-surface bg-ink text-xl font-extrabold text-white">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL do Cloudinary já otimizada
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="size-full object-cover"
                />
              ) : (
                initialsOf(storeName)
              )}
            </div>
            <input
              ref={logoInput}
              id="store-logo"
              type="file"
              accept={IMAGE_ACCEPT}
              aria-label="Logo"
              className="sr-only"
              onChange={pick("logo")}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-2">
            <p className="truncate text-xl leading-tight font-extrabold">
              {storeName}
            </p>
            {subtitle && <p className="text-[13px] text-text-3">{subtitle}</p>}
          </div>
          <button
            type="button"
            disabled={busy === "logo"}
            onClick={() => logoInput.current?.click()}
            className="flex h-11 flex-none items-center text-xs font-bold text-caju-ink underline underline-offset-2"
          >
            {label("logo", !!logoUrl)}
          </button>
        </div>
        {error && (
          <p role="alert" className="px-4 pb-3 text-xs text-caju-deep">
            {error.message}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2 px-4 pb-4">
          <ButtonLink
            variant="dark"
            href={catalogUrl}
            target="_blank"
            rel="noopener"
          >
            Ver como cliente
          </ButtonLink>
          <Button variant="soft" onClick={share}>
            Compartilhar
          </Button>
        </div>
      </section>

      {/* Card laranja-claro com QR e link ([3b]). */}
      <section className="flex items-center gap-3.5 rounded-card bg-caju-soft p-3.5">
        <div className="flex size-[72px] flex-none items-center justify-center rounded-[10px] bg-surface p-1.5">
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element -- QR gerado no aparelho
            <img src={qr} alt="" className="size-full" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-xs font-bold text-caju-deep">
            Link do seu catálogo
          </p>
          <p
            className="font-mono text-sm font-medium break-all text-ink"
            data-testid="catalog-url"
          >
            {catalogUrl}
          </p>
          <p className="flex flex-wrap items-center text-xs font-bold text-caju-deep">
            <button type="button" onClick={copy} className="min-h-11 pr-1">
              Copiar link
            </button>
            <span aria-hidden>·</span>
            <button
              type="button"
              onClick={downloadQr}
              className="min-h-11 pl-1"
            >
              Baixar QR code
            </button>
          </p>
          {notice && (
            <p role="status" className="text-xs text-ok">
              {notice}
            </p>
          )}
        </div>
      </section>

      {referralCode && referralUrl && (
        <section className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
          <h2 className="text-[17px] font-extrabold">
            Seu código de indicação
          </h2>
          <p className="text-sm text-text-2">
            Indique a CajuGo para outras lojas com o código{" "}
            <strong className="font-mono text-ink" data-testid="referral-code">
              {referralCode}
            </strong>{" "}
            ou o link:
          </p>
          <p className="font-mono text-sm break-all" data-testid="referral-url">
            {referralUrl}
          </p>
        </section>
      )}
    </div>
  );
}
