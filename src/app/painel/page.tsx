import { NoPermission } from "@/domains/auth/components/no-permission";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { redirect } from "next/navigation";
import { requireArea } from "@/domains/auth/guards";
import { landingFor } from "@/domains/auth/landing";
import { storeStatusOf } from "@/domains/auth/service";
import { getDb } from "@/platform/db/client";

/** `/painel` leva à tela inicial da loja conforme a situação (AUT-FR-006, 008, 010, 016). */
async function Content() {
  const { session, allowed, home } = await requireArea("painel", "/painel");
  if (!allowed) return <NoPermission home={home} />;
  redirect(
    landingFor(
      { roles: session.roles, mustChangePassword: false },
      {
        lastPanel: session.roles.includes("store_owner")
          ? "store_owner"
          : "store_staff",
        storeStatus: await storeStatusOf(getDb(), session.storeId),
      },
    ),
  );
}

export default function PanelIndex() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
