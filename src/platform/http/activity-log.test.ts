import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { activityLog } from "../db/schema";
import { createTestDb } from "../db/testing/test-db";
import { logActivity } from "./activity-log";

describe("activity log", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  it("grava quem, o quê, em qual entidade e quando", async () => {
    // Act
    await logActivity(t.db, {
      userId: "0192f1e0-0000-7000-8000-000000000001",
      action: "store.suspended",
      entity: "store",
      entityId: "s1",
      data: { daysPastDue: 12 },
    });

    // Assert
    const [row] = await t.db.select().from(activityLog);
    expect(row).toMatchObject({
      action: "store.suspended",
      entity: "store",
      entityId: "s1",
      data: { daysPastDue: 12 },
    });
    expect(row.createdAt).toBeInstanceOf(Date);
  });
});
