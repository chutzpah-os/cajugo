import { ButtonLink } from "@/ui/button";

/** "Sem permissão" (AUT-FR-012): nenhum dado da área aparece. */
export function NoPermission({ home }: { home: string }) {
  return (
    <section className="flex flex-col gap-3 py-10">
      <h1 className="text-[22px] font-extrabold">Sem permissão</h1>
      <p className="text-[15px] text-text-2">
        Sua conta não tem acesso a esta área. Se precisar dela, fale com o
        responsável pela sua conta.
      </p>
      <ButtonLink href={home} variant="outline" className="self-start">
        Ir para o meu painel
      </ButtonLink>
    </section>
  );
}
