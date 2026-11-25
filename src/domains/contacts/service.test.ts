import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { activityLog, contactRequests, profiles } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import type { Role, Session } from "@/platform/http/session";
import {
  contactInbox,
  markContactHandled,
  pendingContactsCount,
  purgeExpiredContacts,
  requestContact,
} from "./service";

const NOW = new Date("2026-11-25T12:00:00Z");
const ADMIN_ID = "0192f1e0-0000-7000-8000-0000000000a1";
const IP = { ipHash: "rede-1" };

const session = (roles: Role[]): Session => ({
  userId: ADMIN_ID,
  roles,
  activeRole: roles[0],
  storeId: roles.includes("store_owner") ? "loja-a" : null,
  mustChangePassword: false,
});

const auction = {
  topic: "auction_waitlist",
  name: "Ana Lima",
  phone: "(79) 99999-0000",
  consent: true,
};

describe("pedidos de contato", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
    await t.db.insert(profiles).values({
      id: ADMIN_ID,
      name: "Admin",
      email: "admin@x.com",
      roles: ["admin"],
    });
  });
  afterEach(async () => {
    await t.close();
  });

  const rows = () => t.db.select().from(contactRequests);

  it("[HOM-FR-008] Quero ser avisado do leilão grava o pedido para o admin", async () => {
    // Act
    const result = await requestContact(t.db, auction, IP, NOW);

    // Assert
    expect(result).toEqual({ ok: true });
    expect(await rows()).toMatchObject([
      {
        topic: "auction_waitlist",
        status: "pending",
        name: "Ana Lima",
        phone: "5579999990000",
        email: null,
      },
    ]);
  });

  it("[AUT-FR-013] Esqueci a senha pede o e-mail da conta", async () => {
    // Act
    const missing = await requestContact(
      t.db,
      { ...auction, topic: "password_help" },
      IP,
      NOW,
    );
    const ok = await requestContact(
      t.db,
      { ...auction, topic: "password_help", email: "Ana@X.com" },
      IP,
      NOW,
    );

    // Assert
    expect(missing).toMatchObject({
      ok: false,
      errors: [expect.objectContaining({ field: "email" })],
    });
    expect(ok).toEqual({ ok: true });
    expect(await rows()).toMatchObject([
      { topic: "password_help", email: "ana@x.com" },
    ]);
  });

  it("[HOM-SEC-001] campo isca finge sucesso sem gravar; sem aceite não grava", async () => {
    // Act
    const bot = await requestContact(
      t.db,
      { ...auction, website: "spam" },
      IP,
      NOW,
    );
    const noConsent = await requestContact(
      t.db,
      { ...auction, consent: false },
      IP,
      NOW,
    );

    // Assert
    expect(bot).toEqual({ ok: true });
    expect(noConsent.ok).toBe(false);
    expect(await rows()).toHaveLength(0);
  });

  it("[HOM-SEC-001] a mesma rede passa do limite e o pedido não é criado", async () => {
    // Arrange
    const results = [];
    for (let i = 0; i < 12; i++)
      results.push(await requestContact(t.db, auction, IP, NOW));

    // Assert
    expect(results.at(-1)?.ok).toBe(false);
    expect((await rows()).length).toBeLessThan(12);
  });

  it("[HOM-FR-009] o admin vê os pendentes com o WhatsApp da pessoa e o contador", async () => {
    // Arrange
    await requestContact(t.db, auction, IP, NOW);

    // Act
    const inbox = await contactInbox(t.db, session(["support"]));
    const n = await pendingContactsCount(t.db, session(["admin"]));

    // Assert
    expect(inbox).toMatchObject([
      {
        topicLabel: "Leilão · quer ser avisado",
        name: "Ana Lima",
        phone: "5579999990000",
      },
    ]);
    expect(inbox[0].whatsappUrl).toMatch(/^https:\/\/wa\.me\/5579999990000\?/);
    expect(n).toBe(1);
  });

  it("[HOM-SEC-001] fora da equipe não vê os pedidos nem o contador", async () => {
    // Arrange
    await requestContact(t.db, auction, IP, NOW);

    // Act / Assert
    await expect(
      contactInbox(t.db, session(["store_owner"])),
    ).rejects.toMatchObject({ status: 403 });
    await expect(contactInbox(t.db, null)).rejects.toBeTruthy();
    expect(await pendingContactsCount(t.db, session(["seller"]))).toBe(0);
  });

  it("[HOM-FR-009] [HOM-SEC-001] atendido: apaga nome, celular e e-mail e registra sem dado pessoal", async () => {
    // Arrange
    await requestContact(t.db, auction, IP, NOW);
    const [{ id }] = await rows();

    // Act
    const ok = await markContactHandled(
      t.db,
      session(["admin"]),
      { requestId: id },
      NOW,
    );
    const again = await markContactHandled(
      t.db,
      session(["admin"]),
      { requestId: id },
      NOW,
    );

    // Assert
    expect(ok).toBe(true);
    expect(again).toBe(false);
    expect(await rows()).toMatchObject([
      {
        status: "handled",
        name: null,
        phone: null,
        email: null,
        handledBy: ADMIN_ID,
      },
    ]);
    const [log] = await t.db
      .select()
      .from(activityLog)
      .where(eq(activityLog.entityId, id));
    expect(log).toMatchObject({ action: "contact_request.handled" });
    expect(JSON.stringify(log)).not.toMatch(/Ana|99999/);
  });

  it("[HOM-SEC-001] pendente há mais de 90 dias vence e perde os dados", async () => {
    // Arrange
    await requestContact(t.db, auction, IP, new Date("2026-08-01T12:00:00Z"));
    await requestContact(t.db, auction, { ipHash: "rede-2" }, NOW);

    // Act
    const purged = await purgeExpiredContacts(t.db, NOW);

    // Assert
    expect(purged).toBe(1);
    const all = await rows();
    expect(all.filter((r) => r.status === "expired")).toMatchObject([
      { name: null, phone: null },
    ]);
    expect(all.filter((r) => r.status === "pending")).toHaveLength(1);
  });
});
