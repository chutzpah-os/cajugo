import { SiteFooter } from "@/ui/site-footer";
import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/domains/auth/components/site-header";
import { CancelAlert } from "@/domains/buyers/components/cancel-alert";

/** Página pessoal, pelo link do aviso: fora da busca e do sitemap. */
export const metadata: Metadata = {
  title: "Cancelar aviso | CajuGo",
  robots: { index: false, follow: false },
};

async function Token({
  params,
}: {
  params: PageProps<"/alertas/cancelar/[token]">["params"];
}) {
  const { token } = await params;
  return <CancelAlert token={token} />;
}

/** Cancelar o "Avisar quando chegar" pelo link (ALR-FR-004, ALR-SEC-005). */
export default function Page({
  params,
}: PageProps<"/alertas/cancelar/[token]">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-4 px-4 py-6">
        <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.02em]">
          Cancelar aviso
        </h1>
        <Suspense fallback={null}>
          <Token params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
