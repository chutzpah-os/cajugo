import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { currentSession } from "@/domains/auth/service";
import { StoreSignupForm } from "@/domains/stores/components/store-signup-form";
import { appUrl } from "@/platform/http/urls";
import { Logo } from "@/ui/logo";

export const metadata: Metadata = {
  title: "Criar conta da loja | CajuGo",
  robots: { index: false, follow: true },
};

async function Form({ searchParams }: PageProps<"/lojistas/cadastro">) {
  await connection();
  const { codigo } = await searchParams;
  const code =
    typeof codigo === "string" && /^[A-Za-z0-9]{3,20}$/.test(codigo)
      ? codigo.toUpperCase()
      : "";
  const session = await currentSession();
  return (
    <>
      {session && (
        <p className="rounded-card bg-info-soft p-3 text-sm text-info">
          Você está conectado: a loja será criada na sua conta.
        </p>
      )}
      <StoreSignupForm
        signedIn={!!session}
        initialCode={code}
        appHost={new URL(appUrl()).host}
      />
    </>
  );
}

/** Cadastro do lojista [5c] (1/2): conta + loja (STO-FR-003…007, 015). */
export default function StoreSignupPage(
  props: PageProps<"/lojistas/cadastro">,
) {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-5 px-4 pt-4 pb-8">
      <header className="flex items-center gap-2">
        <Link
          href="/lojistas"
          aria-label="Voltar para a página do Catálogo"
          className="-ml-2 flex size-11 items-center justify-center text-xl"
        >
          ‹
        </Link>
        <Logo />
      </header>
      <div className="flex flex-col gap-2">
        <h1 className="text-[24px] font-extrabold tracking-[-0.02em]">
          Criar conta da loja
        </h1>
        <p className="text-sm text-text-3">
          1 de 2 · depois, o pagamento por Pix
        </p>
        <div aria-hidden className="grid grid-cols-2 gap-1">
          <span className="h-1 rounded-full bg-caju" />
          <span className="h-1 rounded-full bg-line" />
        </div>
      </div>
      <Suspense fallback={null}>
        <Form {...props} />
      </Suspense>
    </main>
  );
}
