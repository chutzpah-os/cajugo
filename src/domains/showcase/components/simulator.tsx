"use client";

import { useState, type ReactNode } from "react";
import { simulateInstallment } from "@/platform/br/installment";
import { brl, brlWhole } from "@/platform/br/money";
import {
  WhatsappButton,
  type LeadVehicle,
} from "@/domains/leads/components/whatsapp-button";
import { whatsappLink } from "@/platform/whatsapp/link";
import { cn } from "@/ui/cn";
import { ChevronLeftIcon } from "@/ui/icons";
import { closeDialog, dialogCommand, openDialog } from "@/ui/dialog";
import {
  percentLabel,
  simulationMessage,
  simulatorOptions,
  type SimulatorSetup,
} from "../simulator";

const SIMULATOR_ID = "simulador";

const command = (action: "show-modal" | "close") =>
  dialogCommand(SIMULATOR_ID, action);

/** "Simular" e "Ver parcelas" abrem o mesmo simulador [14b] (BUY-FR-001). */
export function SimulatorTrigger({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-controls={SIMULATOR_ID}
      {...command("show-modal")}
      onClick={() => openDialog(SIMULATOR_ID)}
      className={className}
    >
      {children}
    </button>
  );
}

/** Botões iguais de Entrada e Prazo [14b]: 4 por linha, o escolhido em `ink`. */
function Options<T extends number>({
  label,
  values,
  value,
  onChange,
  text,
  right,
}: {
  label: string;
  values: T[];
  value: T;
  onChange: (v: T) => void;
  text: (v: T) => string;
  right?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="mb-2.5 flex w-full items-baseline justify-between text-base font-extrabold">
        {label}
        {right && <span className="text-[15px] font-extrabold">{right}</span>}
      </legend>
      <div role="group" aria-label={label} className="grid grid-cols-4 gap-2">
        {values.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={v === value}
            onClick={() => onChange(v)}
            className={cn(
              "flex h-11 items-center justify-center rounded-input border text-sm font-bold",
              v === value
                ? "border-ink bg-ink text-white"
                : "border-field bg-surface text-ink",
            )}
          >
            {text(v)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Simulador [14b] (BUY-FR-002, BUY-FR-003), como na captura: tela cheia no celular
 * com "← Simular parcelas", o veículo, o card escuro com a parcela, Entrada e Prazo,
 * taxa e total, e "Enviar simulação à loja no WhatsApp" fixo no rodapé. Calcula no
 * aparelho, pela mesma conta da parcela do card (BUY-NFR-003).
 */
export function SimulatorSheet({
  setup,
  lead,
  cover,
  storeName,
}: {
  setup: SimulatorSetup;
  /** O toque em "Enviar simulação à loja" também vira lead (LED-FR-003). */
  lead: LeadVehicle;
  cover?: string | null;
  storeName?: string;
}) {
  const options = simulatorOptions(setup);
  const [downBps, setDown] = useState(setup.downBps);
  const [months, setMonths] = useState(setup.months);
  const choice = { downBps, months };
  const sim = simulateInstallment({ ...setup, ...choice });
  const close = () => closeDialog(SIMULATOR_ID);

  return (
    <dialog
      id={SIMULATOR_ID}
      aria-labelledby="simulator-title"
      onClick={(e) => e.target === e.currentTarget && close()}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-bg p-0 backdrop:bg-[rgba(28,27,32,.55)] open:flex open:flex-col md:m-auto md:h-auto md:max-h-[92dvh] md:max-w-md md:rounded-sheet"
    >
      <header className="flex items-center gap-1 border-b border-line bg-surface px-2 py-2">
        <button
          type="button"
          {...command("close")}
          onClick={close}
          aria-label="Voltar"
          className="flex size-11 items-center justify-center"
        >
          <ChevronLeftIcon size={20} />
        </button>
        <h2 id="simulator-title" className="text-[17px] font-extrabold">
          Simular parcelas
        </h2>
      </header>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        <div className="flex items-center gap-3 bg-surface px-4 py-3.5">
          <div className="h-[50px] w-[64px] flex-none overflow-hidden rounded-lg bg-line-2">
            {cover && (
              // eslint-disable-next-line @next/next/no-img-element -- URL do Cloudinary já otimizada
              <img src={cover} alt="" className="size-full object-cover" />
            )}
          </div>
          <div className="flex min-w-0 flex-col">
            <p className="truncate text-[15px] font-extrabold uppercase">
              {setup.title}
            </p>
            {storeName && (
              <p className="truncate text-xs text-text-3">{storeName}</p>
            )}
            <p className="text-[15px] font-extrabold">
              {brlWhole(setup.priceCents)}
            </p>
          </div>
        </div>

        <div className="px-4">
          <dl
            data-testid="simulation"
            aria-live="polite"
            className="flex flex-col gap-1 rounded-card bg-ink p-4 text-white"
          >
            <dt className="text-xs text-on-dark-2">{months}x de</dt>
            <dd className="text-[34px] leading-tight font-extrabold tracking-[-0.02em]">
              {brl(sim.installmentCents)}
            </dd>
            <dd className="text-xs text-on-dark-2">
              Entrada de {brl(sim.downCents)} · financiado{" "}
              {brl(sim.financedCents)}
            </dd>
          </dl>
        </div>

        <div className="flex flex-col gap-4 bg-surface px-4 py-4">
          <Options
            label="Entrada"
            values={options.downs}
            value={downBps}
            onChange={setDown}
            text={percentLabel}
            right={brl(sim.downCents)}
          />
          <Options
            label="Prazo"
            values={options.months}
            value={months}
            onChange={setMonths}
            text={(m) => `${m}x`}
          />
          <dl className="flex flex-col gap-1.5 border-t border-line-2 pt-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-text-2">Taxa estimada</dt>
              <dd>{percentLabel(setup.rateBps)} ao mês</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-2">Total a prazo</dt>
              <dd className="font-extrabold">{brl(sim.totalCents)}</dd>
            </div>
          </dl>
          <p className="text-xs leading-snug text-text-3">
            Estimativa sem análise de crédito. Taxa, entrada e prazo finais são
            definidos pela loja e pelo banco.
          </p>
        </div>
      </div>

      <footer className="border-t border-line bg-surface px-4 pt-3 pb-[max(env(safe-area-inset-bottom),20px)]">
        <WhatsappButton
          href={whatsappLink(
            setup.whatsappNumber,
            simulationMessage(setup, choice, sim),
          )}
          lead={lead}
          data-testid="send-simulation"
          className="flex h-[50px] items-center justify-center rounded-button bg-caju text-[15px] font-bold text-white"
        >
          Enviar simulação à loja no WhatsApp
        </WhatsappButton>
      </footer>
    </dialog>
  );
}
