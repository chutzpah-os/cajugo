import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activityLog, partnerships } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { uuidv7 } from "@/platform/db/uuid";
import { contactStore, leadsBoard } from "@/domains/leads/service";
import { parseFilters, vehiclePage } from "@/domains/showcase/service";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { sellerAccount, sellerShowcase, updatePixKey } from "./service";
import { activeSeller, seller } from "./testing/fixtures";

describe("conta do vendedor [13c]", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[SEL-SEC-001] o vendedor vê o próprio CPF mascarado e a chave Pix", async () => {
    // Arrange
    const ana = await activeSeller(t.db, "ANA", { name: "Ana" });

    // Act
    const acc = await sellerAccount(t.db, ana);

    // Assert
    expect(acc).toMatchObject({
      name: "Ana",
      code: "ANA",
      cpf: expect.stringMatching(/^\d{3}\.\*\*\*\.\*\*\*-\d{2}$/),
      pix: { type: "email", key: `${ana.userId}@x.com` },
    });
  });

  it("[SEL-FR-014] troca a chave Pix válida; inválida é recusada no campo; registro sem a chave", async () => {
    // Arrange
    const ana = await activeSeller(t.db, "ANA");

    // Act
    await updatePixKey(t.db, ana, {
      pixType: "phone",
      pixKey: "(79) 98888-7777",
    });

    // Assert
    expect((await sellerAccount(t.db, ana)).pix).toEqual({
      type: "phone",
      key: "+5579988887777",
    });
    await expect(
      updatePixKey(t.db, ana, { pixType: "cpf", pixKey: "111.111.111-11" }),
    ).rejects.toMatchObject({
      status: 422,
      errors: [expect.objectContaining({ field: "pixKey" })],
    });
    const log = await t.db.select().from(activityLog);
    expect(log.map((l) => l.action)).toContain("seller.pix_changed");
    expect(JSON.stringify(log)).not.toContain("98888");
  });

  it("[SEL-FR-002] em análise não abre a conta com Pix", async () => {
    // Arrange
    const novo = await seller(t.db);

    // Act / Assert
    await expect(sellerAccount(t.db, novo)).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      updatePixKey(t.db, novo, { pixType: "email", pixKey: "a@b.com" }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("[SEL-SEC-002] a chave Pix e o CPF não saem na vitrine do vendedor, no lead nem na página do veículo", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const v = await car(t.db, a.storeId);
    const ana = await activeSeller(t.db, "ANA");
    await t.db.insert(partnerships).values({
      sellerId: ana.userId,
      storeId: a.storeId,
      origin: "request",
      status: "active",
    });
    await contactStore(
      t.db,
      {
        requestId: uuidv7(),
        vehicleId: v.id,
        origin: "cajugo",
        name: "Comprador",
        email: "c@c.com",
        phone: "(79) 99999-0000",
        website: "",
      },
      { ipHash: "ip", refCode: "ANA" },
    );
    const { pix } = await sellerAccount(t.db, ana);

    // Act
    const json = JSON.stringify([
      await sellerShowcase(t.db, ana, { filters: parseFilters({}) }),
      await leadsBoard(t.db, a, "all"),
      await vehiclePage(t.db, v.id),
    ]);

    // Assert
    expect(json).not.toContain(pix!.key);
    expect(json).not.toMatch(/\d{3}\.\*\*\*/);
  });
});
