import type { ReactNode } from "react";
import { CheckIcon } from "./icons";

/**
 * Telas de entrar e de cadastro (login, lojista, Caju Indica, Rede Caju): no desktop,
 * o painel com o que a pessoa ganha à esquerda e, abaixo dele, "Como funciona" e as
 * perguntas frequentes (o lado esquerdo cresce com conteúdo útil enquanto o formulário
 * é longo, sem congelar nada); o formulário num card à direita; no
 * celular, o formulário primeiro e o painel embaixo, resumido.
 */
export function AuthLayout({
  title,
  subtitle,
  progress,
  panel,
  steps,
  faq,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  /** Passo do cadastro: "1 de 2 · depois, …" e quantos passos. */
  progress?: { label: string; step: number; total: number };
  panel: { eyebrow: string; title: string; perks: readonly string[] };
  /** Os passos, em ordem (cadastros). */
  steps?: readonly string[];
  /** Perguntas frequentes curtas, só com o que a CajuGo já definiu. */
  faq?: readonly { q: string; a: string }[];
  children: ReactNode;
}) {
  return (
    <main className="mx-auto grid w-full max-w-[480px] flex-1 gap-6 px-4 pt-6 pb-10 md:max-w-xl lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] lg:items-start lg:gap-10 lg:px-6 lg:py-12">
      <section className="flex flex-col gap-5 lg:order-2 lg:rounded-card lg:border lg:border-line lg:bg-surface lg:p-8 lg:shadow-sm">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.02em] lg:text-[30px]">
            {title}
          </h1>
          {subtitle && <p className="text-[15px] text-text-2">{subtitle}</p>}
          {progress && (
            <div className="mt-2 flex flex-col gap-2">
              <p className="text-sm text-text-3">{progress.label}</p>
              <div
                aria-hidden
                className="grid gap-1"
                style={{
                  gridTemplateColumns: `repeat(${progress.total}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: progress.total }, (_, i) => (
                  <span
                    key={i}
                    className={`h-1 rounded-full ${i < progress.step ? "bg-caju" : "bg-line"}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        {children}
      </section>
      <div className="flex flex-col gap-4 lg:order-1">
        <aside
          aria-label={panel.eyebrow}
          className="relative flex flex-col gap-5 overflow-hidden rounded-card bg-[radial-gradient(120%_120%_at_90%_10%,#e8551e_0%,#b23c12_35%,#1c1b20_75%)] p-6 text-white lg:p-10"
        >
          <p className="text-xs font-extrabold tracking-[0.12em] text-castanha uppercase">
            {panel.eyebrow}
          </p>
          <p className="max-w-md text-[24px] leading-[1.15] font-extrabold tracking-[-0.01em] lg:text-[36px]">
            {panel.title}
          </p>
          <ul className="flex flex-col gap-3">
            {panel.perks.map((p) => (
              <li
                key={p}
                className="flex items-start gap-3 text-[15px] text-white/90"
              >
                <span className="mt-0.5 flex size-5 flex-none items-center justify-center rounded-full bg-white/15">
                  <CheckIcon size={13} />
                </span>
                {p}
              </li>
            ))}
          </ul>
          {/* eslint-disable-next-line @next/next/no-img-element -- ilustração estática (WebP), só no desktop */}
          <img
            src="/tipos/hero.webp"
            alt=""
            width={360}
            height={252}
            className="hidden h-[200px] w-auto self-end object-contain drop-shadow-2xl lg:block"
          />
        </aside>
        {steps && (
          <section
            aria-labelledby="como-funciona"
            className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6"
          >
            <h2 id="como-funciona" className="text-[17px] font-extrabold">
              Como funciona
            </h2>
            <ol className="grid gap-4 sm:grid-cols-3">
              {steps.map((step, i) => (
                <li key={step} className="flex flex-col gap-2">
                  <span className="flex size-8 items-center justify-center rounded-full bg-caju-soft text-sm font-extrabold text-caju-deep">
                    {i + 1}
                  </span>
                  <span className="text-sm text-text-2">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
        {faq && (
          <section
            aria-labelledby="perguntas"
            className="flex flex-col gap-1 rounded-card border border-line bg-surface p-6"
          >
            <h2 id="perguntas" className="mb-2 text-[17px] font-extrabold">
              Perguntas frequentes
            </h2>
            {faq.map((f) => (
              <details
                key={f.q}
                className="group border-b border-line-2 last:border-0"
              >
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-bold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span
                    aria-hidden
                    className="text-text-3 transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="pb-3 text-sm text-text-2">{f.a}</p>
              </details>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
