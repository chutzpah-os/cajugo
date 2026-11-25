import type { ReactNode } from "react";
import { CheckIcon } from "./icons";

/**
 * Telas de entrar e de cadastro (login, lojista, Caju Indica, Rede Caju): no desktop,
 * o painel com o que a pessoa ganha à esquerda, fixo enquanto o formulário rola (no
 * cadastro longo ele não some nem deixa um vazio), e o formulário num card à direita; no
 * celular, o formulário primeiro e o painel embaixo, resumido.
 */
export function AuthLayout({
  title,
  subtitle,
  progress,
  panel,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  /** Passo do cadastro: "1 de 2 · depois, …" e quantos passos. */
  progress?: { label: string; step: number; total: number };
  panel: { eyebrow: string; title: string; perks: readonly string[] };
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
      <aside
        aria-label={panel.eyebrow}
        className="relative flex flex-col gap-5 overflow-hidden rounded-card bg-[radial-gradient(120%_120%_at_90%_10%,#e8551e_0%,#b23c12_35%,#1c1b20_75%)] p-6 text-white lg:sticky lg:top-6 lg:order-1 lg:h-[min(620px,calc(100dvh-3rem))] lg:p-10"
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
          className="mt-auto hidden max-h-[220px] min-h-0 w-auto shrink self-end object-contain drop-shadow-2xl lg:block"
        />
      </aside>
    </main>
  );
}
