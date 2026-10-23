import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "@/domains/auth/components/sign-in-form";
import { Logo } from "@/ui/logo";

export const metadata: Metadata = {
  title: "Entrar | CajuGo",
  description: "Entre na sua conta CajuGo: lojista, vendedor ou indicador.",
  robots: { index: false, follow: false },
};

const SIGN_UPS = [
  { href: "/lojistas", label: "Divulgar meus veículos" },
  { href: "/rede/cadastro", label: "Rede Caju" },
  { href: "/indica/cadastro", label: "Caju Indica" },
];

/** Login único [9f]: e-mail e senha (AUT-FR-001, AUT-NFR-002). */
export default function SignInPage() {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col px-4 pt-4 pb-6">
      <header className="flex items-center gap-2">
        <Link
          href="/"
          aria-label="Voltar para a vitrine"
          className="-ml-2 flex size-11 items-center justify-center text-xl"
        >
          ‹
        </Link>
        <Logo />
      </header>

      <h1 className="mt-8 text-[28px] font-extrabold tracking-[-0.02em]">
        Entrar
      </h1>
      <p className="mt-1 text-[15px] text-text-2">
        Lojista, vendedor ou indicador: a mesma conta.
      </p>

      <div className="mt-6">
        <SignInForm />
      </div>

      <nav
        aria-label="Criar conta"
        className="mt-auto border-t border-line pt-4"
      >
        <p className="text-sm text-text-3">Ainda não tem conta?</p>
        <ul>
          {SIGN_UPS.map((s) => (
            <li key={s.href} className="border-b border-line-2 last:border-0">
              <Link
                href={s.href}
                className="flex min-h-[48px] items-center justify-between text-[15px] font-bold"
              >
                {s.label}
                <span aria-hidden className="text-text-3">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
