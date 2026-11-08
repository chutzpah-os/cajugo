import { eq } from "drizzle-orm";
import { profiles, settingValues, stores } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { uuidv7 } from "@/platform/db/uuid";
import type { Role, Session } from "@/platform/http/session";
import { FakeAuthProvider } from "@/platform/supabase/fake-auth-provider";
import { registerStore } from "@/domains/stores/service";

/** Só testes: lojista com loja `registered` e a sessão dele. */
export async function storeOwner(
  db: Db,
  slug: string,
  email: string,
  extra: { referralCode?: string; name?: string } = {},
): Promise<Session & { storeId: string }> {
  const { userId, storeId } = await registerStore(
    { db, auth: new FakeAuthProvider() },
    null,
    {
      storeName: `Loja ${slug}`,
      city: "Aracaju",
      state: "SE",
      whatsapp: "79981360206",
      slug,
      name: extra.name ?? "Dono",
      email,
      phone: `7998${Math.floor(1000000 + Math.random() * 8999999)}`,
      password: "senha-forte-1",
      terms: true,
      ...(extra.referralCode ? { referralCode: extra.referralCode } : {}),
    },
    { ipHash: crypto.randomUUID() },
  );
  return {
    userId,
    roles: ["store_owner"],
    activeRole: "store_owner",
    storeId,
    mustChangePassword: false,
  };
}

/** Só testes: alguém com um papel da equipe ou da loja. */
export async function personWith(
  db: Db,
  role: Role,
  storeId: string | null = null,
): Promise<Session> {
  const id = uuidv7();
  await db.insert(profiles).values({
    id,
    email: `${id}@x.com`,
    name: `Pessoa ${role}`,
    roles: [role],
    storeId,
  });
  return {
    userId: id,
    roles: [role],
    activeRole: role,
    storeId,
    mustChangePassword: false,
  };
}

export const PIX = {
  type: "email",
  key: "pix@cajugo.com",
  beneficiary: "CajuGo Tecnologia",
  city: "Aracaju",
} as const;

/** Só testes: chave Pix configurada nas regras. */
export async function configurePix(db: Db, at = new Date("2001-01-01")) {
  await db
    .insert(settingValues)
    .values({ key: "pix", value: PIX, validFrom: at });
}

export async function storeRow(db: Db, storeId: string) {
  const [s] = await db.select().from(stores).where(eq(stores.id, storeId));
  return s;
}
