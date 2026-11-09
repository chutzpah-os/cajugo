import type { ReactNode } from "react";

/** Aviso público de página indisponível ([12g], [12d]), sem expor o motivo. */
export function Unavailable({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-4 px-4 py-10 md:max-w-5xl">
      <h1 className="text-[24px] font-extrabold tracking-[-0.02em]">{title}</h1>
      {children}
    </main>
  );
}
