import { and, eq, inArray, ne, or } from "drizzle-orm";
import {
  profiles,
  referralCodes,
  referrals,
  stores,
} from "@/platform/db/schema";
import { logActivity } from "@/platform/http/activity-log";
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

/** Código pessoal já criado, para mostrar a quem é dono dele (STO-FR-014). */
export async function codeOf(
  db: Db,
  profileId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ code: referralCodes.code })
    .from(referralCodes)
    .where(eq(referralCodes.profileId, profileId));
  return row?.code ?? null;
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

/** Indicações que ainda podem render (as encerradas ou já rejeitadas ficam como estão). */
const LIVE_REFERRAL = ["invited", "registered", "active", "paused"] as const;

/**
 * CPF/CNPJ de alguém: hoje, os documentos das lojas de que é dono (spec 004); o CPF
 * do vendedor e do indicador entra aqui quando existir (specs 008 e 010).
 */
async function taxIdsOf(db: Db, profileId: string, exceptStoreId?: string) {
  const rows = await db
    .select({ taxId: stores.taxId })
    .from(stores)
    .where(
      and(
        eq(stores.ownerId, profileId),
        exceptStoreId ? ne(stores.id, exceptStoreId) : undefined,
      ),
    );
  return new Set(rows.map((r) => r.taxId).filter((t): t is string => !!t));
}

/**
 * Autoindicação por CPF/CNPJ (PIX-FR-003), chamada quando a loja grava o documento.
 * Confere nos dois sentidos: a indicação desta loja contra os documentos de quem
 * indicou, e as indicações feitas pelo dono desta loja contra o documento das lojas
 * indicadas. Igual → `rejected` (`self_referral`); nada aparece para o indicado. O
 * log guarda só o motivo, nunca o documento (SECURITY.md §8).
 */
export async function rejectSelfReferralsByTaxId(
  db: Db,
  storeId: string,
): Promise<void> {
  const [store] = await db
    .select({ taxId: stores.taxId, ownerId: stores.ownerId })
    .from(stores)
    .where(eq(stores.id, storeId));
  if (!store?.taxId) return;

  const toReject: string[] = [];
  const [own] = await db
    .select({ id: referrals.id, referrerId: referrals.referrerId })
    .from(referrals)
    .where(
      and(
        eq(referrals.referredStoreId, storeId),
        inArray(referrals.status, LIVE_REFERRAL),
      ),
    );
  if (
    own?.referrerId &&
    (await taxIdsOf(db, own.referrerId, storeId)).has(store.taxId)
  )
    toReject.push(own.id);

  const made = await db
    .select({ id: referrals.id, taxId: stores.taxId })
    .from(referrals)
    .innerJoin(stores, eq(stores.id, referrals.referredStoreId))
    .where(
      and(
        eq(referrals.referrerId, store.ownerId),
        inArray(referrals.status, LIVE_REFERRAL),
        ne(referrals.referredStoreId, storeId),
      ),
    );
  for (const r of made) if (r.taxId === store.taxId) toReject.push(r.id);

  if (!toReject.length) return;
  await db
    .update(referrals)
    .set({ status: "rejected", rejectReason: "self_referral" })
    .where(inArray(referrals.id, toReject));
  for (const id of toReject)
    await logActivity(db, {
      userId: null,
      action: "referral.rejected",
      entity: "referral",
      entityId: id,
      data: { reason: "self_referral" },
    });
}

/**
 * Só testes (limpeza dos e2e de cadastro): apaga indicações que envolvem essas contas
 * ou lojas e os códigos dessas contas, dentro da transação do chamador.
 */
export async function removeReferralData(
  db: Db,
  profileIds: string[],
  storeIds: string[],
) {
  const codes = profileIds.length
    ? (
        await db
          .select({ code: referralCodes.code })
          .from(referralCodes)
          .where(inArray(referralCodes.profileId, profileIds))
      ).map((c) => c.code)
    : [];
  const filters = [];
  if (storeIds.length)
    filters.push(inArray(referrals.referredStoreId, storeIds));
  if (codes.length) filters.push(inArray(referrals.code, codes));
  if (filters.length) await db.delete(referrals).where(or(...filters));
  if (codes.length)
    await db.delete(referralCodes).where(inArray(referralCodes.code, codes));
}
