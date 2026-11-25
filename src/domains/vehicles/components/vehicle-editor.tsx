"use client";

import Link from "next/link";
import { XIcon } from "@/ui/icons";
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
    <section className="flex flex-col gap-3 pb-6">
      {/* Cabeçalho branco [2a]: fechar e o título; o status do salvamento vem logo abaixo. */}
      <header className="-mx-4 flex items-center gap-1 border-b border-line bg-surface py-2 pr-16 pl-2 lg:mx-0 lg:rounded-card lg:border lg:pr-2">
        <Link
          href="/painel/veiculos"
          aria-label="Fechar e voltar para Meus veículos"
          className="flex size-11 items-center justify-center"
        >
          <XIcon size={20} />
        </Link>
        <h1 className="text-[17px] font-extrabold">{title}</h1>
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
