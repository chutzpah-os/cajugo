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
});
