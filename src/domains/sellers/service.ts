import { and, eq, ne } from "drizzle-orm";
import { can, grantRole, type AuthDeps } from "@/domains/auth/service";
import type {
  Cloudinary,
  SignedUpload,
} from "@/platform/cloudinary/cloudinary";
import {
  checkPrivateUpload,
  PRIVATE_FORMATS,
  privateExtension,
} from "@/platform/cloudinary/private-files";
import { profiles, sellers, userRole } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { logActivity } from "@/platform/http/activity-log";
import { AppError, fieldErrorsFromZod } from "@/platform/http/errors";
import { withinPublicFormLimits } from "@/platform/http/rate-limit";
import type { PrivateFile } from "@/platform/http/private-file";
import { authorize, type Session } from "@/platform/http/session";
import { addSellerSchema, sellerSignupSchema } from "./schemas";

/**
 * Rede Caju, lado do vendedor (spec 008). O vendedor age sempre como ele mesmo
 * (`session.userId`); as decisões são da equipe da CajuGo.
 */

export type SignupContext = {
  /** IP com hash, para o limite por rede (SEL-SEC-003). */
  ipHash: string;
  /** Campo isca preenchido: robô recebe sucesso falso (SEL-SEC-003). */
  honeypotFilled?: boolean;
};

const fieldError = (field: string, code: string, message: string) =>
  AppError.validation([{ field, code, message }]);

const CPF_TAKEN = () => fieldError("cpf", "cpf_taken", "CPF já cadastrado.");

/** CPF livre, ou já da própria conta (indicador que já resgatou, 010). */
async function assertCpfFree(db: Db, cpf: string, ownerId?: string) {
  const [taken] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(
      and(
        eq(profiles.cpf, cpf),
        ownerId ? ne(profiles.id, ownerId) : undefined,
      ),
    );
  if (taken) throw CPF_TAKEN();
}

/** Vendedor `in_review` + papel + auditoria, dentro da transação do chamador. */
async function createSeller(
  tx: Db,
  userId: string,
  data: { cpf: string; city: string; pix: { type: string; key: string } },
) {
  await grantRole(tx, userId, "seller", "public-signup");
  await tx
    .update(profiles)
    .set({ cpf: data.cpf, pixKey: data.pix.key, pixKeyType: data.pix.type })
    .where(eq(profiles.id, userId));
  await tx.insert(sellers).values({ profileId: userId, city: data.city });
  await logActivity(tx, {
    userId,
    action: "seller.registered",
    entity: "seller",
    entityId: userId,
  });
}

/**
 * Cadastro do vendedor [7a] (SEL-FR-001, 016, SEL-SEC-003). Visitante: conta no
 * provedor de login e, numa transação, perfil + papel + vendedor Em análise; se a
 * transação falhar, a conta é apagada. Campo isca: sucesso falso, nada é criado.
 */
export async function registerSeller(
  deps: AuthDeps,
  session: Session | null,
  input: unknown,
  ctx: SignupContext,
): Promise<{ userId: string | null }> {
  const now = deps.now?.() ?? new Date();
  if (
    !(await withinPublicFormLimits(deps.db, "seller-signup", ctx.ipHash, now))
  )
    throw AppError.tooManyRequests(60);
  if (ctx.honeypotFilled) return { userId: null };
  if (session) return addSellerToAccount(deps.db, session, input);

  const parsed = sellerSignupSchema.safeParse(input);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));
  const data = parsed.data;

  const [existing] = await deps.db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.email, data.email));
  if (existing)
    throw fieldError(
      "email",
      "account_exists",
      "Se você já tem conta, entre para continuar.",
    );
  await assertCpfFree(deps.db, data.cpf);

  const user = await deps.auth.adminCreateUser(data.email, data.password);
  try {
    await deps.db.transaction(async (tx) => {
      await tx.insert(profiles).values({
        id: user.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
      });
      await createSeller(tx, user.id, data);
    });
    return { userId: user.id };
  } catch (error) {
    await deps.auth.adminDeleteUser(user.id);
    // Corrida com outro cadastro do mesmo CPF: o índice único decide.
    if (
      /profiles_cpf/.test(String((error as { cause?: unknown }).cause ?? error))
    )
      throw CPF_TAKEN();
    throw error;
  }
}

/**
 * Quem já tem conta (lojista, usuário da loja, indicador) vira vendedor na mesma conta
 * (SEL-FR-016, conta única do PRD §2): sem nova senha; nome, e-mail e celular vêm da
 * conta. Equipe da CajuGo não acumula papéis (AUT-SEC-009).
 */
async function addSellerToAccount(
  db: Db,
  session: Session,
  input: unknown,
): Promise<{ userId: string }> {
  if (session.roles.some((r) => r === "admin" || r === "support"))
    throw AppError.forbidden();
  if (session.roles.includes("seller"))
    throw AppError.conflict("Sua conta já é de vendedor.");
  const parsed = addSellerSchema.safeParse(input);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));
  await assertCpfFree(db, parsed.data.cpf, session.userId);
  await db.transaction((tx) => createSeller(tx, session.userId, parsed.data));
  return { userId: session.userId };
}

export type FileDeps = { db: Db; cloudinary: Cloudinary };
export type DocumentSide = "front" | "back";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SIDES: readonly DocumentSide[] = ["front", "back"];
const documentFolder = (sellerId: string) => `sellers/${sellerId}`;
const documentName = (side: DocumentSide) => `document-${side}-`;

/** O vendedor da sessão, com o status; quem não é vendedor → 403. */
async function ownSeller(db: Db, session: Session | null) {
  const s = authorize(session, ["seller"]);
  const [row] = await db
    .select()
    .from(sellers)
    .where(eq(sellers.profileId, s.userId));
  if (!row) throw AppError.forbidden();
  return row;
}

const sideOf = (raw: unknown): DocumentSide => {
  if (!SIDES.includes(raw as DocumentSide)) throw AppError.notFound();
  return raw as DocumentSide;
};

/**
 * Assinatura para o navegador enviar a foto do documento direto ao Cloudinary,
 * privada (`authenticated`), na pasta do vendedor da sessão e com nome gerado aqui
 * (SEL-FR-001, SEL-SEC-009). Só enquanto o cadastro está Em análise.
 */
export async function documentUpload(
  deps: FileDeps,
  session: Session | null,
  side: unknown,
): Promise<SignedUpload> {
  const me = await ownSeller(deps.db, session);
  if (me.status !== "in_review")
    throw AppError.conflict("O cadastro já foi analisado.");
  return deps.cloudinary.signUpload({
    folder: documentFolder(me.profileId),
    publicId: `${documentName(sideOf(side))}${crypto.randomUUID()}`,
    allowedFormats: PRIVATE_FORMATS,
    type: "authenticated",
  });
}

/**
 * Guarda a foto enviada (SEL-FR-001, SEL-SEC-009): tem que ser exatamente o nome
 * assinado para o vendedor e o lado (senão 404), foto ou PDF de até 10 MB (recusada é
 * apagada). A foto anterior do mesmo lado é apagada.
 */
export async function attachDocument(
  deps: FileDeps,
  session: Session | null,
  input: { side: unknown; publicId: unknown },
): Promise<void> {
  const me = await ownSeller(deps.db, session);
  if (me.status !== "in_review")
    throw AppError.conflict("O cadastro já foi analisado.");
  const side = sideOf(input.side);
  const prefix = deps.cloudinary.fullPublicId(
    documentFolder(me.profileId),
    documentName(side),
  );
  const publicId = typeof input.publicId === "string" ? input.publicId : "";
  if (!publicId.startsWith(prefix) || !UUID.test(publicId.slice(prefix.length)))
    throw AppError.notFound();
  const { format } = await checkPrivateUpload(
    deps.cloudinary,
    publicId,
    side,
    "Não encontramos a foto enviada. Tente de novo.",
  );
  const previous =
    side === "front" ? me.documentFrontPublicId : me.documentBackPublicId;
  await deps.db
    .update(sellers)
    .set(
      side === "front"
        ? { documentFrontPublicId: publicId, documentFrontFormat: format }
        : { documentBackPublicId: publicId, documentBackFormat: format },
    )
    .where(eq(sellers.profileId, me.profileId));
  if (previous && previous !== publicId)
    await deps.cloudinary.destroy(previous, "authenticated");
}

/**
 * Foto do documento (ADR 0011, `contract.md`): admin e suporte veem qualquer uma; o
 * vendedor só a própria. Outro papel, outro vendedor, id ou lado inválido ou sem a
 * foto → 404 (SEL-SEC-009).
 */
export async function documentFile(
  deps: FileDeps,
  session: Session | null,
  sellerId: string,
  side: unknown,
): Promise<PrivateFile> {
  const s = authorize(session, userRole.enumValues);
  const which = sideOf(side);
  if (!UUID.test(sellerId)) throw AppError.notFound();
  if (!can(s, "sellers.view") && s.userId !== sellerId)
    throw AppError.notFound();
  const [row] = await deps.db
    .select()
    .from(sellers)
    .where(eq(sellers.profileId, sellerId));
  const publicId =
    which === "front" ? row?.documentFrontPublicId : row?.documentBackPublicId;
  const format =
    which === "front" ? row?.documentFrontFormat : row?.documentBackFormat;
  if (!publicId || !format) throw AppError.notFound();
  const file = await deps.cloudinary.fetchPrivate(publicId, format);
  if (!file) throw AppError.notFound();
  return {
    ...file,
    filename: `documento-${which}.${privateExtension(format)}`,
  };
}
