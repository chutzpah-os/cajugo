import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach, describe, expect, it } from "vitest";
import * as schema from "./schema";

/** Copia `drizzle/` mantendo só as primeiras `count` migrations no journal. */
function migrationsUpTo(count: number) {
  const dir = mkdtempSync(join(tmpdir(), "cajugo-migrations-"));
  cpSync("drizzle", dir, { recursive: true });
  const journalPath = join(dir, "meta", "_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8"));
  journal.entries = journal.entries.slice(0, count);
  writeFileSync(journalPath, JSON.stringify(journal));
  return dir;
}

describe("migrations", () => {
  const cleanup: Array<() => unknown> = [];
  afterEach(async () => {
    for (const fn of cleanup.splice(0)) await fn();
  });

  it("[AUT-SEC-002] 0002 copia o papel antigo para a lista de papéis, sem dar papéis novos", async () => {
    // Arrange: banco no estado anterior à 0002, com um lojista e um admin no formato antigo
    const client = new PGlite();
    const db = drizzle(client, { schema });
    const before = migrationsUpTo(2);
    cleanup.push(
      () => client.close(),
      () => rmSync(before, { recursive: true }),
    );
    await migrate(db, { migrationsFolder: before });
    await client.query(
      `insert into profiles (id, name, email, role) values
        ('0192f1e0-0000-7000-8000-000000000001', 'Lojista', 'l@example.com', 'store_owner'),
        ('0192f1e0-0000-7000-8000-000000000002', 'Admin', 'a@example.com', 'admin')`,
    );

    // Act
    await migrate(db, { migrationsFolder: "drizzle" });

    // Assert
    const { rows } = await client.query<{ email: string; roles: string }>(
      "select email, roles::text as roles from profiles order by email",
    );
    expect(rows).toEqual([
      { email: "a@example.com", roles: "{admin}" },
      { email: "l@example.com", roles: "{store_owner}" },
    ]);
  });

  it("loja nova nasce com status 'registered'", async () => {
    const client = new PGlite();
    const db = drizzle(client, { schema });
    cleanup.push(() => client.close());
    await migrate(db, { migrationsFolder: "drizzle" });
    const { rows } = await client.query<{ column_default: string }>(
      "select column_default from information_schema.columns where table_name = 'stores' and column_name = 'status'",
    );
    expect(rows[0].column_default).toContain("registered");
  });

  it("0003 remove a coluna antiga profiles.role, mantendo os papéis já copiados", async () => {
    const client = new PGlite();
    const db = drizzle(client, { schema });
    cleanup.push(() => client.close());
    await migrate(db, { migrationsFolder: "drizzle" });
    const { rows } = await client.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_name = 'profiles' and column_name in ('role', 'roles')",
    );
    expect(rows.map((r) => r.column_name)).toEqual(["roles"]);
  });

  it("[AUT-SEC-009] o banco recusa conta que mistura papel de equipe com papel de cliente", async () => {
    // Arrange
    const client = new PGlite();
    const db = drizzle(client, { schema });
    cleanup.push(() => client.close());
    await migrate(db, { migrationsFolder: "drizzle" });
    const insert = (id: string, roles: string) =>
      client.query(
        `insert into profiles (id, name, email, roles) values ($1, 'X', $2, $3::user_role[])`,
        [id, `${id}@x.com`, roles],
      );

    // Act / Assert
    await expect(
      insert("0192f1e0-0000-7000-8000-000000000011", "{admin,seller}"),
    ).rejects.toThrow(/profiles_team_roles_separate/);
    await insert("0192f1e0-0000-7000-8000-000000000012", "{admin,support}");
    await insert("0192f1e0-0000-7000-8000-000000000013", "{seller,referrer}");
  });

  describe("0005 e 0008 regras configuráveis", () => {
    async function migrated() {
      const client = new PGlite();
      const db = drizzle(client, { schema });
      cleanup.push(() => client.close());
      await migrate(db, { migrationsFolder: "drizzle" });
      return client;
    }

    it("[CFG-FR-003] já vem com o valor provisório de cada regra (chave Pix vazia)", async () => {
      // Arrange
      const client = await migrated();

      // Act
      const { rows } = await client.query<{ key: string; value: unknown }>(
        "select key, value from setting_values order by key",
      );

      // Assert
      expect(Object.fromEntries(rows.map((r) => [r.key, r.value]))).toEqual({
        cajugo_fee_bps: 100,
        installment_rate_bps: 179,
        min_photos: 6,
        membership_cents: 10000,
        past_due_tolerance_days: 5,
        payout_min_cents: 5000,
        pix: null,
        referral_enabled: true,
        referral_months: 3,
        referral_pct_bps: 3000,
        referral_who: { store_owner: true, seller: true, referrer: true },
        require_approval: false,
        retention_days: 90,
        review_business_days: 1,
        support_whatsapp: "557981360206",
      });
    });

    it("[CFG-SEC-003] o histórico não pode ser editado nem apagado", async () => {
      const client = await migrated();

      await expect(
        client.query(
          "update setting_values set value = '2' where key = 'min_photos'",
        ),
      ).rejects.toThrow(/só de inserção/);
      await expect(
        client.query("delete from setting_values where key = 'min_photos'"),
      ).rejects.toThrow(/só de inserção/);
      await client.query(
        "insert into setting_values (id, key, value) values (gen_random_uuid(), 'min_photos', '8')",
      );
    });
  });

  describe("0006 cadastro do lojista", () => {
    async function migrated() {
      const client = new PGlite();
      const db = drizzle(client, { schema });
      cleanup.push(() => client.close());
      await migrate(db, { migrationsFolder: "drizzle" });
      return client;
    }
    const columns = async (client: PGlite, table: string) =>
      (
        await client.query<{ column_name: string }>(
          "select column_name from information_schema.columns where table_name = $1",
          [table],
        )
      ).rows.map((r) => r.column_name);

    it("[STO-FR-008] [STO-FR-013] loja com endereço em campos, sem a coluna antiga, e redirecionamentos", async () => {
      // Arrange / Act
      const client = await migrated();

      // Assert
      const store = await columns(client, "stores");
      expect(store).toEqual(
        expect.arrayContaining([
          "address_street",
          "address_number",
          "address_complement",
          "address_district",
          "address_zip",
          "slug_changed_at",
          "slug_reserved_until",
        ]),
      );
      expect(store).not.toContain("address");
      expect(await columns(client, "store_slug_redirects")).toEqual(
        expect.arrayContaining(["old_slug", "store_id", "expires_at"]),
      );
    });

    it("[STO-FR-007] [STO-FR-014] códigos de indicação e uma indicação por loja", async () => {
      // Arrange
      const client = await migrated();
      const owner = "0192f1e0-0000-7000-8000-000000000031";
      const store = "0192f1e0-0000-7000-8000-000000000032";
      await client.query(
        "insert into profiles (id, name, email, roles) values ($1, 'Ricardo', 'r@x.com', '{referrer}')",
        [owner],
      );
      await client.query(
        "insert into stores (id, name, slug, city, state, whatsapp, owner_id) values ($1, 'Loja', 'loja', 'Aracaju', 'SE', '5579999999999', $2)",
        [store, owner],
      );
      await client.query(
        "insert into referral_codes (code, profile_id) values ('RICARDO10', $1)",
        [owner],
      );
      const refer = () =>
        client.query(
          "insert into referrals (id, code, referrer_id, referred_store_id) values (gen_random_uuid(), 'RICARDO10', $1, $2)",
          [owner, store],
        );

      // Act
      await refer();

      // Assert: status inicial "registered" e a mesma loja não é indicada duas vezes
      const { rows } = await client.query<{ status: string }>(
        "select status from referrals",
      );
      expect(rows).toEqual([{ status: "registered" }]);
      await expect(refer()).rejects.toThrow();
      await expect(
        client.query(
          "insert into referral_codes (code, profile_id) values ('OUTRO10', $1)",
          [owner],
        ),
      ).rejects.toThrow();
    });
  });
});
