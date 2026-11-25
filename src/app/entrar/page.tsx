import { SiteFooter } from "@/ui/site-footer";
import type { Metadata } from "next";
import { SiteHeader } from "@/domains/auth/components/site-header";
import { AuthLayout } from "@/ui/auth-layout";
import Link from "next/link";
import { SignInForm } from "@/domains/auth/components/sign-in-form";

export const metadata: Metadata = {
  title: "Entrar | CajuGo",
  description: "Entre na sua conta CajuGo: lojista, vendedor ou indicador.",
  robots: { index: false, follow: false },
};

const SIGN_UPS = [
  { href: "/lojistas", label: "Divulgar meus veículos" },
  { href: "/rede-caju/cadastro", label: "Rede Caju" },
  { href: "/indica/cadastro", label: "Caju Indica" },
];

/** Login único [9f]: e-mail e senha (AUT-FR-001, AUT-NFR-002). */
const PANEL = {
  eyebrow: "CajuGo",
  title: "A sua plataforma automotiva, numa conta só",
  perks: [
    "Lojista: catálogo da loja, vitrine CajuGo e interessados no WhatsApp",
    "Vendedor da Rede Caju: comissão por cada venda",
    "Indicador do Caju Indica: ganhe por loja indicada",
    "A mesma conta para tudo, com um painel para cada papel",
  ],
} as const;

export default function SignInPage() {
  return (
    <>
      <SiteHeader />
      <AuthLayout
        title="Entrar"
        subtitle="Lojista, vendedor ou indicador: a mesma conta."
        panel={PANEL}
      >
        <SignInForm />
        <nav aria-label="Criar conta" className="border-t border-line pt-4">
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
      </AuthLayout>
      <SiteFooter />
    </>
  );
}
