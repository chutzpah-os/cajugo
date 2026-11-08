"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { AvailabilityHint, type Availability } from "@/ui/availability-hint";
import { Button } from "@/ui/button";
import { TextField } from "@/ui/text-field";
import {
  changeSlugAction,
  checkSlugAction,
  type StoreFormState,
} from "../actions";

/**
 * Troca do endereço do catálogo (STO-FR-013): checagem ao vivo, aviso e confirmação.
 * Bloqueada (com a data) se houve troca nos últimos 30 dias.
 */
export function SlugChangeForm({
  current,
  appHost,
  nextAllowed,
}: {
  current: string;
  appHost: string;
  /** dd/mm/aaaa da próxima troca permitida, se ainda não pode. */
  nextAllowed: string | null;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<StoreFormState, FormData>(
    changeSlugAction,
    null,
  );
  const [slug, setSlug] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [status, setStatus] = useState<Availability>("idle");

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  useEffect(() => {
    let alive = true;
    if (!slug || slug === current) return;
    const id = setTimeout(() => {
      checkSlugAction(slug).then((r) => {
        if (alive) setStatus(r ? r.status : "idle");
      });
    }, 400);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [slug, current]);

  return (
    <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
      <h2 className="text-[17px] font-extrabold">Endereço do catálogo</h2>
      <p className="text-sm text-text-2">
        Atual:{" "}
        <strong className="font-mono text-ink">
          {appHost}/loja/{current}
        </strong>
      </p>
      {nextAllowed ? (
        <p className="text-sm text-text-2">
          Você poderá trocar de novo a partir de {nextAllowed}.
        </p>
      ) : (
        <form action={action} className="flex flex-col gap-3" noValidate>
          <div className="flex flex-col gap-1">
            <TextField
              id="new-slug"
              name="slug"
              label="Novo endereço"
              prefix={`${appHost}/loja/`}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={40}
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              aria-describedby="new-slug-status"
              error={state?.errors.slug}
            />
            <AvailabilityHint
              id="new-slug-status"
              status={slug && slug !== current ? status : "idle"}
            />
          </div>
          <label className="flex min-h-11 items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="confirm"
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
              className="mt-1 size-5 accent-caju"
            />
            <span>
              Entendi: o link e o QR code antigos levam ao novo endereço por 90
              dias, e só poderei trocar de novo daqui a 30 dias.
            </span>
          </label>
          {state?.errors.confirm && (
            <p className="text-xs text-caju-deep">{state.errors.confirm}</p>
          )}
          {state?.message && (
            <p
              role={state.ok ? "status" : "alert"}
              className={
                state.ok ? "text-sm text-ok" : "text-sm text-caju-deep"
              }
            >
              {state.message}
            </p>
          )}
          <Button
            type="submit"
            variant="outline"
            disabled={pending || !slug}
            className="self-start"
          >
            {pending ? "Alterando…" : "Alterar endereço"}
          </Button>
        </form>
      )}
    </section>
  );
}
