import { eq } from "drizzle-orm";
import { profiles, referralCodes, referrals } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";

/** Primeiro nome sem acento e em maiúsculas (até 12 letras); sem letras: CAJU. */
function codeBase(name: string): string {
  const first = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Z]/g, ""))
    .find(Boolean);
  return (first ?? "CAJU").slice(0, 12);
}

/**
 * Código pessoal de indicação (STO-FR-014): `RICARDO10`, `RICARDO11`… o primeiro
 * livre. Idempotente: quem já tem código recebe o mesmo.
 */
export async function getOrCreateCode(
  db: Db,
  profileId: string,
  name: string,
): Promise<string> {
  const [existing] = await db
    .select({ code: referralCodes.code })
    .from(referralCodes)
    .where(eq(referralCodes.profileId, profileId));
  if (existing) return existing.code;

  const base = codeBase(name);
  for (let n = 10; n < 1000; n++) {
    const [row] = await db
      .insert(referralCodes)
      .values({ code: `${base}${n}`, profileId })
      .onConflictDoNothing({ target: referralCodes.code })
      .returning({ code: referralCodes.code });
    if (row) return row.code;
  }
  throw new Error(`Sem código livre para ${base}`);
}

const digits = (s: string) =>
  s.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");

export type CodeCheck =
  | { status: "ok"; code: string; referrerName: string }
  | { status: "not-found" }
  | { status: "self-referral" };

/**
 * Valida o código digitado no cadastro (STO-FR-007). Autoindicação: mesmo e-mail ou
 * mesmo celular de quem indicou (CPF/CNPJ na spec 004). Devolve só o primeiro nome
 * de quem indicou; nenhum dado de contato sai daqui (STO-SEC-005).
 */
export async function checkCode(
  db: Db,
  rawCode: string,
  applicant: { email: string; phone: string },
): Promise<CodeCheck> {
  const code = rawCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{3,20}$/.test(code)) return { status: "not-found" };
  const [row] = await db
    .select({
      code: referralCodes.code,
      active: referralCodes.active,
      campaignName: referralCodes.campaignName,
      name: profiles.name,
      email: profiles.email,
      phone: profiles.phone,
    })
    .from(referralCodes)
    .leftJoin(profiles, eq(profiles.id, referralCodes.profileId))
    .where(eq(referralCodes.code, code));
  if (!row || !row.active) return { status: "not-found" };

  const sameEmail =
    !!row.email &&
    row.email.trim().toLowerCase() === applicant.email.trim().toLowerCase();
  const applicantPhone = digits(applicant.phone);
  const samePhone =
    !!row.phone && !!applicantPhone && digits(row.phone) === applicantPhone;
  if (sameEmail || samePhone) return { status: "self-referral" };

  const referrerName = row.name
    ? row.name.trim().split(/\s+/)[0]
    : (row.campaignName ?? "CajuGo");
  return { status: "ok", code: row.code, referrerName };
}

/** Grava a indicação aceita, dentro da transação do cadastro da loja (STO-FR-007). */
export async function registerReferral(db: Db, code: string, storeId: string) {
  const [owner] = await db
    .select({ profileId: referralCodes.profileId })
    .from(referralCodes)
    .where(eq(referralCodes.code, code));
  await db.insert(referrals).values({
    code,
    referrerId: owner?.profileId ?? null,
    referredStoreId: storeId,
  });
}
