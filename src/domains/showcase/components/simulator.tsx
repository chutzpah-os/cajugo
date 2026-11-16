"use client";

import { useState, type ReactNode } from "react";
import { simulateInstallment } from "@/platform/br/installment";
import { brl } from "@/platform/br/money";
import {
  WhatsappButton,
  type LeadVehicle,
} from "@/domains/leads/components/whatsapp-button";
import { whatsappLink } from "@/platform/whatsapp/link";
import { Chip } from "@/ui/chip";
import {
  percentLabel,
  simulationMessage,
  simulatorOptions,
  type SimulatorSetup,
} from "../simulator";

const SIMULATOR_ID = "simulador";

const dialog = () =>
  document.getElementById(SIMULATOR_ID) as HTMLDialogElement | null;

/** Navegador sem Invoker Commands: abre pelo JavaScript; com eles, já abriu. */
function open() {
  const d = dialog();
  if (d && !d.open) d.showModal();
}

/**
 * Invoker Commands do HTML (`commandfor`/`command`): o botão abre e fecha o diálogo
 * antes de o JavaScript carregar, como num 4G lento. O React ainda não tipa os atributos.
 */
const command = (action: "show-modal" | "close") =>
  ({ commandfor: SIMULATOR_ID, command: action }) as Record<string, string>;

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
      onClick={open}
      className={className}
    >
      {children}
    </button>
  );
}

function Row({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-sm text-text-2">{label}</dt>
      <dd className={strong ? "text-[22px] font-extrabold" : "font-bold"}>
        {value}
      </dd>
    </div>
  );
}

/**
 * Simulador [14b] (BUY-FR-002, BUY-FR-003): calcula no aparelho, pela mesma conta da
 * parcela do card (BUY-NFR-003). Folha de baixo no celular; centralizado no desktop.
 */
export function SimulatorSheet({
  setup,
  lead,
}: {
  setup: SimulatorSetup;
  /** O toque em "Enviar simulação à loja" também vira lead (LED-FR-003). */
  lead: LeadVehicle;
}) {
  const options = simulatorOptions(setup);
  const [downBps, setDown] = useState(setup.downBps);
  const [months, setMonths] = useState(setup.months);
  const choice = { downBps, months };
  const sim = simulateInstallment({ ...setup, ...choice });
  const close = () => dialog()?.close();

  return (
    <dialog
      id={SIMULATOR_ID}
      aria-labelledby="simulator-title"
      onClick={(e) => e.target === e.currentTarget && close()}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-[20px] bg-surface p-5 backdrop:bg-[rgba(28,27,32,.55)] md:m-auto md:max-w-md md:rounded-card"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 id="simulator-title" className="text-[19px] font-extrabold">
            Simular parcelas
          </h2>
          <button
            type="button"
            {...command("close")}
            onClick={close}
            className="flex h-11 items-center px-2 text-sm font-semibold text-text-2"
          >
            Fechar
          </button>
        </div>
        <p className="text-sm text-text-2">
          {setup.title} · {brl(setup.priceCents)}
        </p>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-bold">Entrada</legend>
          <div
            role="group"
            aria-label="Entrada"
            className="flex flex-wrap gap-2"
          >
            {options.downs.map((d) => (
              <Chip key={d} active={d === downBps} onClick={() => setDown(d)}>
                {percentLabel(d)}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-bold">Prazo</legend>
          <div role="group" aria-label="Prazo" className="flex flex-wrap gap-2">
            {options.months.map((m) => (
              <Chip key={m} active={m === months} onClick={() => setMonths(m)}>
                {m}x
              </Chip>
            ))}
          </div>
        </fieldset>
        <dl
          data-testid="simulation"
          aria-live="polite"
          className="flex flex-col gap-2 rounded-card border border-line p-3"
        >
          <Row
            label={`Parcela (${months}x)`}
            value={brl(sim.installmentCents)}
            strong
          />
          <Row label="Entrada" value={brl(sim.downCents)} />
          <Row label="Valor financiado" value={brl(sim.financedCents)} />
          <Row label="Total pago" value={brl(sim.totalCents)} />
        </dl>
        <p className="text-xs text-text-3">
          Estimativa sem análise de crédito, com taxa de{" "}
          {percentLabel(setup.rateBps)} ao mês. As condições reais dependem da
          loja e do banco.
        </p>
        <WhatsappButton
          href={whatsappLink(
            setup.whatsappNumber,
            simulationMessage(setup, choice, sim),
          )}
          lead={lead}
          data-testid="send-simulation"
          className="flex h-[50px] items-center justify-center rounded-button bg-whatsapp text-[15px] font-bold text-white"
        >
          Enviar simulação à loja
        </WhatsappButton>
      </div>
    </dialog>
  );
}
