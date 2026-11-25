import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { SiteHeader } from "@/domains/auth/components/site-header";
import { NOT_FOUND_HEADER } from "@/platform/http/public-gate";

export const metadata: Metadata = {
  title: "Página não encontrada | CajuGo",
  robots: { index: false, follow: true },
};

const GENERIC = {
  title: "Página não encontrada",
  text: "O endereço pode estar errado ou o conteúdo não existe mais.",
};

/** Loja cancelada (011b, CAN-SEC-005): sem o motivo. */
const STORE_GONE = {
  title: "Esta loja não está mais na CajuGo",
  text: "Veja outros carros de lojas da sua cidade na vitrine CajuGo.",
};

function Message({ title, text }: { title: string; text: string }) {
  return (
    <>
      <h1 className="text-[24px] font-extrabold tracking-[-0.02em]">{title}</h1>
      <p className="text-[15px] text-text-2">{text}</p>
    </>
  );
}

/** O proxy marca o 404 da loja cancelada (ADR 0013); o resto é o genérico. */
async function Reason() {
  const gone = (await headers()).get(NOT_FOUND_HEADER) === "store-gone";
  return <Message {...(gone ? STORE_GONE : GENERIC)} />;
}

/** 404 em português: inexistente ou de outra loja, sem dizer qual dos dois. */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col items-start gap-3 px-4 py-12">
        <Suspense fallback={<Message {...GENERIC} />}>
          <Reason />
        </Suspense>
        <Link
          href="/"
          className="flex min-h-11 items-center font-bold text-caju-ink"
        >
          Voltar para o início
        </Link>
      </main>
    </>
  );
}
