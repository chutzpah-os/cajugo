import { z } from "zod";
import { authorizeTo, profileNames } from "@/domains/auth/service";
import { storeForAdmin } from "@/domains/stores/service";
import type { Db } from "@/platform/db/types";
import { readActivity } from "@/platform/http/activity-log";
import type { Session } from "@/platform/http/session";

export const LOG_PAGE_SIZE = 20;

/** Tipos do filtro do Log (ADM-FR-015): cada um junta ações por nome ou prefixo. */
export const LOG_TYPES = {
  lojas: { label: "Lojas", exact: [], prefixes: ["store."] },
  assinaturas: {
    label: "Assinaturas",
    exact: ["plan.edited"],
    prefixes: ["subscription.", "invoice."],
  },
  pagamentos: { label: "Pagamentos", exact: [], prefixes: ["payment."] },
  senha: {
    label: "Senha temporária",
    exact: ["auth.temp_password_set"],
    prefixes: [],
  },
  acesso: {
    label: "Acesso e equipe",
    exact: ["auth.password_changed", "auth.admin_created"],
    prefixes: ["team."],
  },
  veiculos: {
    label: "Veículos",
    exact: [],
    prefixes: ["vehicle.", "vehicle_reports."],
  },
  rede: {
    label: "Rede Caju",
    exact: [],
    prefixes: ["seller.", "partnership.", "sale."],
  },
  indica: {
    label: "Caju Indica",
    exact: [],
    prefixes: ["referral.", "referrer."],
  },
  regras: { label: "Regras", exact: [], prefixes: ["settings."] },
  alertas: { label: "Alertas", exact: [], prefixes: ["search_alert."] },
} as const satisfies Record<
  string,
  { label: string; exact: string[]; prefixes: string[] }
>;
export type LogType = keyof typeof LOG_TYPES;

/** A ação em texto (ADM-FR-011); ação sem rótulo aparece com o nome técnico. */
const ACTION_LABEL: Record<string, string> = {
  "store.registered": "Loja cadastrada pelo lojista",
  "store.created_by_admin": "Loja criada pelo admin",
  "store.updated": "Dados da loja alterados",
  "store.updated_by_admin": "Dados da loja alterados pelo admin",
  "store.slug_changed": "Endereço do catálogo trocado",
  "store.slug_released": "Endereço reservado liberado",
  "store.past_due": "Loja em atraso",
  "store.suspended": "Loja suspensa",
  "store.reactivated": "Loja reativada",
  "store.canceled": "Loja cancelada",
  "store.archived": "Loja arquivada",
  "store.network_rules": "Regras da Rede Caju da loja alteradas",
  "subscription.cancel_scheduled": "Cancelamento agendado",
  "subscription.cancel_undone": "Cancelamento desfeito",
  "subscription.canceled_now": "Assinatura cancelada na hora",
  "subscription.resubscribed": "Assinatura retomada",
  "invoice.opened": "Fatura aberta",
  "plan.edited": "Plano alterado",
  "payment.submitted": "Comprovante enviado",
  "payment.confirmed": "Pagamento confirmado",
  "payment.rejected": "Comprovante recusado",
  "payment.manual": "Pagamento registrado sem comprovante",
  "auth.temp_password_set": "Senha temporária definida",
  "auth.password_changed": "Senha trocada",
  "auth.admin_created": "Admin criado",
  "team.invited": "Convite para a equipe",
  "team.removed": "Removido da equipe",
  "vehicle.published": "Veículo publicado",
  "vehicle.unpublished": "Veículo despublicado",
  "vehicle.price_changed": "Preço alterado",
  "vehicle.sold": "Veículo vendido",
  "vehicle.sale_undone": "Venda desfeita",
  "vehicle.deleted": "Veículo excluído",
  "vehicle.hidden": "Veículo ocultado",
  "vehicle.shown": "Veículo voltou à vitrine",
  "vehicle.commission_override": "Comissão do veículo alterada",
  "vehicle_reports.kept": "Denúncia arquivada",
  "seller.registered": "Vendedor cadastrado",
  "seller.approved": "Vendedor aprovado",
  "seller.pix_changed": "Chave Pix do vendedor trocada",
  "partnership.approved": "Parceria aprovada",
  "partnership.declined": "Parceria recusada",
  "partnership.ended": "Parceria encerrada",
  "sale.confirmed": "Venda da Rede confirmada",
  "sale.canceled": "Venda da Rede cancelada",
  "referrer.registered": "Indicador cadastrado",
  "referral.activated": "Indicação ativada",
  "referral.rewarded": "Indicação recompensada",
  "referral.rejected": "Indicação recusada",
  "settings.updated": "Regra da plataforma alterada",
  "search_alert.notified": "Alerta de busca enviado",
  "search_alert.expired": "Alerta de busca expirado",
  "search_alert.canceled": "Alerta de busca cancelado",
};

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .catch(undefined);
const querySchema = z.object({
  tipo: z
    .enum(Object.keys(LOG_TYPES) as [LogType, ...LogType[]])
    .optional()
    .catch(undefined),
  de: day,
  ate: day,
  loja: z.uuid().optional().catch(undefined),
  depois: z.uuid().optional().catch(undefined),
});

/** Meia-noite em São Paulo (UTC−3, sem horário de verão desde 2019). */
const spMidnight = (ymd: string, plusDays = 0) =>
  new Date(Date.parse(`${ymd}T03:00:00Z`) + plusDays * 86_400_000);

export type LogItem = {
  id: string;
  at: string;
  label: string;
  by: string;
  /** Loja do registro, para o link do filtro por loja. */
  storeId: string | null;
};

export type ActivityLogView = {
  items: LogItem[];
  next: string | null;
  filter: { tipo?: LogType; de?: string; ate?: string; loja?: string };
  store: { id: string; name: string } | null;
};

/**
 * Logs de atividade do item Log (ADM-FR-015) e o histórico da loja (ADM-FR-011,
 * filtro `loja`): do mais recente ao mais antigo, 20 por vez, ação em texto e o nome
 * de quem fez; nada de `data` nem dado pessoal (ADM-SEC-005). Admin e suporte.
 */
export async function activityLogView(
  deps: { db: Db },
  session: Session | null,
  raw: Record<string, string | string[] | undefined>,
): Promise<ActivityLogView> {
  authorizeTo(session, "admin.read");
  const q = querySchema.parse(
    Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
    ),
  );
  const type = q.tipo ? LOG_TYPES[q.tipo] : undefined;
  const store = q.loja ? await storeForAdmin(deps.db, q.loja) : null;

  const rows = await readActivity(deps.db, {
    actions: type && {
      exact: [...type.exact],
      prefixes: [...type.prefixes],
    },
    from: q.de ? spMidnight(q.de) : undefined,
    to: q.ate ? spMidnight(q.ate, 1) : undefined,
    storeId: q.loja,
    before: q.depois,
    limit: LOG_PAGE_SIZE + 1,
  });
  const page = rows.slice(0, LOG_PAGE_SIZE);
  const names = await profileNames(deps.db, [
    ...new Set(page.flatMap((r) => (r.userId ? [r.userId] : []))),
  ]);

  return {
    items: page.map((r) => ({
      id: r.id,
      at: r.createdAt.toISOString(),
      label: ACTION_LABEL[r.action] ?? r.action,
      by: (r.userId && names.get(r.userId)) || "Sistema",
      storeId: r.entity === "store" ? r.entityId : null,
    })),
    next: rows.length > LOG_PAGE_SIZE ? page[page.length - 1].id : null,
    filter: { tipo: q.tipo, de: q.de, ate: q.ate, loja: q.loja },
    store: store && q.loja ? { id: q.loja, name: store.name } : null,
  };
}
