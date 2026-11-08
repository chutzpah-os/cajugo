import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ChangePasswordForm } from "@/domains/auth/components/change-password-form";
import { currentSession, currentStoreStatus } from "@/domains/auth/current";
import { landingFor } from "@/domains/auth/landing";
import { loginUrl } from "@/platform/http/protected-paths";
import { Logo } from "@/ui/logo";

export const metadata: Metadata = {
  title: "Alterar senha | CajuGo",
  robots: { index: false, follow: false },
};

async function Content() {
  const session = await currentSession();
  if (!session) redirect(loginUrl("/conta/senha", ""));
  // Com senha temporária, o caminho é a nova senha (AUT-FR-015).
  if (session.mustChangePassword) redirect("/nova-senha");
  const home = landingFor(session, {
    lastPanel: session.activeRole,
    storeStatus: await currentStoreStatus(session.storeId),
  });
  return (
    <>
      <header className="flex items-center gap-2">
        <Link
          href={home}
          aria-label="Voltar para o painel"
          className="-ml-2 flex size-11 items-center justify-center text-xl"
        >
          ‹
        </Link>
        <Logo />
      </header>
      <h1 className="mt-8 text-[28px] font-extrabold tracking-[-0.02em]">
        Alterar senha
      </h1>
      <p className="mt-1 text-[15px] text-text-2">
        Ao salvar, os outros aparelhos conectados à sua conta saem.
      </p>
      <div className="mt-6">
        <ChangePasswordForm />
      </div>
    </>
  );
}

/** Troca da própria senha, para qualquer papel (CFG-FR-010, D4 do plano 002). */
export default function ChangePasswordPage() {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col px-4 pt-4 pb-6">
      <Suspense fallback={null}>
        <Content />
      </Suspense>
    </main>
  );
}
