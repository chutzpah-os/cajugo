import { z } from "zod";
import { authorizeTo, can } from "@/domains/auth/service";
import {
  paymentsSnapshot,
  saoPauloMonthStart,
  storeBilling,
} from "@/domains/billing/service";
import { subscriptionsView } from "@/domains/billing/subscriptions";
import { leadsSnapshot, storeLeadsThisMonth } from "@/domains/leads/service";
import { openReportsCount } from "@/domains/moderation/service";
import {
  sellersInReview,
  storeNetworkForAdmin,
} from "@/domains/sellers/service";
import { getSettings } from "@/domains/settings/service";
import { storeStock, vehiclesSnapshot } from "@/domains/showcase/service";
import { storeForAdmin, storesSnapshot } from "@/domains/stores/service";
import { formatTaxId, maskTaxId } from "@/platform/br/tax-id";
import { AppError } from "@/platform/http/errors";
import type { Db } from "@/platform/db/types";
import type { Session } from "@/platform/http/session";

export type AttentionTone = "caju" | "warn" | "danger" | "info" | "neutral";

export type AttentionItem = {
  key:
    | "receipts"
    | "dueSoon"
    | "late"
    | "sellers"
    | "approvals"
    | "reports"
    | "alerts"
    | "registered";
  count: number;
  title: string;
  detail: string;
  href: string;
  tone: AttentionTone;
};

export type AdminDashboard = {
  kpis: {
    activeStores: number;
    newStoresThisMonth: number;
    mrrCents: number;
    /** Mensalidades pagas no mês × mesmo período do mês anterior; null sem base. */
    revenueChangePct: number | null;
    vehiclesOnShowcase: number;
    publishedThisMonth: number;
    leadsThisMonth: number;
    leadsChangePct: number | null;
    lateCount: number;
    lateNames: string[];
    openReports: number;
  };
  /** "Precisa de atenção": só os itens com pendência (ADM-FR-002). */
  attention: AttentionItem[];
  leadOrigin: { cajugo: number; catalogs: number };
  topStores: { storeId: string; name: string; leads: number }[];
};

export type AdminDeps = {
  db: Db;
  now?: () => Date;
  /** Alertas de busca a avisar (cache de 60 s na rota; ALR-FR-003). */
  pendingAlerts?: () => Promise<number>;
};

/** Variação em % (arredondada); sem base no mês anterior, não aparece. */
export function changePct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** "Garagem 77, Nova Trilha" ou "Garagem 77, Nova Trilha e mais 3". */
export function namesLine(names: string[], shown = 2): string {
  const head = names.slice(0, shown).join(", ");
  const rest = names.length - shown;
  return rest > 0 ? `${head} e mais ${rest}` : head;
}

/**
 * Painel do admin [4a]/[15c] (ADM-FR-001, 002, 003). Só leitura: junta as contagens
 * dos outros domínios. Admin e suporte (ADM-SEC-001).
 */
export async function adminDashboard(
  deps: AdminDeps,
  session: Session | null,
): Promise<AdminDashboard> {
  const s = authorizeTo(session, "admin.read");
  const now = deps.now?.() ?? new Date();
  const db = deps.db;
  const [subs, stores, vehicles, leads, pays, sellers, reports, alerts] =
    await Promise.all([
      subscriptionsView({ db, now: () => now }, s, { filtro: "atrasadas" }),
      storesSnapshot(db, now),
      vehiclesSnapshot(db, now),
      leadsSnapshot(db, now),
      paymentsSnapshot(db, now),
      sellersInReview(db),
      openReportsCount(db, s),
      can(s, "alerts.notify") && deps.pendingAlerts
        ? deps.pendingAlerts()
        : Promise.resolve(0),
    ]);
  const lateNames = subs.items.map((i) => i.name);

  const items: AttentionItem[] = [
    {
      key: "receipts",
      count: pays.receiptsToReview,
      title: "Comprovantes a conferir",
      detail: "Pix enviados pelas lojas",
      href: "/admin/pagamentos",
      tone: "caju",
    },
    {
      key: "dueSoon",
      count: subs.dueSoon.length,
      title: "Vencimentos em 3 dias",
      detail: namesLine(subs.dueSoon.map((d) => d.name)),
      href: "/admin/assinaturas",
      tone: "warn",
    },
    {
      key: "late",
      count: subs.counts.late,
      title: "Assinaturas atrasadas",
      detail: namesLine(lateNames),
      href: "/admin/assinaturas?filtro=atrasadas",
      tone: "warn",
    },
    {
      key: "sellers",
      count: sellers,
      title: "Vendedores em análise",
      detail: "Documentos para conferir",
      href: "/admin/vendedores",
      tone: "info",
    },
    {
      key: "approvals",
      count: vehicles.pendingApproval,
      title: "Veículos aguardando aprovação",
      detail: "Conferir antes de publicar",
      href: "/admin/veiculos",
      tone: "info",
    },
    {
      key: "reports",
      count: reports,
      title: "Anúncios denunciados",
      detail: "Revisar e ocultar da vitrine",
      href: "/admin/denuncias",
      tone: "danger",
    },
    {
      key: "alerts",
      count: alerts,
      title: "Alertas de busca a avisar",
      detail: "Compradores esperando o aviso",
      href: "/admin/alertas",
      tone: "info",
    },
    {
      key: "registered",
      count: stores.registered,
      title: "Lojas aguardando ativação",
      detail: "Cadastro concluído, sem pagamento",
      href: "/admin/lojas?filtro=cadastradas",
      tone: "neutral",
    },
  ];

  return {
    kpis: {
      activeStores: stores.active,
      newStoresThisMonth: stores.activatedThisMonth,
      mrrCents: subs.mrrCents,
      revenueChangePct: changePct(pays.paidThisMonthCents, pays.paidPrevCents),
      vehiclesOnShowcase: vehicles.onShowcase,
      publishedThisMonth: vehicles.publishedThisMonth,
      leadsThisMonth: leads.count,
      leadsChangePct: changePct(leads.count, leads.previous),
      lateCount: subs.counts.late,
      lateNames,
      openReports: reports,
    },
    attention: items.filter((i) => i.count > 0),
    leadOrigin: leads.origin,
    topStores: leads.topStores,
  };
}

export type AdminStoreDetail = NonNullable<
  Awaited<ReturnType<typeof adminStoreDetail>>
>;

/**
 * Detalhe da loja [6g] (ADM-FR-008): cabeçalho, KPIs, Dono, Assinatura, Rede Caju e
 * Veículos. O CPF/CNPJ sai inteiro só para quem cuida das lojas (ADM-SEC-004); id
 * inválido ou loja inexistente → 404 (ADM-SEC-005). Admin e suporte.
 */
export async function adminStoreDetail(
  deps: AdminDeps,
  session: Session | null,
  rawId: unknown,
) {
  const s = authorizeTo(session, "admin.read");
  const id = z.uuid().safeParse(rawId);
  if (!id.success) throw AppError.notFound();
  const db = deps.db;
  const now = deps.now?.() ?? new Date();
  const store = await storeForAdmin(db, id.data);
  if (!store || store.status === "archived") throw AppError.notFound();

  const [billing, stock, leads, network, settings] = await Promise.all([
    storeBilling(db, store.id),
    storeStock(db, store.id),
    storeLeadsThisMonth(db, store.id, now),
    storeNetworkForAdmin(db, store.id, saoPauloMonthStart(now)),
    getSettings(db, now),
  ]);
  const manage = can(s, "stores.manage");
  const taxId =
    store.taxId && store.taxIdType
      ? (manage ? formatTaxId : maskTaxId)(store.taxIdType, store.taxId)
      : null;

  return {
    store: {
      id: store.id,
      name: store.name,
      slug: store.slug,
      city: `${store.city} (${store.state})`,
      status: store.status,
      since: store.activatedAt,
    },
    kpis: {
      vehicles: stock.total,
      onCajugo: stock.onCajugo,
      leadsThisMonth: leads,
    },
    owner: {
      profileId: store.ownerId,
      name: store.ownerName,
      email: store.ownerEmail,
      phone: store.ownerPhone,
      taxIdLabel: store.taxIdType === "cnpj" ? "CNPJ" : "CPF",
      taxId,
    },
    subscription: {
      plan: "Catálogo",
      membershipCents: settings.membership_cents,
      nextDueAt: store.nextDueAt,
      totalPaidCents: billing.totalPaidCents,
      invoices: billing.invoices,
    },
    network: {
      acceptsSellers: store.acceptsSellers,
      commission:
        store.commissionType && store.commissionValue !== null
          ? { type: store.commissionType, value: store.commissionValue }
          : null,
      partners: network.partners,
      salesThisMonth: network.salesThisMonth,
    },
    vehicles: stock.first,
    canManage: manage,
  };
}
