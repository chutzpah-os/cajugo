import Link from "next/link";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { TemporaryPasswordTool } from "@/domains/auth/components/temporary-password-tool";
import { requireArea } from "@/domains/auth/guards";
import { accountMenu, can } from "@/domains/auth/service";
import { AdminDashboardView } from "@/domains/admin/components/admin-dashboard";
import { adminDashboard } from "@/domains/admin/service";
import { ReviewQueue } from "@/domains/billing/components/review-queue";
import { reviewQueue } from "@/domains/billing/service";
import { cachedPendingAlerts } from "@/domains/buyers/current";
import { getDb } from "@/platform/db/client";
import { LightHeader } from "@/ui/page-header";

const TZ = "America/Sao_Paulo";
const monthYear = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: TZ,
});
const weekdayDay = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: TZ,
});
const monthName = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  timeZone: TZ,
});
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

async function Content() {
  const { session, allowed, home } = await requireArea("admin", "/admin");
  if (!allowed) return <NoPermission home={home} />;
  const db = getDb();
  const now = new Date();
  const [view, me, queue] = await Promise.all([
    adminDashboard(
      { db, now: () => now, pendingAlerts: cachedPendingAlerts },
      session,
    ),
    accountMenu(db, session),
    reviewQueue({ db }, session),
  ]);
  const prev = new Date(now);
  prev.setUTCDate(1);
  prev.setUTCMonth(prev.getUTCMonth() - 1);
  // Suporte vê a busca, sem o botão (AUT-SEC-008).
  const canSet = can(session, "users.temporaryPassword");

  return (
    <div className="flex flex-col pb-6">
      <LightHeader
        eyebrow={capitalize(monthYear.format(now).replace(" de ", " "))}
        title={`Olá, ${me?.name ?? "equipe"}`}
        desktop={{
          eyebrow: capitalize(weekdayDay.format(now).replace("-feira", "")),
          title: "Visão geral",
        }}
      />
      <AdminDashboardView
        view={view}
        previousMonth={monthName.format(prev)}
        queues={
          <section
            aria-label="Comprovantes Pix"
            className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[17px] font-extrabold">Comprovantes Pix</h2>
              <Link
                href="/admin/pagamentos"
                className="text-[13px] font-bold text-caju-ink"
              >
                Ver todos
              </Link>
            </div>
            {queue.items.length === 0 ? (
              <p className="text-sm text-text-2">
                Nenhum comprovante a conferir.
              </p>
            ) : (
              <ReviewQueue
                items={queue.items.slice(0, 3)}
                canReview={queue.canReview}
              />
            )}
          </section>
        }
      />
      {/* Senha temporária fica aqui até o detalhe da loja [6g] (T015). */}
      <section
        aria-labelledby="temporary-password-title"
        className="mt-3 flex flex-col gap-3 rounded-card border border-line bg-surface p-4 lg:mt-5"
      >
        <h2
          id="temporary-password-title"
          className="text-[17px] font-extrabold"
        >
          Senha temporária
        </h2>
        <p className="text-sm text-text-2">
          Para quem esqueceu a senha: confirme pelo WhatsApp que a conta é da
          pessoa, gere uma senha temporária e envie a ela.
        </p>
        <TemporaryPasswordTool canSet={canSet} />
      </section>
    </div>
  );
}

/** Painel do admin [4a] e Visão geral [15c] (012b · ADM-FR-001…003, ADM-FR-013). */
export default function Page() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
