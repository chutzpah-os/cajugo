"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { brl, reaisToCents } from "@/platform/br/money";
import { Button } from "@/ui/button";
import { ConfirmSheet } from "@/ui/confirm-sheet";
import { MoneyField } from "@/ui/number-field";
import { SelectField } from "@/ui/select-field";
import { Toggle } from "@/ui/toggle";
import { confirmSaleAction, saleTermsAction, undoSaleAction } from "../actions";
import type { SaleTerms } from "../service";

type Who = "link" | "other_partner" | "store";

/**
 * **Confirmar venda** [7g] (RCL-FR-008..012): valor final, quem vendeu (o sugerido pelo
 * link, outro parceiro ou a loja), comissão e taxa calculadas no servidor a cada mudança
 * e "Já paguei a comissão". Abre direto com `?vender=1` (vindo de [1c]).
 */
export function ConfirmSaleButton({
  vehicleId,
  initial,
  defaultOpen = false,
}: {
  vehicleId: string;
  initial: SaleTerms;
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [price, setPrice] = useState("");
  const [who, setWho] = useState<Who>(initial.suggested ? "link" : "store");
  const [other, setOther] = useState("");
  const [paid, setPaid] = useState(false);
  const [terms, setTerms] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const cents = reaisToCents(price);
  const sellerId =
    who === "link"
      ? (initial.suggested?.sellerId ?? null)
      : who === "other_partner"
        ? other || null
        : null;

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(async () => {
      const t = await saleTermsAction({
        vehicleId,
        finalPriceCents: Number.isFinite(cents) && cents > 0 ? cents : null,
        sellerId,
      });
      if (t) setTerms(t);
    }, 300);
    return () => clearTimeout(id);
  }, [open, vehicleId, cents, sellerId]);

  const options: [Who, string][] = [
    ...(initial.suggested
      ? [["link", `${initial.suggested.name} (pelo link)`] as [Who, string]]
      : []),
    ...(initial.partners.length
      ? [["other_partner", "Outro parceiro"] as [Who, string]]
      : []),
    ["store", "Venda da loja"],
  ];

  return (
    <>
      <Button variant="dark" block onClick={() => setOpen(true)}>
        Marcar como vendido
      </Button>
      <ConfirmSheet
        open={open}
        title="Confirmar venda"
        confirmLabel="Confirmar venda"
        busy={busy}
        onClose={() => setOpen(false)}
        onConfirm={async () => {
          setBusy(true);
          const r = await confirmSaleAction({
            vehicleId,
            finalPriceCents: Number.isFinite(cents) ? cents : undefined,
            attribution: who,
            sellerId,
            commissionPaid: who !== "store" && paid,
          });
          setBusy(false);
          if (r.ok) {
            setOpen(false);
            return router.refresh();
          }
          setErrors(r.errors);
          setMessage(Object.keys(r.errors).length ? null : (r.message ?? null));
        }}
        extra={
          <div className="flex flex-col gap-3">
            <MoneyField
              id="sale-price"
              label="Valor final"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              error={errors.finalPriceCents}
            />
            <fieldset className="flex flex-col gap-1">
              <legend className="mb-2 text-sm font-bold">Quem vendeu</legend>
              {options.map(([value, label]) => (
                <label
                  key={value}
                  className="flex min-h-11 items-center gap-3 rounded-input border border-line px-3"
                >
                  <input
                    type="radio"
                    name="sale-who"
                    value={value}
                    checked={who === value}
                    onChange={() => setWho(value)}
                    className="size-5 accent-ink"
                  />
                  <span className="text-[15px]">{label}</span>
                </label>
              ))}
            </fieldset>
            {who === "other_partner" && (
              <SelectField
                id="sale-partner"
                label="Parceiro"
                placeholder="Escolha o parceiro"
                options={initial.partners.map(
                  (p) => [p.sellerId, p.name] as const,
                )}
                value={other}
                onChange={(e) => setOther(e.target.value)}
                error={errors.sellerId}
              />
            )}
            {who !== "store" && (
              <>
                <div
                  data-testid="sale-terms"
                  className="flex flex-col gap-1 rounded-input bg-neutral-soft p-3 text-sm"
                >
                  <span>
                    Comissão do vendedor:{" "}
                    {terms.commissionCents !== null
                      ? brl(terms.commissionCents)
                      : "—"}
                  </span>
                  <span>
                    Taxa CajuGo ({(terms.feeBps / 100).toLocaleString("pt-BR")}
                    %): {terms.feeCents !== null ? brl(terms.feeCents) : "—"}
                  </span>
                </div>
                <Toggle
                  title="Já paguei a comissão"
                  checked={paid}
                  onChange={(e) => setPaid(e.target.checked)}
                />
              </>
            )}
            {message && (
              <p role="alert" className="text-sm text-caju-deep">
                {message}
              </p>
            )}
          </div>
        }
      >
        Sai do seu catálogo, da vitrine CajuGo e dos links de vendedor na hora.
      </ConfirmSheet>
    </>
  );
}

/** **Desfazer venda** da Rede Caju (RCL-FR-015): comissão paga não desfaz. */
export function UndoSaleButton({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="dark"
        block
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await undoSaleAction({ vehicleId });
          setBusy(false);
          if (r.ok) return router.refresh();
          setMessage(r.message);
        }}
      >
        {busy ? "Aguarde…" : "Desfazer venda"}
      </Button>
      {message && (
        <p role="alert" className="text-sm text-caju-deep">
          {message}
        </p>
      )}
    </div>
  );
}
