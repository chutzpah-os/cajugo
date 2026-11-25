import { SiteFooter } from "@/ui/site-footer";
import type { Metadata } from "next";
import { SiteHeader } from "@/domains/auth/components/site-header";
import { ContactRequestForm } from "@/domains/contacts/components/contact-request-form";
import { AuthLayout } from "@/ui/auth-layout";

export const metadata: Metadata = {
  title: "Recuperar senha | CajuGo",
  description: "Peça à CajuGo uma nova senha para a sua conta.",
  robots: { index: false, follow: true },
};

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
        subtitle="Deixe o seu WhatsApp e o e-mail da conta. A equipe CajuGo chama você, confirma que a conta é sua e envia uma senha temporária."
        panel={PANEL}
      >
        <div className="mt-6">
          <ContactRequestForm
            topic="password_help"
            submitLabel="Pedir nova senha"
            doneTitle="Pedido recebido."
            doneText="A equipe CajuGo chama você no WhatsApp para confirmar que a conta é sua e enviar uma senha temporária."
          />
        </div>
      </AuthLayout>
      <SiteFooter />
    </>
  );
}
