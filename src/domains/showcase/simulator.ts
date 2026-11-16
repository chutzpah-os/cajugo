import { brl } from "@/platform/br/money";
import type { Simulation } from "@/platform/br/installment";

/** O que a página do veículo entrega ao simulador [14b] (BUY-FR-001). */
export type SimulatorSetup = {
  priceCents: number;
  /** Regras [4c] vigentes: o simulador abre com elas marcadas. */
  downBps: number;
  months: number;
  rateBps: number;
  /** Contato do anúncio, para "Enviar simulação à loja" (BUY-FR-003). */
  whatsappNumber: string;
  title: string;
  url: string;
};

export type SimulatorChoice = { downBps: number; months: number };

const DOWNS = [0, 2000, 3000, 5000];
const MONTHS = [24, 36, 48, 60];

const withRule = (list: number[], rule: number) =>
  [...new Set([...list, rule])].sort((a, b) => a - b);

/** 0/20/30/50% e 24/36/48/60x, mais o valor das regras quando está fora da lista (D2). */
export function simulatorOptions(setup: SimulatorSetup) {
  return {
    downs: withRule(DOWNS, setup.downBps),
    months: withRule(MONTHS, setup.months),
  };
}

/** 3000 → "30%"; 1750 → "17,5%". */
export function percentLabel(bps: number): string {
  return `${(bps / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

/** Mensagem pronta para a loja (BUY-FR-003). */
export function simulationMessage(
  setup: SimulatorSetup,
  choice: SimulatorChoice,
  sim: Simulation,
): string {
  const down = choice.downBps
    ? `entrada de ${percentLabel(choice.downBps)} (${brl(sim.downCents)}) e`
    : "sem entrada e";
  return `Olá! Simulei na CajuGo o ${setup.title} (${setup.url}): ${down} ${choice.months}x de ${brl(sim.installmentCents)}. É uma estimativa; pode me passar as condições de financiamento?`;
}
