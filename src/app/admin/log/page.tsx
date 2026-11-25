import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireArea } from "@/domains/auth/guards";
import { getDb } from "@/platform/db/client";
import { ActivityLogSection } from "@/domains/admin/components/activity-log-view";
import { activityLogView } from "@/domains/admin/activity-log";
import { SettingHistory } from "@/domains/settings/components/setting-history";
import {
  SETTING_GROUPS,
  SETTING_KEYS,
  SETTINGS,
  type SettingGroup,
} from "@/domains/settings/definitions";

export const metadata: Metadata = {
  title: "Log | CajuGo",
  robots: { index: false, follow: false },
};

const GROUP_TITLE: Record<SettingGroup, string> = {
  showcase: "Vitrine CajuGo",
  network: "Rede Caju",
  payment: "Pagamento",
  approval: "Aprovação prévia",
  data: "Dados",
  referral: "Caju Indica",
  laudo: "LaudoCaju",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function Content({ searchParams }: { searchParams: SearchParams }) {
  const { session, allowed, home } = await requireArea("admin", "/admin/log");
  if (!allowed) return <NoPermission home={home} />;
  const params = await searchParams;
  const activity = await activityLogView({ db: getDb() }, session, params);

  return (
    <section className="flex flex-col gap-3 pt-6 pb-6 lg:max-w-3xl lg:pt-2">
      <header className="flex flex-col gap-1 pr-12 pb-2 lg:pr-0">
        <h1 className="text-[26px] font-extrabold tracking-[-0.02em]">Log</h1>
        <p className="text-sm text-text-2">
          Histórico das regras e registros do sistema, do mais recente ao mais
          antigo.
        </p>
      </header>

      <ActivityLogSection view={activity} />
      {activity.store ? null : (
        <h2 className="pt-2 text-[17px] font-extrabold">
          Regras da plataforma
        </h2>
      )}
      {!activity.store &&
        SETTING_GROUPS.map((group) => {
          const keys = SETTING_KEYS.filter((k) => SETTINGS[k].group === group);
          if (keys.length === 0) return null;
          return (
            <section
              key={group}
              aria-label={GROUP_TITLE[group]}
              className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4"
            >
              <h3 className="text-[15px] font-extrabold">
                {GROUP_TITLE[group]}
              </h3>
              {keys.map((key) => (
                <SettingHistory key={key} session={session} settingKey={key} />
              ))}
            </section>
          );
        })}
    </section>
  );
}

/**
 * Log do admin (012): o único lugar dos históricos. Reúne o histórico de cada regra
 * (CFG-FR-006) e, com a 012b, os logs de atividade (ADM-FR-015) e o histórico de cada
 * loja (ADM-FR-011), para não poluir Conta, Regras e o detalhe da loja.
 */
export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <AreaPage>
      <Content searchParams={searchParams} />
    </AreaPage>
  );
}
