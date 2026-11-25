import QRCode from "qrcode";
import { brl, centsToReais } from "@/platform/br/money";
import type { PixView } from "../service";
import { CopyLine } from "@/ui/copy-line";
import { ReceiptForm } from "./receipt-form";

const STEPS = (amount: string) => [
  "Abra o app do seu banco e escolha pagar com Pix.",
  "Leia o QR code ou use o Pix copia e cola (ou a chave).",
  `Confira o valor de ${amount} e o favorecido.`,
  "Salve o comprovante e anexe aqui.",
];

/**
 * Pix manual [6c], como na captura: selo "Aguardando pagamento", valor, QR, chave e
 * copia e cola com **Copiar**, "Como pagar" em passos numerados e o comprovante.
 */
export async function PixPayment({ view }: { view: PixView }) {
  const qr = await QRCode.toDataURL(view.brCode, { width: 400, margin: 1 });
  const amount = brl(view.amountCents);
  return (
    <>
      <section className="-mx-4 flex flex-col items-center gap-4 bg-surface px-4 py-6 text-center lg:mx-0 lg:rounded-card lg:border lg:border-line">
        <p className="flex h-8 items-center gap-2 rounded-full bg-warn-soft px-3 text-xs font-bold text-warn">
          <span aria-hidden className="size-2 rounded-full bg-warn" />
          Aguardando pagamento
        </p>
        <div className="flex flex-col gap-0.5">
          <p className="text-[13px] text-text-3">Plano Catálogo</p>
          <p
            className="text-[30px] leading-tight font-extrabold tracking-[-0.02em]"
            data-testid="pix-amount"
          >
            {amount}
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- QR gerado no servidor (data:) */}
        <img
          src={qr}
          alt={`QR code do Pix de ${amount}`}
          width={200}
          height={200}
          className="rounded-[14px] border border-line p-3"
        />
        <div className="flex w-full flex-col gap-3 text-left">
          <CopyLine label="Chave Pix" value={view.key} />
          <CopyLine label="Pix copia e cola" value={view.brCode} />
          <p className="text-[13px] text-text-2">
            Favorecido: <strong className="text-ink">{view.beneficiary}</strong>
          </p>
        </div>
      </section>

      <section className="-mx-4 flex flex-col gap-3.5 bg-surface px-4 py-5 lg:mx-0 lg:rounded-card lg:border lg:border-line">
        <h2 className="text-base font-extrabold">Como pagar</h2>
        <ol className="flex flex-col gap-3">
          {STEPS(amount).map((t, i) => (
            <li key={t} className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex size-[26px] flex-none items-center justify-center rounded-lg bg-caju-soft text-[13px] font-extrabold text-caju-ink"
              >
                {i + 1}
              </span>
              <span className="pt-0.5 text-sm text-ink-2">{t}</span>
            </li>
          ))}
        </ol>
        <p className="border-t border-line-2 pt-2 text-xs text-text-3">
          Conferimos o comprovante em até {view.reviewBusinessDays}{" "}
          {view.reviewBusinessDays === 1 ? "dia útil" : "dias úteis"}.
        </p>
      </section>

      <ReceiptForm suggestedAmount={centsToReais(view.amountCents)} />
    </>
  );
}
