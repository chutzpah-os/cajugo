"use client";

import { useId, useRef } from "react";
import { LogOutIcon, XIcon } from "@/ui/icons";
import { initialsOf } from "@/ui/initials";
import { cn } from "@/ui/cn";
import { signOutAction, switchPanelAction } from "../actions";

export type AccountMenuProps = {
  fullName: string;
  /** Painéis da conta (papel → rótulo), para "Trocar de painel". */
  panels: { role: string; label: string }[];
  activeRole: string;
};

/**
 * Avatar com a sigla no canto do cabeçalho (DESIGN.md §3, D1 da 012): abre a folha com
 * o nome, **Trocar de painel** e **Sair**. No desktop fica no pé da sidebar.
 */
export function AccountMenu({
  fullName,
  panels,
  activeRole,
  variant,
}: AccountMenuProps & { variant: "avatar-dark" | "avatar-light" | "sidebar" }) {
  const ref = useRef<HTMLDialogElement>(null);
  const panelId = useId();
  const close = () => ref.current?.close();
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`Conta de ${fullName}`}
        data-testid="account-menu"
        onClick={() => ref.current?.showModal()}
        className={cn(
          variant === "sidebar"
            ? "flex min-h-11 w-full items-center gap-2.5 rounded-input px-3 text-left text-sm font-semibold text-on-dark-2 hover:bg-ink-2"
            : cn(
                "flex size-11 items-center justify-center rounded-full text-sm font-bold",
                variant === "avatar-dark"
                  ? "bg-ink-3 text-white"
                  : "bg-bg text-ink",
              ),
        )}
      >
        {variant === "sidebar" ? (
          <>
            <span
              aria-hidden
              className="flex size-8 flex-none items-center justify-center rounded-full bg-ink-3 text-xs font-bold text-white"
            >
              {initialsOf(fullName)}
            </span>
            <span className="truncate">{fullName}</span>
          </>
        ) : (
          <span aria-hidden>{initialsOf(fullName)}</span>
        )}
      </button>
      <dialog
        ref={ref}
        aria-label="Conta"
        onClick={(e) => e.target === e.currentTarget && close()}
        className="m-0 mt-auto w-full max-w-none rounded-t-sheet bg-surface px-5 pt-2 pb-8 backdrop:bg-[rgba(28,27,32,.55)] md:m-auto md:max-w-sm md:rounded-sheet md:pt-5"
      >
        <div className="flex flex-col gap-4">
          <div aria-hidden className="flex justify-center md:hidden">
            <span className="h-1 w-10 rounded-full bg-field" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-lg font-extrabold">{fullName}</p>
            <button
              type="button"
              onClick={close}
              aria-label="Fechar"
              className="flex size-11 items-center justify-center text-text-2"
            >
              <XIcon />
            </button>
          </div>
          {panels.length > 1 && (
            <form action={switchPanelAction} className="flex items-end gap-2">
              <div className="flex flex-1 flex-col gap-1.5">
                <label htmlFor={panelId} className="text-[13px] font-semibold">
                  Trocar de painel
                </label>
                <select
                  id={panelId}
                  name="role"
                  defaultValue={activeRole}
                  className="h-[50px] rounded-input border border-field bg-surface px-3 text-[15px]"
                >
                  {panels.map((p) => (
                    <option key={p.role} value={p.role}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="h-[50px] rounded-button bg-ink px-5 text-[15px] font-bold text-white"
              >
                Ir
              </button>
            </form>
          )}
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex h-[50px] w-full items-center justify-center gap-2 rounded-button border-[1.5px] border-field text-[15px] font-bold"
            >
              <LogOutIcon size={18} />
              Sair
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
