import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireArea } from "@/domains/auth/guards";
import { can } from "@/domains/auth/permissions";
import { PixKeyEditor } from "@/domains/settings/components/pix-key-editor";
import {
  historiesOf,
  SettingHistory,
} from "@/domains/settings/components/setting-history";
import { SettingsGroupForm } from "@/domains/settings/components/settings-group-form";
import { currentSettings } from "@/domains/settings/current";
import { groupFields } from "@/domains/settings/form";
import { maskPixKey } from "@/domains/settings/format";
import { ReadOnlyNotice } from "@/ui/read-only-notice";
import { signOutAction } from "@/domains/auth/actions";
import { accountMenu } from "@/domains/auth/service";
import { getDb } from "@/platform/db/client";
import { Badge } from "@/ui/badge";
import { initialsOf } from "@/ui/initials";
import { SettingsList } from "@/ui/settings-list";
import { TextField } from "@/ui/text-field";

export const metadata: Metadata = { title: "Conta | CajuGo" };

/** Domínio da vitrine: só leitura, muda por deploy (CFG-FR-001). */
function showcaseHost() {
  try {
    return new URL(process.env.APP_URL ?? "").host;
  } catch {
    return "cajugo.vercel.app";
  }
}

async function Content() {
  const { session, allowed, home } = await requireArea("admin", "/admin/conta");
  if (!allowed) return <NoPermission home={home} />;
  const settings = await currentSettings();
  const canEdit = can(session, "settings.edit");
  const fieldsOf = (group: Parameters<typeof groupFields>[1]) =>
    groupFields(settings, group);
  const form = (group: Parameters<typeof groupFields>[1], title: string) => (
    <SettingsGroupForm
      group={group}
      title={title}
      fields={fieldsOf(group)}
      canEdit={canEdit}
      histories={historiesOf(session, fieldsOf(group))}
    />
  );

  const me = await accountMenu(getDb(), session);
  return (
    <section className="flex flex-col gap-3 pt-6 pb-6 lg:max-w-3xl lg:pt-2">
      {/* Perfil [4c]: sigla, nome, e-mail e o selo do papel. */}
      <header className="flex flex-col gap-4 pb-2">
        <h1 className="text-[26px] font-extrabold tracking-[-0.02em]">Conta</h1>
        {me && (
          <div className="flex items-center gap-3 pr-12 lg:pr-0">
            <span
              aria-hidden
              className="flex size-12 flex-none items-center justify-center rounded-full bg-ink text-base font-bold text-white"
            >
              {initialsOf(me.fullName)}
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="truncate text-base font-extrabold">{me.fullName}</p>
              <p className="truncate text-[13px] text-text-3">{me.email}</p>
            </div>
            <Badge tone="dark">{canEdit ? "Admin" : "Suporte"}</Badge>
          </div>
        )}
      </header>
      {!canEdit && (
        <ReadOnlyNotice>
          Só o admin altera as regras da plataforma.
        </ReadOnlyNotice>
      )}

      <SettingsGroupForm
        group="showcase"
        title="Vitrine CajuGo"
        fields={fieldsOf("showcase")}
        canEdit={canEdit}
        histories={historiesOf(session, fieldsOf("showcase"))}
      >
        <div className="flex flex-col gap-3">
          <TextField
            id="showcase-name"
            label="Nome da vitrine"
            value="CajuGo"
            readOnly
          />
          <TextField
            id="showcase-host"
            label="Endereço"
            value={showcaseHost()}
            readOnly
            help="Nome e endereço mudam pelo deploy (links, QR codes e SEO)."
          />
        </div>
      </SettingsGroupForm>
      {form("network", "Rede Caju")}

      <PixKeyEditor
        canEdit={canEdit}
        history={
          <SettingHistory
            session={session}
            settingKey="pix"
            label="Chave Pix"
          />
        }
        current={
          settings.pix
            ? {
                masked: maskPixKey(settings.pix),
                // A chave inteira só vai para quem pode trocá-la (revisão lado a lado).
                full: canEdit ? settings.pix.key : undefined,
                beneficiary: settings.pix.beneficiary,
                city: settings.pix.city,
              }
            : null
        }
      />
      {form("payment", "Pagamento")}
      {form("approval", "Aprovação prévia")}
      {form("data", "Dados")}

      <nav
        aria-label="Minha conta"
        className="-mx-4 border-y border-line bg-surface px-4 lg:mx-0 lg:rounded-card lg:border"
      >
        <SettingsList
          items={[
            { href: "/conta/senha", label: "Alterar senha" },
            { href: "/admin/avisos", label: "Avisos" },
          ]}
        />
      </nav>
      <form action={signOutAction}>
        <button
          type="submit"
          className="mt-2 flex h-[50px] w-full items-center justify-center rounded-button border-[1.5px] border-ink text-[15px] font-bold"
        >
          Sair
        </button>
      </form>
    </section>
  );
}

/** Conta admin [4c]: regras da plataforma (spec 002). */
export default function AdminAccountPage() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
