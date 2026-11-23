import QRCode from "qrcode";
import { brl, centsToReais } from "@/platform/br/money";
import type { PixView } from "../service";
import { CopyLine } from "./pix-panel";
import { ReceiptForm } from "./receipt-form";

/** Conteúdo do Pix manual [6c]: valor, QR, chave, como pagar e o comprovante. */
export async function PixPayment({ view }: { view: PixView }) {
  const qr = await QRCode.toDataURL(view.brCode, { width: 400, margin: 1 });
  return (
    <>
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
    </>
  );
}
