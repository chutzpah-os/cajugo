import { SiteFooter } from "@/ui/site-footer";
import type { Metadata } from "next";
import { SiteHeader } from "@/domains/auth/components/site-header";
import { AuthLayout } from "@/ui/auth-layout";
import { connection } from "next/server";
import { Suspense } from "react";
import { currentSettings } from "@/domains/settings/current";
import { publicSettings } from "@/domains/settings/service";
import { whatsappLink } from "@/platform/whatsapp/link";
import { ButtonLink } from "@/ui/button";

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
const PANEL = {
  eyebrow: "Suporte CajuGo",
  title: "A gente ajuda você a voltar para a sua conta",
  perks: [
    "Confirmamos que a conta é sua",
    "Você recebe uma senha temporária",
    "No primeiro acesso, cria a sua senha nova",
  ],
} as const;

export default function RecoverPasswordPage() {
  return (
    <>
      <SiteHeader />
      <AuthLayout
        title="Recuperar senha"
        subtitle="Para criar uma nova senha, fale com o suporte CajuGo. Vamos confirmar que a conta é sua e enviar uma senha temporária."
        panel={PANEL}
      >
        <Suspense fallback={<div className="h-[50px]" aria-hidden />}>
          <SupportButton />
        </Suspense>
      </AuthLayout>
      <SiteFooter />
    </>
  );
}
