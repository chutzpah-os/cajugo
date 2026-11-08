"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { reaisToCents } from "@/platform/br/money";
import { Button } from "@/ui/button";
import { TextField } from "@/ui/text-field";
import { findStoresAction, manualPaymentAction } from "../actions";
import type { StoreHit } from "../service";
import { DoneBanner, type Done } from "./review-queue";

const METHODS = [
  ["cash", "Dinheiro"],
  ["transfer", "Transferência"],
  ["pix", "Pix (sem comprovante)"],
  ["other", "Outra forma"],
] as const;

/** "Registrar pagamento sem comprovante" [10b] (PIX-FR-011): exceção, só admin. */
export function ManualPayment() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<StoreHit[]>([]);
  const [store, setStore] = useState<StoreHit | null>(null);
  const [method, setMethod] = useState<string>("cash");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();
  const [done, setDone] = useState<Done | null>(null);

  useEffect(() => {
    let alive = true;
    const q = query.trim();
    if (q.length < 2 || store) return;
    const id = setTimeout(() => {
      findStoresAction(q).then((list) => alive && setHits(list));
    }, 300);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [query, store]);

  const submit = async () => {
    if (!store) return;
    setBusy(true);
    setErrors({});
    setMessage(undefined);
    const result = await manualPaymentAction({
      storeId: store.storeId,
      method,
      amountCents: reaisToCents(amount),
      note,
    });
    setBusy(false);
    if (!result.ok) {
      setErrors(result.errors);
      setMessage(result.message);
      return;
    }
    setDone({
      storeName: store.name,
      text: `Pagamento de ${store.name} registrado. A loja está no ar.`,
      whatsappUrl: result.whatsappUrl,
    });
    setOpen(false);
    setStore(null);
    setQuery("");
    setAmount("");
    setNote("");
    router.refresh();
  };

  return (
    <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
      <DoneBanner done={done} />
      {!open ? (
        <Button
          variant="ghost"
          onClick={() => setOpen(true)}
          className="self-start"
        >
          Registrar pagamento sem comprovante
        </Button>
      ) : (
        <div className="flex flex-col gap-3">
          <h2 className="text-[17px] font-extrabold">
            Pagamento sem comprovante
          </h2>
          <p className="text-sm text-text-2">
            Só em exceção (ex.: pago em dinheiro). Fica no histórico com o seu
            nome.
          </p>
          {store ? (
            <div className="flex items-center justify-between gap-2 rounded-input bg-bg p-3 text-sm">
              <span>
                <strong>{store.name}</strong> · {store.slug}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-11"
                onClick={() => setStore(null)}
              >
                Trocar
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <TextField
                id="manual-store"
                label="Loja (nome ou endereço)"
                autoComplete="off"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHits([]);
                }}
              />
              {hits.length > 0 && (
                <ul className="flex flex-col rounded-input border border-line">
                  {hits.map((h) => (
                    <li key={h.storeId}>
                      <button
                        type="button"
                        disabled={h.pendingReceipt}
                        onClick={() => setStore(h)}
                        className="flex min-h-11 w-full flex-col items-start px-3 py-2 text-left text-sm disabled:opacity-60"
                      >
                        <span className="font-bold">{h.name}</span>
                        <span className="text-text-3">
                          {h.slug}
                          {h.pendingReceipt
                            ? " · comprovante em análise: confira acima"
                            : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="manual-method"
              className="text-[13px] font-semibold"
            >
              Forma de pagamento
            </label>
            <select
              id="manual-method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="h-[50px] rounded-input border border-field bg-surface px-3 text-[15px]"
            >
              {METHODS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <TextField
            id="manual-amount"
            label="Valor recebido"
            prefix="R$"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={errors.amountCents}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="manual-note" className="text-[13px] font-semibold">
              Observação
            </label>
            <textarea
              id="manual-note"
              rows={2}
              maxLength={300}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-input border border-field bg-surface p-3 text-[15px]"
            />
            {errors.note && (
              <p className="text-xs text-caju-deep">{errors.note}</p>
            )}
          </div>
          {message && (
            <p role="alert" className="text-sm text-caju-deep">
              {message}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button disabled={busy || !store} onClick={submit}>
              {busy ? "Registrando…" : "Registrar"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
