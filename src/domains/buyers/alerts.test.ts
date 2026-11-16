import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { searchAlerts } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { createAlert, requestAlert } from "./service";

const NOW = new Date("2026-11-16T10:00:00Z");
const TORO = { query: "cambio=automatico&q=Fiat+Toro", discoveryPath: null };
const input = (over: Partial<Parameters<typeof createAlert>[1]> = {}) => ({
  name: "Ana",
  phone: "5579999990000",
  search: TORO,
  ...over,
});

describe("pedir alerta de busca", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[ALR-FR-001] guarda nome, celular, busca e o consentimento, pendente", async () => {
    // Act
    const r = await createAlert(t.db, input(), NOW);

    // Assert
    expect(r).toMatchObject({ ok: true, status: "created" });
    const rows = await t.db.select().from(searchAlerts);
    expect(rows).toEqual([
      expect.objectContaining({
        status: "pending",
        name: "Ana",
        phone: "5579999990000",
        query: TORO.query,
        discoveryPath: null,
        consentAt: NOW,
        createdAt: NOW,
      }),
    ]);
  });

  it("[ALR-FR-006] mesma busca pendente do mesmo celular não duplica", async () => {
    // Arrange
    await createAlert(t.db, input(), NOW);

    // Act
    const again = await createAlert(t.db, input({ name: "Ana Paula" }), NOW);

    // Assert
    expect(again).toEqual({ ok: true, status: "duplicate" });
    expect(await t.db.select().from(searchAlerts)).toHaveLength(1);
  });

  it("[ALR-SEC-002] até 5 pendentes por celular; fechado não conta", async () => {
    // Arrange
    for (let n = 0; n < 5; n++)
      await createAlert(
        t.db,
        input({ search: { query: `q=carro+${n}`, discoveryPath: null } }),
        NOW,
      );

    // Act
    const sixth = await createAlert(
      t.db,
      input({ search: { query: "q=outro", discoveryPath: null } }),
      NOW,
    );
    await t.db
      .update(searchAlerts)
      .set({ status: "canceled", name: null, phone: null })
      .where(eq(searchAlerts.query, "q=carro+0"));
    const afterClose = await createAlert(
      t.db,
      input({ search: { query: "q=outro", discoveryPath: null } }),
      NOW,
    );

    // Assert
    expect(sixth).toEqual({ ok: false, error: "too-many" });
    expect(afterClose).toMatchObject({ ok: true, status: "created" });
  });

  describe("formulário público", () => {
    const form = (over: Record<string, unknown> = {}) => ({
      name: " Ana ",
      phone: "(79) 99999-0000",
      consent: true,
      source: null,
      query: "q=Fiat+Toro&cambio=automatico&ordem=menor-preco",
      website: "",
      ...over,
    });
    const ctx = (ipHash = "ip-a") => ({ ipHash, now: NOW });

    it("[ALR-FR-001] guarda a busca normalizada e devolve o link de cancelar", async () => {
      // Act
      const r = await requestAlert(t.db, form(), ctx());

      // Assert
      expect(r).toMatchObject({
        ok: true,
        status: "created",
        cancelPath: expect.stringMatching(
          /^\/alertas\/cancelar\/[0-9a-f-]{36}\./,
        ),
      });
      const [row] = await t.db.select().from(searchAlerts);
      expect(row).toMatchObject({
        name: "Ana",
        phone: "5579999990000",
        query: "cambio=automatico&q=Fiat+Toro",
      });
    });

    it("[ALR-SEC-002] campos inválidos, sem consentimento ou campo a mais não guardam", async () => {
      for (const [over, field] of [
        [{ phone: "(79) 3211-0000" }, "phone"],
        [{ name: "" }, "name"],
        [{ consent: false }, "consent"],
      ] as const) {
        const r = await requestAlert(t.db, form(over), ctx());
        expect(r, field).toMatchObject({ ok: false });
        expect(r.ok ? [] : r.errors.map((e) => e.field), field).toContain(
          field,
        );
      }
      expect(
        await requestAlert(t.db, form({ storeId: "loja-a" }), ctx()),
      ).toMatchObject({ ok: false });
      expect(await t.db.select().from(searchAlerts)).toEqual([]);
    });

    it("[ALR-SEC-002] robô no campo escondido: parece sucesso e nada é guardado", async () => {
      const r = await requestAlert(t.db, form({ website: "spam" }), ctx());
      expect(r).toEqual({ ok: true, status: "created", cancelPath: null });
      expect(await t.db.select().from(searchAlerts)).toEqual([]);
    });

    it("[ALR-SEC-002] limite por IP: 5 por minuto", async () => {
      for (let n = 0; n < 5; n++)
        await requestAlert(t.db, form({ phone: `(79) 99999-000${n}` }), ctx());
      const sixth = await requestAlert(
        t.db,
        form({ phone: "(79) 99999-0009" }),
        ctx(),
      );
      expect(sixth).toMatchObject({
        ok: false,
        message: "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
      });
      expect(
        await requestAlert(
          t.db,
          form({ phone: "(79) 99999-0009" }),
          ctx("ip-b"),
        ),
      ).toMatchObject({ ok: true });
    });

    it("[ALR-FR-001] catálogo de loja não tem alerta; descoberta guarda a página", async () => {
      expect(
        await requestAlert(
          t.db,
          form({ source: { kind: "store", slug: "loja-a" } }),
          ctx(),
        ),
      ).toMatchObject({ ok: false });
      expect(
        await requestAlert(
          t.db,
          form({ source: { kind: "discovery", path: "/carros/fiat/toro" } }),
          ctx(),
        ),
      ).toMatchObject({ ok: true, status: "created" });
      const [row] = await t.db.select().from(searchAlerts);
      expect(row.discoveryPath).toBe("/carros/fiat/toro");
    });

    it("[ALR-FR-006] [ALR-SEC-002] mensagens de duplicado e de limite do celular", async () => {
      await requestAlert(t.db, form(), ctx());
      expect(await requestAlert(t.db, form(), ctx("ip-b"))).toEqual({
        ok: true,
        status: "duplicate",
        cancelPath: null,
      });
      for (let n = 0; n < 4; n++)
        await requestAlert(
          t.db,
          form({ query: `q=carro+${n}` }),
          ctx(`ip-${n}x`),
        );
      expect(
        await requestAlert(t.db, form({ query: "q=outro" }), ctx("ip-z")),
      ).toMatchObject({
        ok: false,
        message:
          "Este celular já tem 5 alertas ativos. Cancele um para pedir outro.",
      });
    });
  });
});
