import { and, asc, count, eq, lte } from "drizzle-orm";
import { authorizeTo } from "@/domains/auth/service";
import { contactRequests } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { logActivity } from "@/platform/http/activity-log";
import {
  AppError,
  fieldErrorsFromZod,
  type FieldError,
} from "@/platform/http/errors";
import { isHoneypotFilledIn } from "@/platform/http/honeypot";
import { withinPublicFormLimits } from "@/platform/http/rate-limit";
import type { Session } from "@/platform/http/session";
import { whatsappLink } from "@/platform/whatsapp/link";
import {
  contactRequestSchema,
  handleSchema,
  TOPIC_LABEL,
  type ContactTopic,
} from "./schemas";

/** Pedido não atendido em 90 dias vence e perde os dados pessoais. */
export const CONTACT_VALIDITY_DAYS = 90;
const DAY_MS = 86_400_000;

export type ContactRequestResult =
  { ok: true } | { ok: false; message: string; errors: FieldError[] };

/**
 * Pedido de contato público ("Quero ser avisado", "Esqueci a senha"): limite por rede,
 * campo isca que finge sucesso sem gravar e schema estrito (SECURITY.md §6). Nenhum
 * número da equipe vai para a tela: quem chama é a CajuGo.
 */
export async function requestContact(
  db: Db,
  raw: unknown,
  ctx: { ipHash: string },
  now: Date = new Date(),
): Promise<ContactRequestResult> {
  if (!(await withinPublicFormLimits(db, "contact", ctx.ipHash, now)))
    return {
      ok: false,
      message: "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
      errors: [],
    };
  if (isHoneypotFilledIn(raw)) return { ok: true };
  const parsed = contactRequestSchema.safeParse(raw);
  if (!parsed.success)
    return {
      ok: false,
      message: "Confira os campos destacados.",
      errors: fieldErrorsFromZod(parsed.error),
    };
  const d = parsed.data;
  await db.insert(contactRequests).values({
    topic: d.topic,
    name: d.name,
    phone: d.phone,
    email: d.topic === "password_help" ? d.email : null,
    consentAt: now,
    createdAt: now,
  });
  return { ok: true };
}

export type ContactInboxItem = {
  id: string;
  topic: ContactTopic;
  topicLabel: string;
  name: string;
  phone: string;
  email: string | null;
  whatsappUrl: string;
  createdAt: Date;
};

const MESSAGE: Record<ContactTopic, string> = {
  auction_waitlist:
    "Olá! Aqui é da CajuGo. Você pediu para ser avisado sobre o serviço de leilão.",
  password_help:
    "Olá! Aqui é da CajuGo. Recebemos o seu pedido para criar uma nova senha.",
};

/** Pedidos pendentes [Contatos], do mais antigo ao mais novo: admin e suporte. */
export async function contactInbox(
  db: Db,
  session: Session | null,
): Promise<ContactInboxItem[]> {
  authorizeTo(session, "contacts.handle");
  const rows = await db
    .select()
    .from(contactRequests)
    .where(eq(contactRequests.status, "pending"))
    .orderBy(asc(contactRequests.createdAt), asc(contactRequests.id));
  return rows.map((r) => ({
    id: r.id,
    topic: r.topic,
    topicLabel: TOPIC_LABEL[r.topic],
    name: r.name ?? "",
    phone: r.phone ?? "",
    email: r.email,
    whatsappUrl: whatsappLink(r.phone ?? "", MESSAGE[r.topic]),
    createdAt: r.createdAt,
  }));
}

/** Contador do menu "Contatos" (0 sem permissão). */
export async function pendingContactsCount(
  db: Db,
  session: Session | null,
): Promise<number> {
  try {
    authorizeTo(session, "contacts.handle");
  } catch {
    return 0;
  }
  const [r] = await db
    .select({ n: count() })
    .from(contactRequests)
    .where(eq(contactRequests.status, "pending"));
  return r?.n ?? 0;
}

const closed = (status: "handled" | "expired", now: Date) => ({
  status,
  name: null,
  phone: null,
  email: null,
  closedAt: now,
});

/**
 * "Marcar como atendido": fecha o pedido e apaga nome, celular e e-mail na mesma
 * escrita; o registro de atividade fica sem dado pessoal. `false` se já estava fechado.
 */
export async function markContactHandled(
  db: Db,
  session: Session | null,
  input: unknown,
  now: Date = new Date(),
): Promise<boolean> {
  const actor = authorizeTo(session, "contacts.handle");
  const parsed = handleSchema.safeParse(input);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));
  const { requestId } = parsed.data;
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(contactRequests)
      .set({ ...closed("handled", now), handledBy: actor.userId })
      .where(
        and(
          eq(contactRequests.id, requestId),
          eq(contactRequests.status, "pending"),
        ),
      )
      .returning({ id: contactRequests.id });
    if (!row) return false;
    await logActivity(tx, {
      userId: actor.userId,
      action: "contact_request.handled",
      entity: "contact_request",
      entityId: requestId,
    });
    return true;
  });
}

/** Job diário: pendente há mais de 90 dias vence e perde os dados pessoais. */
export async function purgeExpiredContacts(
  db: Db,
  now: Date = new Date(),
): Promise<number> {
  const rows = await db
    .update(contactRequests)
    .set(closed("expired", now))
    .where(
      and(
        eq(contactRequests.status, "pending"),
        lte(
          contactRequests.createdAt,
          new Date(now.getTime() - CONTACT_VALIDITY_DAYS * DAY_MS),
        ),
      ),
    )
    .returning({ id: contactRequests.id });
  return rows.length;
}
