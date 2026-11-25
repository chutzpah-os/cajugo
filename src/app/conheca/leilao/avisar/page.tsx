import type { Metadata } from "next";
import { SiteHeader } from "@/domains/auth/components/site-header";
import { ContactRequestForm } from "@/domains/contacts/components/contact-request-form";
import { AuthLayout } from "@/ui/auth-layout";
import { SiteFooter } from "@/ui/site-footer";

export const metadata: Metadata = {
  title: "Quero ser avisado do Leilão CajuGo | CajuGo",
  description:
    "Deixe o seu WhatsApp e a CajuGo avisa quando o serviço de leilão abrir.",
  robots: { index: false, follow: true },
};

const PANEL = {
  eyebrow: "Leilão CajuGo · em breve",
  title: "Compre em leilão com segurança e ajuda de quem entende",
  perks: [
    "Seleção dos lotes que valem a pena",
    "Histórico do veículo antes do lance",
    "Orientação no valor do lance",
  ],
} as const;

/**
 * "Quero ser avisado" do leilão (017, HOM-FR-008): o pedido vai para o admin
 * [Contatos]; nenhum número da equipe aparece. Página estática.
 */
export default function AuctionNotifyPage() {
  return (
    <>
      <SiteHeader active="servicos" />
      <AuthLayout
        title="Quero ser avisado"
        subtitle="Deixe o seu WhatsApp. Avisamos assim que o serviço de leilão abrir."
        panel={PANEL}
      >
        <div className="mt-6">
          <ContactRequestForm
            topic="auction_waitlist"
            submitLabel="Quero ser avisado"
            doneTitle="Pronto! Vamos avisar você."
            doneText="Quando o serviço de leilão abrir, a CajuGo manda uma mensagem no seu WhatsApp."
          />
        </div>
      </AuthLayout>
      <SiteFooter />
    </>
  );
}
