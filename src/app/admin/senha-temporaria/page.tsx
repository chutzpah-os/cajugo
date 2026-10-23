import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { TemporaryPasswordTool } from "@/domains/auth/components/temporary-password-tool";
import { requireArea } from "@/domains/auth/guards";
import { can } from "@/domains/auth/permissions";

export const metadata: Metadata = { title: "Senha temporária | CajuGo" };

async function Content() {
  const { session, allowed, home } = await requireArea(
    "admin",
    "/admin/senha-temporaria",
  );
  if (!allowed) return <NoPermission home={home} />;
  // Suporte vê a busca, sem o botão (AUT-SEC-008).
  const canSet = can(session, "users.temporaryPassword");
  return (
    <section className="flex flex-col gap-4 py-6">
      <h1 className="text-[22px] font-extrabold">Senha temporária</h1>
      <p className="text-[15px] text-text-2">
        Para quem esqueceu a senha: confirme pelo WhatsApp que a conta é da
        pessoa, gere uma senha temporária e envie a ela.
      </p>
      <TemporaryPasswordTool canSet={canSet} />
    </section>
  );
}

/** Senha temporária [6g, provisória até a spec 012] (AUT-FR-014). */
export default function TemporaryPasswordPage() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
