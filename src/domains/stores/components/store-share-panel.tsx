"use client";

import QRCode from "qrcode";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/ui/button";
import { uploadSigned } from "@/platform/cloudinary/browser-upload";
import { ImageField } from "@/ui/image-field";
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
  catalogUrl,
  referralCode,
  referralUrl,
  logoUrl,
  coverUrl,
}: {
  storeName: string;
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

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4">
        <h2 className="text-[17px] font-extrabold">Imagens</h2>
        <ImageField
          id="store-cover"
          label="Capa"
          shape="wide"
          imageUrl={coverUrl}
          maxBytes={MAX_BYTES}
          busy={busy === "cover"}
          error={error?.kind === "cover" ? error.message : undefined}
          onFile={upload("cover")}
        />
        <ImageField
          id="store-logo"
          label="Logo"
          imageUrl={logoUrl}
          maxBytes={MAX_BYTES}
          busy={busy === "logo"}
          error={error?.kind === "logo" ? error.message : undefined}
          onFile={upload("logo")}
        />
      </section>

      <section className="flex flex-col gap-3 rounded-card bg-caju-tint p-4">
        <h2 className="text-[17px] font-extrabold">Link do catálogo</h2>
        <p className="font-mono text-sm break-all" data-testid="catalog-url">
          {catalogUrl}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="dark" size="sm" onClick={copy}>
            Copiar link
          </Button>
          <Button variant="ghost" size="sm" onClick={downloadQr}>
            Baixar QR code
          </Button>
          <Button variant="ghost" size="sm" onClick={share}>
            Compartilhar
          </Button>
          <ButtonLink
            variant="ghost"
            size="sm"
            href={catalogUrl}
            target="_blank"
            rel="noopener"
          >
            Ver como cliente
          </ButtonLink>
        </div>
        {notice && (
          <p role="status" className="text-sm text-ok">
            {notice}
          </p>
        )}
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
