import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "./cn";
import { ChevronLeftIcon } from "./icons";
import { Logo } from "./logo";

/**
 * Cabeçalhos das telas logadas (DESIGN.md §3, D1 da 012): cada página monta o seu.
 * No celular ocupam a largura toda (o `-mx-4` desfaz a margem da moldura); a partir de
 * 1024 px viram o cabeçalho claro do desktop [15b]/[15c]: eyebrow, título e a ação
 * principal à direita.
 */

function DesktopTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="hidden items-end justify-between gap-4 lg:flex">
      <div className="flex flex-col gap-0.5">
        {eyebrow && <p className="text-[13px] text-text-3">{eyebrow}</p>}
        <h1 className="text-[26px] font-extrabold tracking-[-0.02em]">
          {title}
        </h1>
      </div>
      {action}
    </div>
  );
}

/**
 * Cabeçalho escuro (lojista, vendedor e [4b]): subtítulo `on-dark-2` 12, título
 * 24/800, avatar e o conteúdo (KPIs, card da assinatura).
 */
export function DarkHeader({
  eyebrow,
  title,
  avatar,
  action,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Avatar com o menu da conta (montado pela página, vem da `auth`). */
  avatar?: ReactNode;
  /** Ação principal do desktop (ex.: "Novo veículo"); no celular fica na tela. */
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header
      data-testid="dark-header"
      data-header
      className="-mx-4 flex flex-col gap-4 bg-ink px-4 pt-6 pb-5 text-white lg:mx-0 lg:bg-transparent lg:px-0 lg:pt-2 lg:pb-0 lg:text-ink"
    >
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <div className="flex min-w-0 flex-col gap-0.5">
          {eyebrow && (
            <p className="truncate text-xs text-on-dark-2">{eyebrow}</p>
          )}
          <h1 className="text-2xl font-extrabold tracking-[-0.02em]">
            {title}
          </h1>
        </div>
        {avatar}
      </div>
      <DesktopTitle eyebrow={eyebrow} title={title} action={action} />
      {children}
    </header>
  );
}

/** Selo "ADMIN" ao lado do logo (cabeçalho claro do admin). */
export function AdminTag() {
  return (
    <span className="rounded-[5px] bg-ink px-[7px] py-[3px] text-[10px] leading-none font-bold tracking-[0.06em] text-white uppercase">
      Admin
    </span>
  );
}

/**
 * Cabeçalho claro do admin ([4a], [1d], [4c]): logo, selo "ADMIN" e avatar; embaixo,
 * o título (eyebrow + 24/800) ou as abas sublinhadas.
 */
export function LightHeader({
  eyebrow,
  title,
  desktop,
  avatar,
  action,
  tabs,
  titleOnMobile = true,
  children,
}: {
  eyebrow?: ReactNode;
  title?: ReactNode;
  /** `false`: no celular o título fica só para leitor de tela ([1d]: logo e abas). */
  titleOnMobile?: boolean;
  /** Título diferente no desktop (ex.: [4a] "Olá, Ana" × [15c] "Visão geral"). */
  desktop?: { eyebrow?: ReactNode; title: ReactNode };
  avatar?: ReactNode;
  action?: ReactNode;
  tabs?: readonly { href: string; label: string; current: boolean }[];
  children?: ReactNode;
}) {
  return (
    <header
      data-testid="light-header"
      data-header
      className={cn(
        "-mx-4 flex flex-col gap-3.5 border-b border-line bg-surface px-4 pt-4 lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:pt-2",
        tabs ? "pb-0" : "pb-4 lg:pb-0",
      )}
    >
      <div className="flex items-center justify-between lg:hidden">
        <span className="flex items-center gap-2">
          <Logo />
          <AdminTag />
        </span>
        {avatar}
      </div>
      {title && (
        <>
          <div
            className={cn(
              "flex flex-col gap-0.5 lg:hidden",
              !titleOnMobile && "sr-only",
            )}
          >
            {eyebrow && <p className="text-[13px] text-text-3">{eyebrow}</p>}
            <h1 className="text-2xl font-extrabold tracking-[-0.02em]">
              {title}
            </h1>
          </div>
          <DesktopTitle
            eyebrow={desktop ? desktop.eyebrow : eyebrow}
            title={desktop?.title ?? title}
            action={action}
          />
        </>
      )}
      {tabs && (
        <nav
          aria-label="Abas"
          className="flex gap-5 lg:border-b lg:border-line"
        >
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              aria-current={t.current ? "page" : undefined}
              className={cn(
                "-mb-px flex min-h-11 items-center border-b-[2.5px] pt-2.5 pb-3 text-sm font-bold",
                t.current
                  ? "border-caju text-ink"
                  : "border-transparent text-text-3",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      )}
      {children}
    </header>
  );
}

/** Cabeçalho branco com voltar (telas internas: [6g] "← Lojas", formulários). */
export function BackHeader({
  href,
  label,
  title,
  action,
}: {
  href: string;
  label: string;
  title?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header
      data-testid="back-header"
      data-header
      className="-mx-4 flex flex-col gap-2 border-b border-line bg-surface px-4 pt-3 pb-3 lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0"
    >
      <div className="flex items-center justify-between gap-3">
        <Link
          href={href}
          className="-ml-2 flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-text-2"
        >
          <ChevronLeftIcon size={18} />
          {label}
        </Link>
        {action}
      </div>
      {title && (
        <h1 className="text-2xl font-extrabold tracking-[-0.02em]">{title}</h1>
      )}
    </header>
  );
}
