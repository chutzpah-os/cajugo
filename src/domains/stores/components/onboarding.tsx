import Link from "next/link";
import type { OnboardingStatus } from "../service";

/** Banner e primeiros passos [5e] (PIX-FR-012); somem com os 3 passos completos. */
export function Onboarding({ status }: { status: OnboardingStatus }) {
  if (!status.show) return null;
  const steps = [
    { done: status.steps.subscription, label: "Assinatura ativa", href: null },
    {
      done: status.steps.firstVehicle,
      label: "Cadastre seu primeiro veículo",
      href: "/painel/veiculos/novo",
    },
    {
      done: status.steps.storeComplete,
      label: "Complete sua loja (logo, capa, sobre e horário)",
      href: "/painel/loja",
    },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div
        role="status"
        className="flex flex-col gap-1 rounded-card bg-ok-soft p-4 text-ok"
      >
        <p className="font-bold">Assinatura ativa. Sua loja está no ar.</p>
        <a
          href={status.catalogUrl}
          target="_blank"
          rel="noopener"
          className="flex min-h-11 items-center text-sm font-bold break-all underline underline-offset-2"
        >
          {status.catalogUrl}
        </a>
      </div>
      <section className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
        <h2 className="text-[17px] font-extrabold">
          Primeiros passos{" "}
          <span className="text-sm font-semibold text-text-3">
            ({status.done} de 3)
          </span>
        </h2>
        <ul className="flex flex-col">
          {steps.map((step) => (
            <li
              key={step.label}
              className="flex min-h-11 items-center gap-3 text-sm"
            >
              <span
                aria-hidden
                className={
                  step.done
                    ? "flex size-6 items-center justify-center rounded-full bg-ok text-white"
                    : "size-6 rounded-full border-2 border-field"
                }
              >
                {step.done ? "✓" : ""}
              </span>
              <span className="sr-only">
                {step.done ? "Feito: " : "Falta: "}
              </span>
              {step.href && !step.done ? (
                <Link
                  href={step.href}
                  className="flex min-h-11 items-center font-semibold text-caju-ink"
                >
                  {step.label}
                </Link>
              ) : (
                <span className={step.done ? "text-text-3 line-through" : ""}>
                  {step.label}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
