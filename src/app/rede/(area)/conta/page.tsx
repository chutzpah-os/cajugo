import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/domains/auth/actions";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireArea } from "@/domains/auth/guards";
import { PixKeyForm } from "@/domains/sellers/components/pix-key-form";
import { sellerAccount } from "@/domains/sellers/service";
import { getDb } from "@/platform/db/client";
import { AppError } from "@/platform/http/errors";

export const metadata: Metadata = { title: "Conta | Rede Caju" };

const row = "flex min-h-11 items-center justify-between px-4 text-[15px]";

async function Content() {
  const { session, allowed, home } = await requireArea("rede", "/rede/conta");
  if (!allowed) return <NoPermission home={home} />;
  // Só o vendedor ativo: em análise ou bloqueado vê o status (SEL-FR-002).
  const acc = await sellerAccount(getDb(), session).catch((error: unknown) => {
    if (error instanceof AppError && error.status === 403) redirect("/rede");
    throw error;
  });
  return (
    <section className="flex flex-col gap-4 py-6">
      <h1 className="text-[22px] font-extrabold">Conta</h1>
      <section className="flex flex-col gap-1 rounded-card border border-line bg-surface p-4">
        <h2 className="text-[17px] font-extrabold">Seus dados</h2>
        <p>{acc.name}</p>
        <p className="text-sm text-text-2">
          {acc.email} · {acc.city}
        </p>
        <p className="text-sm text-text-2" data-testid="seller-cpf">
          CPF {acc.cpf}
        </p>
        <p className="text-sm text-text-2">Seu código: {acc.code}</p>
        <div className="flex flex-wrap gap-x-4">
          <a
            href={`/api/v1/sellers/${session.userId}/document/front`}
            target="_blank"
            rel="noopener"
            className="flex min-h-11 items-center text-sm font-bold text-caju-deep underline"
          >
            Documento (frente)
          </a>
          <a
            href={`/api/v1/sellers/${session.userId}/document/back`}
            target="_blank"
            rel="noopener"
            className="flex min-h-11 items-center text-sm font-bold text-caju-deep underline"
          >
            Documento (verso)
          </a>
        </div>
      </section>
      <section className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
        <h2 className="text-[17px] font-extrabold">Chave Pix</h2>
        <p className="text-sm text-text-2">
          As lojas parceiras pagam a sua comissão nesta chave.
        </p>
        <PixKeyForm current={acc.pix} />
      </section>
      <section className="flex flex-col gap-1 rounded-card border border-line bg-surface p-4">
        <h2 className="text-[17px] font-extrabold">Avisos</h2>
        <p className="text-sm text-text-2">
          Avisos por e-mail e WhatsApp · em breve
        </p>
      </section>
      <nav
        aria-label="Links da conta"
        className="rounded-card border border-line bg-surface"
      >
        <ul className="divide-y divide-line-2">
          <li>
            <Link href="/conta/senha" className={row}>
              Trocar senha <span aria-hidden>›</span>
            </Link>
          </li>
          <li>
            <Link href="/rede" className={row}>
              Lojas parceiras <span aria-hidden>›</span>
            </Link>
          </li>
          <li>
            <Link href="/indica" className={row}>
              Caju Indica <span aria-hidden>›</span>
            </Link>
          </li>
          <li>
            <Link href="/termos" className={row}>
              Termos e privacidade <span aria-hidden>›</span>
            </Link>
          </li>
          <li>
            <form action={signOutAction}>
              <button
                type="submit"
                className={`${row} w-full font-bold text-caju-deep`}
              >
                Sair
              </button>
            </form>
          </li>
        </ul>
      </nav>
    </section>
  );
}

/** Conta do vendedor [13c] (SEL-FR-014, SEL-SEC-001): CPF mascarado e chave Pix. */
export default function Page() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
