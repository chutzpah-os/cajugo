import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { currentSettings } from "@/domains/settings/current";
import { publicSettings } from "@/domains/settings/service";
import { whatsappLink } from "@/platform/whatsapp/link";
import { ButtonLink } from "@/ui/button";
import { Logo } from "@/ui/logo";

export const metadata: Metadata = {
  title: "Recuperar senha | CajuGo",
  description: "Fale com o suporte CajuGo para criar uma nova senha.",
  robots: { index: false, follow: true },
};

const MESSAGE =
  "Olá! Esqueci minha senha do CajuGo e preciso de ajuda para criar uma nova.";

/**
 * Botão do WhatsApp com o número das regras [4c] (CFG-FR-007). Montado por requisição
 * (`connection`), com o cache de 1 min das regras: o build não depende do banco.
 */
async function SupportButton() {
  await connection();
  const { supportWhatsapp } = publicSettings(await currentSettings());
  return (
    <ButtonLink
      href={whatsappLink(supportWhatsapp, MESSAGE)}
      variant="whatsapp"
      block
      className="mt-6"
      target="_blank"
      rel="noopener noreferrer"
    >
      Falar com o suporte no WhatsApp
    </ButtonLink>
  );
}

/** Recuperar senha [6b], manual no MVP: suporte pelo WhatsApp (AUT-FR-013, ADR 0004). */
export default function RecoverPasswordPage() {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col px-4 pt-4 pb-6">
      <header className="flex items-center gap-2">
        <Link
          href="/entrar"
          aria-label="Voltar para o login"
          className="-ml-2 flex size-11 items-center justify-center text-xl"
        >
          ‹
        </Link>
        <Logo />
      </header>
      <h1 className="mt-8 text-[28px] font-extrabold tracking-[-0.02em]">
        Recuperar senha
      </h1>
      <p className="mt-1 text-[15px] text-text-2">
        Para criar uma nova senha, fale com o suporte CajuGo. Vamos confirmar
        que a conta é sua e enviar uma senha temporária.
      </p>
      <Suspense fallback={<div className="mt-6 h-[50px]" aria-hidden />}>
        <SupportButton />
      </Suspense>
    </main>
  );
}
