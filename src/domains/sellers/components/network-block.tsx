import Link from "next/link";

const row = "flex min-h-11 items-center justify-between px-4 text-[15px]";

/**
 * Bloco **Rede Caju** da Conta [3c] (RCL-FR-014): Comissão [7e] e Vendedores [7f],
 * com o número de pedidos pendentes.
 */
export function NetworkBlock({
  acceptsSellers,
  pending,
}: {
  acceptsSellers: boolean;
  pending: number;
}) {
  return (
    <section
      data-testid="network-block"
      className="flex flex-col rounded-card border border-line bg-surface"
    >
      <div className="flex flex-col gap-1 p-4 pb-2">
        <h2 className="text-[17px] font-extrabold">Rede Caju</h2>
        <p className="text-sm text-text-2">
          {acceptsSellers
            ? "Sua loja aceita vendedores independentes."
            : "Sua loja não está aceitando vendedores."}
        </p>
      </div>
      <ul className="divide-y divide-line-2 border-t border-line-2">
        <li>
          <Link href="/painel/rede/comissao" className={row}>
            Comissão <span aria-hidden>›</span>
          </Link>
        </li>
        <li>
          <Link href="/painel/rede/vendedores" className={row}>
            <span>
              Vendedores
              {pending > 0 && (
                <span
                  data-testid="network-pending"
                  className="ml-2 rounded-full bg-caju px-2 py-0.5 text-xs font-bold text-white"
                >
                  {pending}
                </span>
              )}
            </span>
            <span aria-hidden>›</span>
          </Link>
        </li>
      </ul>
    </section>
  );
}
