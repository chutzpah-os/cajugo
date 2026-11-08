import type { Metadata } from "next";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireStorePage } from "@/domains/auth/guards";
import { CopyLine } from "@/domains/billing/components/pix-panel";
import { ReceiptForm } from "@/domains/billing/components/receipt-form";
import { pixView } from "@/domains/billing/service";
import { brl, centsToReais } from "@/platform/br/money";
import { getDb } from "@/platform/db/client";

export const metadata: Metadata = {
  title: "Pague com Pix | CajuGo",
  robots: { index: false, follow: false },
};

async function Content() {
  const { session, allowed, home } = await requireStorePage(
    "/lojistas/pagamento/pix",
    "billing.manage",
  );
  if (!allowed) return <NoPermission home={home} />;
  const view = await pixView({ db: getDb() }, session).catch(() => null);
  // Sem fatura aberta (não passou por [5d]) ou chave não pronta: volta para [5d].
  if (!view) redirect("/lojistas/pagamento");
  const qr = await QRCode.toDataURL(view.brCode, { width: 400, margin: 1 });

  return (
    <section className="flex flex-col gap-5 py-6">
      <h1 className="text-[24px] font-extrabold tracking-[-0.02em]">
        Pague com Pix
      </h1>

      <div className="flex flex-col items-center gap-4 rounded-card border border-line bg-surface p-4">
        <p className="text-[30px] font-extrabold" data-testid="pix-amount">
          {brl(view.amountCents)}
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element -- QR gerado no servidor (data:) */}
        <img
          src={qr}
          alt={`QR code do Pix de ${brl(view.amountCents)}`}
          width={200}
          height={200}
        />
        <div className="flex w-full flex-col gap-3">
          <CopyLine label="Chave Pix" value={view.key} />
          <CopyLine label="Pix copia e cola" value={view.brCode} />
          <p className="text-sm text-text-2">
            Favorecido: <strong className="text-ink">{view.beneficiary}</strong>
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-[17px] font-extrabold">Como pagar</h2>
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-text-2">
          <li>Abra o app do seu banco e escolha pagar com Pix.</li>
          <li>Leia o QR code ou use o Pix copia e cola (ou a chave).</li>
          <li>Confira o valor de {brl(view.amountCents)} e o favorecido.</li>
          <li>Salve o comprovante e anexe aqui.</li>
        </ol>
      </section>

      <ReceiptForm suggestedAmount={centsToReais(view.amountCents)} />
      <p className="text-sm text-text-3">
        Conferimos o comprovante em até {view.reviewBusinessDays}{" "}
        {view.reviewBusinessDays === 1 ? "dia útil" : "dias úteis"}.
      </p>
    </section>
  );
}

/** Pix manual [6c] (PIX-FR-004, 005, 006; PIX-SEC-002). */
export default function PixPage() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
