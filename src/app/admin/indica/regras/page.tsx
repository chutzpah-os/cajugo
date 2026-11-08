import type { Metadata } from "next";
import Link from "next/link";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireArea } from "@/domains/auth/guards";
import { can } from "@/domains/auth/permissions";
import { SettingsGroupForm } from "@/domains/settings/components/settings-group-form";
import { currentSettings } from "@/domains/settings/current";
import { groupFields } from "@/domains/settings/form";
import { ReadOnlyNotice } from "@/ui/read-only-notice";

export const metadata: Metadata = { title: "Regras do Caju Indica | CajuGo" };

async function Content() {
  const { session, allowed, home } = await requireArea(
    "admin",
    "/admin/indica/regras",
  );
  if (!allowed) return <NoPermission home={home} />;
  const canEdit = can(session, "settings.edit");
  const settings = await currentSettings();

  return (
    <section className="flex flex-col gap-4 py-6">
      <Link
        href="/admin/indica"
        className="flex min-h-11 items-center text-sm font-semibold text-text-2"
      >
        ‹ Caju Indica
      </Link>
      <h1 className="text-[22px] font-extrabold">Regras do programa</h1>
      {!canEdit && (
        <ReadOnlyNotice>
          Só o admin altera as regras do Caju Indica.
        </ReadOnlyNotice>
      )}
      <p className="text-sm text-text-2">
        A recompensa começa no 1º pagamento confirmado da loja indicada e vale
        para o que acontecer depois de cada alteração.
      </p>
      <SettingsGroupForm
        group="referral"
        title="Caju Indica"
        fields={groupFields(settings, "referral")}
        canEdit={canEdit}
      />
    </section>
  );
}

/** Regras do Caju Indica [8f], parte numérica (spec 002). */
export default function ReferralRulesPage() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
