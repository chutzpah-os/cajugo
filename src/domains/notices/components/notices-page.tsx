import type { NoticeView } from "../service";
import { NoticeList } from "./notice-list";

/**
 * Tela **Avisos** de cada painel (pedido do dono do produto, 2026-11-24): o único lugar
 * onde os avisos aparecem — lojista, vendedor, indicador e admin.
 */
export function NoticesPage({ notices }: { notices: NoticeView[] }) {
  return (
    <section className="flex flex-col gap-4 pt-6 pb-6 lg:max-w-3xl lg:pt-2">
      <div className="flex flex-col gap-1">
        <h1 className="text-[26px] font-extrabold tracking-[-0.02em]">
          Avisos
        </h1>
        <p className="text-sm text-text-3">
          O que mudou na sua conta, do mais recente ao mais antigo.
        </p>
      </div>
      {notices.length ? (
        <div className="rounded-card border border-line bg-surface p-4">
          <NoticeList notices={notices} showAll />
        </div>
      ) : (
        <p className="rounded-card border border-line bg-surface p-4 text-sm text-text-2">
          Nenhum aviso por aqui.
        </p>
      )}
    </section>
  );
}
