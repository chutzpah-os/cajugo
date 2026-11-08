import type { Metadata } from "next";
import Link from "next/link";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { ProvisionalPage } from "@/domains/auth/components/provisional-page";
import { requireArea } from "@/domains/auth/guards";

export const metadata: Metadata = { title: "Caju Indica | CajuGo" };

async function Content() {
  const { allowed, home } = await requireArea("admin", "/admin/indica");
  if (!allowed) return <NoPermission home={home} />;
  return (
    <ProvisionalPage title="Caju Indica" screen="8g">
      Indicações e pagamentos do programa (spec 010).
      <Link
        href="/admin/indica/regras"
        className="mt-4 flex min-h-[48px] items-center justify-between rounded-card border border-line bg-surface px-4 font-bold text-ink"
      >
        Regras do programa
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
