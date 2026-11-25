import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "./button";
import { CheckIcon } from "./icons";

export type ProgramLandingContent = {
  eyebrow: string;
  title: string;
  lead: string;
  /** `newTab`: a chamada sai do site (ex.: WhatsApp do atendimento). */
  primary: { label: string; href: string; newTab?: boolean };
  /** Quem já participa: entrar no painel. */
  signIn: { label: string; href: string };
  /** Números em destaque logo abaixo da abertura. */
  highlights: readonly { value: string; label: string }[];
  /** Para quem é. */
  audience: readonly { title: string; text: string }[];
  steps: readonly { title: string; text: string }[];
  benefits: readonly { title: string; text: string }[];
  faq: readonly { q: string; a: string }[];
  closing: { title: string; text: string };
};

const WHY = [
  {
    title: "Vitrine de várias lojas",
    text: "Carros, motos, picapes e outros veículos das lojas da região, num só lugar.",
  },
  {
    title: "Contato direto",
    text: "O comprador fala com a loja pelo WhatsApp, sem intermediário.",
  },
  {
    title: "Painel transparente",
    text: "Tudo o que você faz e ganha fica registrado no seu painel.",
  },
] as const;

/**
 * Página de vendas de um produto da CajuGo (Caju Indica, Rede Caju), no formato de
 * `/lojistas`: abertura com a chamada, como funciona, o que a pessoa ganha, perguntas
 * e a chamada final. Linkada em Descobrir (017).
 */
export function ProgramLanding({
  c,
  example,
}: {
  c: ProgramLandingContent;
  /** Bloco de exemplo calculado com as regras reais (ex.: ganhos do Caju Indica). */
  example?: ReactNode;
}) {
  // Chamada para fora (ex.: WhatsApp do atendimento) abre em outra aba.
  const external =
    c.primary.newTab || c.primary.href.startsWith("http")
      ? { target: "_blank", rel: "noopener noreferrer" }
      : {};
  return (
    <main className="w-full flex-1">
      <section className="bg-[radial-gradient(120%_140%_at_85%_10%,#e8551e_0%,#b23c12_38%,#1c1b20_78%)] text-white">
        <div className="mx-auto grid w-full max-w-[480px] gap-8 px-4 py-12 md:max-w-3xl lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center lg:px-6 lg:py-20">
          <div className="flex flex-col items-start gap-4">
            <p className="text-xs font-extrabold tracking-[0.12em] text-castanha uppercase">
              {c.eyebrow}
            </p>
            <h1 className="text-[32px] leading-[1.1] font-extrabold tracking-[-0.02em] lg:text-[46px]">
              {c.title}
            </h1>
            <p className="max-w-xl text-[16px] text-white/85 lg:text-[18px]">
              {c.lead}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <ButtonLink href={c.primary.href} {...external}>
                {c.primary.label}
              </ButtonLink>
              <Link
                href={c.signIn.href}
                className="flex h-11 items-center text-sm font-bold text-white underline underline-offset-4"
              >
                {c.signIn.label}
              </Link>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- ilustração estática (WebP) */}
          <img
            src="/tipos/hero.webp"
            alt=""
            width={360}
            height={252}
            className="hidden h-[252px] w-[360px] object-contain drop-shadow-2xl lg:block"
          />
        </div>
      </section>

      <div className="mx-auto w-full max-w-[480px] px-4 md:max-w-3xl lg:max-w-6xl lg:px-6">
        <dl className="-mt-8 grid grid-cols-2 gap-3 rounded-card border border-line bg-surface p-4 shadow-sm md:grid-cols-4 lg:p-6">
          {c.highlights.map((h) => (
            <div key={h.label} className="flex flex-col gap-0.5">
              <dt className="order-2 text-[13px] text-text-2">{h.label}</dt>
              <dd className="order-1 text-[22px] font-extrabold tracking-[-0.02em] text-caju-deep lg:text-[26px]">
                {h.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-14 px-4 py-12 md:max-w-3xl lg:max-w-6xl lg:px-6 lg:py-16">
        <section aria-labelledby="para-quem" className="flex flex-col gap-5">
          <h2 id="para-quem" className="text-[24px] font-extrabold">
            Para quem é
          </h2>
          <ul className="grid gap-4 md:grid-cols-3">
            {c.audience.map((a) => (
              <li
                key={a.title}
                className="flex flex-col gap-1 rounded-card bg-caju-tint p-5"
              >
                <h3 className="font-extrabold">{a.title}</h3>
                <p className="text-sm text-text-2">{a.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="como-funciona"
          className="flex flex-col gap-5"
        >
          <h2 id="como-funciona" className="text-[24px] font-extrabold">
            Como funciona
          </h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {c.steps.map((s, i) => (
              <li
                key={s.title}
                className="flex flex-col gap-2 rounded-card border border-line bg-surface p-5"
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-caju-soft font-extrabold text-caju-deep">
                  {i + 1}
                </span>
                <h3 className="text-[17px] font-extrabold">{s.title}</h3>
                <p className="text-sm text-text-2">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {example}

        <section aria-labelledby="vantagens" className="flex flex-col gap-5">
          <h2 id="vantagens" className="text-[24px] font-extrabold">
            O que você ganha
          </h2>
          <ul className="grid gap-4 md:grid-cols-2">
            {c.benefits.map((b) => (
              <li
                key={b.title}
                className="flex gap-3 rounded-card border border-line bg-surface p-5"
              >
                <span className="mt-0.5 flex size-6 flex-none items-center justify-center rounded-full bg-ok-soft text-ok">
                  <CheckIcon size={14} />
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="font-extrabold">{b.title}</h3>
                  <p className="text-sm text-text-2">{b.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="por-que" className="flex flex-col gap-5">
          <h2 id="por-que" className="text-[24px] font-extrabold">
            Por que a CajuGo
          </h2>
          <ul className="grid gap-4 md:grid-cols-3">
            {WHY.map((w) => (
              <li
                key={w.title}
                className="flex flex-col gap-1 border-l-4 border-caju pl-4"
              >
                <h3 className="font-extrabold">{w.title}</h3>
                <p className="text-sm text-text-2">{w.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="perguntas" className="flex flex-col gap-3">
          <h2 id="perguntas" className="text-[24px] font-extrabold">
            Perguntas frequentes
          </h2>
          <div className="rounded-card border border-line bg-surface px-5">
            {c.faq.map((f) => (
              <details
                key={f.q}
                className="group border-b border-line-2 last:border-0"
              >
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-bold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span
                    aria-hidden
                    className="text-lg text-text-3 transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="pb-4 text-sm text-text-2">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="flex flex-col items-start gap-3 rounded-card bg-ink p-6 text-white lg:flex-row lg:items-center lg:justify-between lg:p-8">
          <div className="flex flex-col gap-1">
            <h2 className="text-[22px] font-extrabold">{c.closing.title}</h2>
            <p className="text-sm text-on-dark-2">{c.closing.text}</p>
          </div>
          <ButtonLink href={c.primary.href} {...external}>
            {c.primary.label}
          </ButtonLink>
        </section>
      </div>
    </main>
  );
}
