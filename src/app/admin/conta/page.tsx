import type { Metadata } from "next";
import Link from "next/link";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireArea } from "@/domains/auth/guards";
import { can } from "@/domains/auth/permissions";
import { PixKeyEditor } from "@/domains/settings/components/pix-key-editor";
import { SettingsGroupForm } from "@/domains/settings/components/settings-group-form";
import { currentSettings } from "@/domains/settings/current";
import { groupFields } from "@/domains/settings/form";
import { maskPixKey } from "@/domains/settings/format";
import { ReadOnlyNotice } from "@/ui/read-only-notice";

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
  const form = (group: Parameters<typeof groupFields>[1], title: string) => (
    <SettingsGroupForm
      group={group}
      title={title}
      fields={groupFields(settings, group)}
      canEdit={canEdit}
    />
  );

  return (
    <section className="flex flex-col gap-4 py-6">
      <h1 className="text-[22px] font-extrabold">Conta</h1>
      {!canEdit && (
        <ReadOnlyNotice>
          Só o admin altera as regras da plataforma.
        </ReadOnlyNotice>
      )}

      <SettingsGroupForm
        group="showcase"
        title="Vitrine CajuGo"
        fields={groupFields(settings, "showcase")}
        canEdit={canEdit}
      >
        <div className="flex flex-col gap-1">
          <p className="text-sm text-text-2">
            Nome: <strong className="text-ink">CajuGo</strong>
          </p>
          <p className="text-sm text-text-2">
            Endereço: <strong className="text-ink">{showcaseHost()}</strong>
          </p>
          <p className="text-xs text-text-3">
            Nome e endereço mudam pelo deploy (links, QR codes e SEO).
          </p>
        </div>
      </SettingsGroupForm>
      {form("network", "Rede Caju")}

      <PixKeyEditor
        canEdit={canEdit}
        current={
          settings.pix
            ? {
                masked: maskPixKey(settings.pix),
                // A chave inteira só vai para quem pode trocá-la (revisão lado a lado).
                full: canEdit ? settings.pix.key : undefined,
                beneficiary: settings.pix.beneficiary,
              }
            : null
        }
      />
      {form("payment", "Pagamento")}
      {form("approval", "Aprovação prévia")}
      {form("data", "Dados")}

      <nav
        aria-label="Minha conta"
        className="rounded-card border border-line bg-surface"
      >
        <Link
          href="/conta/senha"
          className="flex min-h-12 items-center justify-between px-4 text-[15px] font-bold"
        >
          Alterar senha
          <span aria-hidden className="text-text-3">
            ›
          </span>
        </Link>
      </nav>
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
