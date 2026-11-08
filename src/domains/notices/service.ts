import { and, desc, eq, isNull } from "drizzle-orm";
import { authorize, type Session } from "@/platform/http/session";
import { brl } from "@/platform/br/money";
import { notices, userRole } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { AppError } from "@/platform/http/errors";

/**
 * Avisos no painel (GLOSSARY "Aviso", ADR 0007): cada evento vira uma linha para quem
 * recebe; a frase é montada aqui, a partir de dados sem informação pessoal. Cada spec
 * acrescenta os seus tipos (enum `notice_kind` + `NoticeData` + `render`).
 */
export type NoticeData =
  | { kind: "payment_confirmed" }
  | { kind: "payment_rejected"; reason: string; missingCents?: number };

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
