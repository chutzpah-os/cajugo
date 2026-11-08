import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { notices, profiles } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { uuidv7 } from "@/platform/db/uuid";
import type { Session } from "@/platform/http/session";
import { dismissNotice, noticesFor, notify } from "./service";

describe("avisos no painel", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  async function person(email: string): Promise<Session> {
    const id = uuidv7();
    await t.db.insert(profiles).values({ id, email, name: email });
    return {
      userId: id,
      roles: ["store_owner"],
      activeRole: "store_owner",
      storeId: null,
      mustChangePassword: false,
    };
  }

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(() => t.close());

  it("[PIX-FR-013] o lojista vê os avisos dele, do mais recente ao mais antigo, com a frase pronta", async () => {
    // Arrange
    const a = await person("a@x.com");
    await notify(
      t.db,
      a.userId,
      {
        kind: "payment_rejected",
        reason: "Valor divergente",
        missingCents: 1000,
      },
      new Date("2026-11-08T10:00:00Z"),
    );
    await notify(
      t.db,
      a.userId,
      { kind: "payment_confirmed" },
      new Date("2026-11-08T11:00:00Z"),
    );

    // Act
    const list = await noticesFor(t.db, a);

    // Assert
    expect(list.map((n) => n.text)).toEqual([
      "Pagamento confirmado. Sua loja está no ar.",
      "Comprovante recusado: Valor divergente. Faltam R$ 10,00.",
    ]);
    expect(list[1].tone).toBe("alert");
  });

  it("[PIX-FR-013] dispensado não aparece mais", async () => {
    const a = await person("a@x.com");
    await notify(t.db, a.userId, { kind: "payment_confirmed" });
    const [n] = await noticesFor(t.db, a);

    await dismissNotice(t.db, a, n.id);

    expect(await noticesFor(t.db, a)).toEqual([]);
  });

  it("[PIX-SEC-001] ninguém vê nem dispensa o aviso de outra pessoa", async () => {
    // Arrange
    const a = await person("a@x.com");
    const b = await person("b@x.com");
    await notify(t.db, a.userId, { kind: "payment_confirmed" });
    const [n] = await noticesFor(t.db, a);

    // Act + Assert
    expect(await noticesFor(t.db, b)).toEqual([]);
    await expect(dismissNotice(t.db, b, n.id)).rejects.toMatchObject({
      status: 404,
    });
    const [row] = await t.db.select().from(notices);
    expect(row.dismissedAt).toBeNull();
    await expect(noticesFor(t.db, null)).rejects.toMatchObject({ status: 401 });
  });

  it("[PIX-SEC-001] id inválido ao dispensar é 404", async () => {
    const a = await person("a@x.com");

    await expect(dismissNotice(t.db, a, "nao-e-uuid")).rejects.toMatchObject({
      status: 404,
    });
  });
});
