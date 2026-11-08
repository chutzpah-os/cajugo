import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireArea } from "@/domains/auth/guards";
import {
  SETTINGS,
  SETTING_KEYS,
  type SettingKey,
} from "@/domains/settings/definitions";
import { displaySettingValue } from "@/domains/settings/form";
import { settingHistory } from "@/domains/settings/service";
import { getDb } from "@/platform/db/client";
import { AppError } from "@/platform/http/errors";

export const metadata: Metadata = { title: "Histórico da regra | CajuGo" };

const when = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

/** As regras são uma lista fechada: o Next conhece todas no build. */
export function generateStaticParams() {
  return SETTING_KEYS.map((key) => ({ key }));
}

async function Content({ settingKey }: { settingKey: SettingKey }) {
  const key = settingKey;
  const { session, allowed, home } = await requireArea(
    "admin",
    `/admin/conta/historico/${key}`,
  );
  if (!allowed) return <NoPermission home={home} />;

  let history;
  try {
    history = await settingHistory(getDb(), session, settingKey);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
  const back =
    SETTINGS[settingKey].group === "referral"
      ? "/admin/indica/regras"
      : "/admin/conta";

  return (
    <section className="flex flex-col gap-4 py-6">
      <Link
        href={back}
        className="flex min-h-11 items-center text-sm font-semibold text-text-2"
      >
        ‹ Voltar
      </Link>
      <h1 className="text-[22px] font-extrabold">
        {SETTINGS[settingKey].label}
      </h1>
      {history.length === 0 ? (
        <p className="text-[15px] text-text-2">
          Esta regra ainda não foi alterada: vale o valor inicial.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {history.map((change) => (
            <li
              key={change.at.toISOString()}
              className="rounded-card border border-line bg-surface p-4 text-sm"
            >
              <p className="text-text-3">
                {when.format(change.at)} · {change.by ?? "—"}
              </p>
              <p className="mt-1 text-[15px]">
                <span className="text-text-2">
                  {displaySettingValue(settingKey, change.from)}
                </span>
                {" → "}
                <strong>{displaySettingValue(settingKey, change.to)}</strong>
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/**
 * Histórico de uma regra (CFG-FR-006): admin e suporte. A regra é validada antes do
 * `<Suspense>`: regra inexistente responde 404 de verdade, não uma página 200.
 */
export default async function SettingHistoryPage({
  params,
}: PageProps<"/admin/conta/historico/[key]">) {
  const { key } = await params;
  if (!SETTING_KEYS.includes(key as SettingKey)) notFound();
  return (
    <AreaPage>
      <Content settingKey={key as SettingKey} />
    </AreaPage>
  );
}
