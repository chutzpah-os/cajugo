import Link from "next/link";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { ProvisionalPage } from "@/domains/auth/components/provisional-page";
import { requireArea } from "@/domains/auth/guards";

async function Content() {
  const { allowed, home } = await requireArea("admin", "/admin");
  if (!allowed) return <NoPermission home={home} />;
  return (
    <ProvisionalPage title="Painel admin" screen="4a">
      Visão geral da operação (spec 012).
      <Link
        href="/admin/senha-temporaria"
        className="mt-4 flex min-h-[48px] items-center justify-between rounded-card border border-line bg-surface px-4 font-bold text-ink"
      >
        Senha temporária
        <span aria-hidden className="text-text-3">
          ›
        </span>
      </Link>
    </ProvisionalPage>
  );
}

export default function Page() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
