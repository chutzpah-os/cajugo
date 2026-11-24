import { and, arrayOverlaps, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { authorize, type Session } from "@/platform/http/session";
import { brl } from "@/platform/br/money";
import { notices, profiles, userRole } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { AppError } from "@/platform/http/errors";

/**
 * Avisos no painel (GLOSSARY "Aviso", ADR 0007): cada evento vira uma linha para quem
 * recebe; a frase é montada aqui, a partir de dados sem informação pessoal. Cada spec
 * acrescenta os seus tipos (enum `notice_kind` + `NoticeData` + `render`).
 */
export type NoticeData =
  | { kind: "payment_confirmed" }
  | { kind: "payment_rejected"; reason: string; missingCents?: number }
  /** `vehicle` é o nome do veículo; `reason`, o motivo da CajuGo já em texto (007b). */
  | { kind: "vehicle_hidden"; vehicle: string; reason: string }
  | { kind: "vehicle_shown"; vehicle: string }
  /** Fatura mensal aberta (011): `due` já em dd/mm. */
  | { kind: "invoice_due"; due: string; totalCents: number }
  /** Sem `store`: o lojista; com `store` (nome da loja): os admins (011). */
  | { kind: "store_suspended"; store?: string }
  | { kind: "store_reactivated"; store?: string; byAdmin?: boolean }
  /** Ao vendedor: venda confirmada pela loja (008b). */
  | {
      kind: "sale_confirmed";
      vehicle: string;
      store: string;
      commissionCents: number;
    }
  /** À loja: o vendedor (primeiro nome) marcou ou desfez o "Recebi" (008b). */
  | { kind: "commission_received"; seller: string; vehicle: string }
  | { kind: "commission_unreceived"; seller: string; vehicle: string }
  /** Caju Indica (010): `store` é o nome da loja indicada. */
  | { kind: "referral_active"; store: string; amountCents: number }
  | {
      kind: "referral_reward";
      store: string;
      amountCents: number;
      target: "credit" | "balance";
    };

export type NoticeView = {
  id: string;
  text: string;
  tone: "ok" | "alert";
  createdAt: Date;
};

function render(n: NoticeData): Pick<NoticeView, "text" | "tone"> {
  switch (n.kind) {
    case "payment_confirmed":
      return { text: "Pagamento confirmado. Sua loja está no ar.", tone: "ok" };
    case "payment_rejected":
      return {
        text: `Comprovante recusado: ${n.reason}.${
          n.missingCents ? ` Faltam ${brl(n.missingCents)}.` : ""
        }`,
        tone: "alert",
      };
    case "vehicle_hidden":
      return {
        text: `${n.vehicle} foi ocultado da vitrine: ${n.reason}. Ele continua no seu catálogo. Para revisar, fale com a CajuGo.`,
        tone: "alert",
      };
    case "vehicle_shown":
      return { text: `${n.vehicle} voltou à vitrine CajuGo.`, tone: "ok" };
    case "invoice_due":
      return {
        text: `Sua fatura vence em ${n.due} · ${brl(n.totalCents)}.`,
        tone: "alert",
      };
    case "store_suspended":
      return {
        text: n.store
          ? `A loja ${n.store} foi suspensa por falta de pagamento.`
          : "Sua loja foi suspensa por falta de pagamento.",
        tone: "alert",
      };
    case "store_reactivated":
      if (n.store)
        return { text: `A loja ${n.store} foi reativada.`, tone: "ok" };
      return {
        text: n.byAdmin
          ? "Sua loja voltou ao ar. A fatura continua em aberto."
          : "Pagamento confirmado. Sua loja está no ar.",
        tone: "ok",
      };
    case "sale_confirmed":
      return {
        text: `Venda confirmada: ${n.vehicle} na ${n.store} · comissão ${brl(n.commissionCents)}`,
        tone: "ok",
      };
    case "commission_received":
      return {
        text: `${n.seller} confirmou o recebimento da comissão do ${n.vehicle}.`,
        tone: "ok",
      };
    case "commission_unreceived":
      return {
        text: `${n.seller} desfez o recebimento da comissão do ${n.vehicle}.`,
        tone: "alert",
      };
    case "referral_active":
      return {
        text: `Sua indicação ${n.store} está ativa. Você ganhou ${brl(n.amountCents)}.`,
        tone: "ok",
      };
    case "referral_reward":
      return {
        text:
          n.target === "credit"
            ? `Você ganhou ${brl(n.amountCents)} de crédito na sua fatura pela indicação ${n.store}.`
            : `Você ganhou ${brl(n.amountCents)} de saldo pela indicação ${n.store}.`,
        tone: "ok",
      };
  }
}

/** Grava o aviso (dentro da transação de quem gera o evento). */
export async function notify(
  db: Db,
  profileId: string,
  notice: NoticeData,
  at: Date = new Date(),
): Promise<void> {
  const { kind, ...data } = notice;
  await db.insert(notices).values({ profileId, kind, data, createdAt: at });
}

/**
 * Avisa a loja: o dono e os usuários dela, e só eles (RPT-FR-006, RPT-SEC-004). Dentro
 * da transação de quem gera o evento.
 */
export async function notifyStore(
  db: Db,
  storeId: string,
  notice: NoticeData,
  at: Date = new Date(),
): Promise<void> {
  const team = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(
      and(
        eq(profiles.storeId, storeId),
        arrayOverlaps(profiles.roles, ["store_owner", "store_staff"]),
      ),
    );
  for (const p of team) await notify(db, p.id, notice, at);
}

/** Avisos não dispensados de quem está conectado, do mais recente ao mais antigo. */
export async function noticesFor(
  db: Db,
  session: Session | null,
  limit = 10,
): Promise<NoticeView[]> {
  const s = authorize(session, userRole.enumValues);
  const rows = await db
    .select()
    .from(notices)
    .where(and(eq(notices.profileId, s.userId), isNull(notices.dismissedAt)))
    .orderBy(desc(notices.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    ...render({ kind: r.kind, ...(r.data as object) } as NoticeData),
  }));
}

/** "Dispensar": só o próprio aviso; de outra pessoa ou inexistente → 404. */
export async function dismissNotice(
  db: Db,
  session: Session | null,
  noticeId: string,
): Promise<void> {
  const s = authorize(session, userRole.enumValues);
  if (!z.uuid().safeParse(noticeId).success) throw AppError.notFound();
  const done = await db
    .update(notices)
    .set({ dismissedAt: new Date() })
    .where(
      and(
        eq(notices.id, noticeId),
        eq(notices.profileId, s.userId),
        isNull(notices.dismissedAt),
      ),
    )
    .returning({ id: notices.id });
  if (!done.length) throw AppError.notFound();
}
