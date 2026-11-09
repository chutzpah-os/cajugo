"use client";

import Link from "next/link";
import type { VehicleFormView } from "../service";
import { PhotosSection } from "./photos-section";
import { PublishBar } from "./publish-bar";
import { VehicleForm } from "./vehicle-form";

/** Tela [2a]: cabeçalho com fechar, fotos, formulário e Publicar. */
export function VehicleEditor({
  title,
  initial,
  defaults,
  cloudName,
}: {
  title: string;
  initial: VehicleFormView | null;
  defaults?: { shareOnCajugo: boolean; contactWhatsapp: string };
  cloudName: string;
}) {
  return (
    <section className="flex flex-col gap-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-[22px] font-extrabold">{title}</h1>
        <Link
          href="/painel/veiculos"
          aria-label="Fechar e voltar para Meus veículos"
          className="flex size-11 items-center justify-center text-xl"
        >
          ✕
        </Link>
      </header>
      <VehicleForm
        initial={initial}
        defaults={defaults}
        top={<PhotosSection cloudName={cloudName} />}
        bottom={<PublishBar />}
      />
    </section>
  );
}
