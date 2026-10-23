import { NoPermission } from "@/domains/auth/components/no-permission";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { requireStorePage } from "@/domains/auth/guards";

/** Usuário da loja com loja indisponível (AUT-FR-016). */
async function Content() {
  const { allowed, home } = await requireStorePage("/painel/loja-indisponivel");
  if (!allowed) return <NoPermission home={home} />;
  return (
    <section className="flex flex-col gap-3 py-10">
      <h1 className="text-[22px] font-extrabold">Loja indisponível</h1>
      <p className="text-[15px] text-text-2">
        O painel desta loja está fechado no momento. Fale com o responsável pela
        loja para saber quando ele volta.
      </p>
    </section>
  );
}

export default function StoreUnavailablePage() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
