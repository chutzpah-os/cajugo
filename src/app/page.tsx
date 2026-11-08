import { SiteHeader } from "@/domains/auth/components/site-header";

/** Vitrine [1a]: conteúdo na spec 006; aqui, o cabeçalho com o menu [11a]. */
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col px-4 py-8 md:max-w-5xl">
        <h1 className="text-[28px] font-extrabold tracking-[-0.02em]">
          Carros usados e seminovos à venda
        </h1>
      </main>
    </>
  );
}
