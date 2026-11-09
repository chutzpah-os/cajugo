import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Página não encontrada | CajuGo",
  robots: { index: false, follow: true },
};

/** 404 em português: inexistente ou de outra loja, sem dizer qual dos dois. */
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col items-start gap-3 px-4 py-12">
      <h1 className="text-[24px] font-extrabold tracking-[-0.02em]">
        Página não encontrada
      </h1>
      <p className="text-[15px] text-text-2">
        O endereço pode estar errado ou o conteúdo não existe mais.
      </p>
      <Link
        href="/"
        className="flex min-h-11 items-center font-bold text-caju-ink"
      >
        Voltar para o início
      </Link>
    </main>
  );
}
