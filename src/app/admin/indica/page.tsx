import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { ProvisionalPage } from "@/domains/auth/components/provisional-page";
import { requireArea } from "@/domains/auth/guards";
import { can } from "@/domains/auth/permissions";
import { SettingsGroupForm } from "@/domains/settings/components/settings-group-form";
import { currentSettings } from "@/domains/settings/current";
import { groupFields } from "@/domains/settings/form";
import { ReadOnlyNotice } from "@/ui/read-only-notice";

export const metadata: Metadata = { title: "Caju Indica | CajuGo" };

async function Content() {
  const { session, allowed, home } = await requireArea(
    "admin",
    "/admin/indica",
  );
  if (!allowed) return <NoPermission home={home} />;
  const canEdit = can(session, "settings.edit");
  const settings = await currentSettings();

  return (
    <div className="flex flex-col gap-4 pb-6">
      <ProvisionalPage title="Caju Indica" screen="8g">
        Indicações e pagamentos do programa (spec 010).
      </ProvisionalPage>
      {/* Regras do programa [8f] na própria tela, sem outra página (012). */}
      {!canEdit && (
        <ReadOnlyNotice>
          Só o admin altera as regras do Caju Indica.
        </ReadOnlyNotice>
      )}
      <SettingsGroupForm
        group="referral"
        title="Regras do programa"
        fields={groupFields(settings, "referral")}
        canEdit={canEdit}
      >
        <p className="text-sm text-text-2">
          Cada alteração vale para o que acontecer depois dela.
        </p>
      </SettingsGroupForm>
    </div>
  );
}

/** Caju Indica do admin [8g] com as Regras do programa [8f] (spec 002 e 010). */
export default function Page() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
