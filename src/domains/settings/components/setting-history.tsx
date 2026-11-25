import type { Session } from "@/platform/http/session";
import { getDb } from "@/platform/db/client";
import { ChevronDownIcon } from "@/ui/icons";
import { SETTINGS, type SettingKey } from "../definitions";
import { displaySettingValue } from "../form";
import { settingHistory } from "../service";

/** As mais recentes cabem na tela; o resto fica no registro de atividade. */
const SHOWN = 10;

const when = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

/**
 * Histórico de uma regra (CFG-FR-006), recolhido, na tela Log do admin (012): os
 * históricos ficam só lá para não poluir a Conta e as Regras. Admin e suporte.
 */
export async function SettingHistory({
  session,
  settingKey,
}: {
  session: Session;
  settingKey: SettingKey;
}) {
  const history = await settingHistory(getDb(), session, settingKey);
  const name = SETTINGS[settingKey].label.replace(/ \(.*\)$/, "");
  return (
    <details
      data-testid={`history-${settingKey}`}
      className="group rounded-input border border-line-2"
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-semibold text-caju-ink">
        {name}
        <ChevronDownIcon
          size={16}
          className="flex-none transition-transform group-open:rotate-180"
        />
      </summary>
      {history.length === 0 ? (
        <p className="px-3 pb-3 text-sm text-text-2">
          Esta regra ainda não foi alterada: vale o valor inicial.
        </p>
      ) : (
        <ol className="flex flex-col divide-y divide-line-2 px-3 pb-1">
          {history.slice(0, SHOWN).map((change) => (
            <li key={change.at.toISOString()} className="py-2.5 text-sm">
              <p className="text-xs text-text-3">
                {when.format(change.at)} · {change.by ?? "—"}
              </p>
              <p>
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
      {history.length > SHOWN && (
        <p className="px-3 pb-3 text-xs text-text-3">
          E mais {history.length - SHOWN} alterações antigas.
        </p>
      )}
    </details>
  );
}
