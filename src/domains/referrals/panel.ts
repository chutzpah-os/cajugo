import { eq, sum } from "drizzle-orm";
import { z } from "zod";
import { getSettings } from "@/domains/settings/service";
import {
  profiles,
  referralRewards,
  referrals,
  stores,
} from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { authorize, type Session } from "@/platform/http/session";
import { referralUrl } from "@/platform/http/urls";
import { canRefer, getOrCreateCode } from "./service";

/** Quem tem painel do Caju Indica: lojista [8a], vendedor e indicador [9d]. */
const REFERRERS = ["store_owner", "seller", "referrer"] as const;

export type ReferralPanel =
  | { enabled: false }
  | {
      enabled: true;
      code: string;
      url: string;
      pctBps: number;
      months: number;
    };

/**
 * Painel do Caju Indica (IND-FR-001, 002, 015): o código pessoal, criado no 1º
 * acesso (um por pessoa), o link e as regras. Programa desligado ou papel fora de
 * "quem pode indicar" → sem código.
 */
export async function referralPanel(
  db: Db,
  session: Session | null,
): Promise<ReferralPanel> {
  const s = authorize(session, REFERRERS);
  const settings = await getSettings(db);
  if (!canRefer(settings, s.roles)) return { enabled: false };
  const [me] = await db
    .select({ name: profiles.name })
    .from(profiles)
    .where(eq(profiles.id, s.userId));
  const code = await getOrCreateCode(db, s.userId, me?.name ?? "");
  return {
    enabled: true,
    code,
    url: referralUrl(code),
    pctBps: settings.referral_pct_bps,
    months: settings.referral_months,
  };
}

export const REFERRAL_FILTERS = [
  "todas",
  "rendendo",
  "cadastradas",
  "pausadas",
] as const;

export type ReferralStatus =
  "registered" | "active" | "paused" | "ended" | "invalid";

const FILTER_STATUS: Record<
  (typeof REFERRAL_FILTERS)[number],
  ReferralStatus | null
> = {
  todas: null,
  rendendo: "active",
  cadastradas: "registered",
  pausadas: "paused",
};

const filterSchema = z.object({
  filtro: z.enum(REFERRAL_FILTERS).catch("todas").default("todas"),
});

export type ReferralItem = {
  /** Só o nome da loja (IND-SEC-002). */
  store: string;
  status: ReferralStatus;
  earnedCents: number;
  /** Meses que ainda rendem; nulo na não válida. */
  monthsLeft: number | null;
};

/** Status mostrado (D1): só "não válida", "encerrada" e o que já rendeu são guardados. */
function statusOf(
  r: { status: string; monthsPaid: number; storeStatus: string },
  months: number,
): ReferralStatus {
  if (r.status === "rejected") return "invalid";
  if (r.status === "ended" || r.monthsPaid >= months) return "ended";
  if (r.storeStatus === "canceled" || r.storeStatus === "archived")
    return "ended";
  if (r.monthsPaid === 0) return "registered";
  if (r.storeStatus === "past_due" || r.storeStatus === "suspended")
    return "paused";
  return "active";
}

/** Indicações de quem está conectado [8b]/[9d] (IND-FR-005, 008, 017, SEC-001, 002). */
export async function referralsList(
  db: Db,
  session: Session | null,
  raw: unknown,
): Promise<{
  filter: (typeof REFERRAL_FILTERS)[number];
  counts: { all: number; earning: number; registered: number; paused: number };
  items: ReferralItem[];
}> {
  const s = authorize(session, REFERRERS);
  const { filtro } = filterSchema.parse(raw ?? {});
  const { referral_months: months } = await getSettings(db);
  const rows = await db
    .select({
      store: stores.name,
      storeStatus: stores.status,
      status: referrals.status,
      monthsPaid: referrals.monthsPaid,
      earned: sum(referralRewards.amountCents).mapWith(Number),
      createdAt: referrals.createdAt,
    })
    .from(referrals)
    .innerJoin(stores, eq(stores.id, referrals.referredStoreId))
    .leftJoin(referralRewards, eq(referralRewards.referralId, referrals.id))
    .where(eq(referrals.referrerId, s.userId))
    .groupBy(referrals.id, stores.id)
    .orderBy(referrals.createdAt);
  const all = rows.map((r): ReferralItem => {
    const status = statusOf(r, months);
    return {
      store: r.store,
      status,
      earnedCents: status === "invalid" ? 0 : (r.earned ?? 0),
      monthsLeft:
        status === "invalid" ? null : Math.max(0, months - r.monthsPaid),
    };
  });
  const count = (st: ReferralStatus) =>
    all.filter((i) => i.status === st).length;
  const wanted = FILTER_STATUS[filtro];
  return {
    filter: filtro,
    counts: {
      all: all.length,
      earning: count("active"),
      registered: count("registered"),
      paused: count("paused"),
    },
    items: wanted ? all.filter((i) => i.status === wanted) : all,
  };
}
