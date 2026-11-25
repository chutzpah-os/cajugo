import { currentSettings } from "@/domains/settings/current";
import { publicSettings } from "@/domains/settings/service";
import { whatsappLink } from "@/platform/whatsapp/link";

const MESSAGE =
  "Olá! Quero ser avisado quando o serviço de leilão da CajuGo estiver disponível.";

/**
 * "Quero ser avisado" do leilão (017, HOM-FR-008): leva ao WhatsApp do atendimento das
 * regras [4c]. Fica numa rota à parte para a página de vendas continuar estática.
 */
export async function GET() {
  const { supportWhatsapp } = publicSettings(await currentSettings());
  return Response.redirect(whatsappLink(supportWhatsapp, MESSAGE), 307);
}
