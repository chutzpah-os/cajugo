import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { NewPasswordForm } from "@/domains/auth/components/new-password-form";
import { currentSession, currentStoreStatus } from "@/domains/auth/current";
import { landingFor } from "@/domains/auth/landing";
import { loginUrl } from "@/platform/http/protected-paths";
import { Logo } from "@/ui/logo";

export const metadata: Metadata = {
  title: "Crie uma nova senha | CajuGo",
  robots: { index: false, follow: false },
};

async function Form() {
  const session = await currentSession();
  if (!session) redirect(loginUrl("/nova-senha", ""));
  // A tela existe só para quem entrou com senha temporária (AUT-FR-015).
  if (!session.mustChangePassword)
    redirect(
      landingFor(session, {
        lastPanel: session.activeRole,
        storeStatus: await currentStoreStatus(session.storeId),
      }),
    );
  return <NewPasswordForm />;
}

/** Nova senha, obrigatória depois de entrar com senha temporária (AUT-FR-015). */
export default function NewPasswordPage() {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col px-4 pt-4 pb-6">
      <header className="flex h-11 items-center">
        <Logo />
      </header>
      <h1 className="mt-8 text-[28px] font-extrabold tracking-[-0.02em]">
        Crie uma nova senha
      </h1>
      <p className="mt-1 text-[15px] text-text-2">
        Ela substitui a senha temporária e vale para todos os seus painéis.
      </p>
      <div className="mt-6">
        <Suspense fallback={null}>
          <Form />
        </Suspense>
      </div>
    </main>
  );
}
