import { describe, expect, it } from "vitest";
import { CANCEL_REASONS, cancelSchema } from "./cancel-reasons";

describe("motivos do cancelamento", () => {
  it("[CAN-FR-002] o motivo é opcional e só da lista", () => {
    // Arrange
    const [first] = CANCEL_REASONS;

    // Act
    const none = cancelSchema.safeParse({});
    const listed = cancelSchema.safeParse({ reason: first });
    const other = cancelSchema.safeParse({ reason: "qualquer coisa" });
    const extra = cancelSchema.safeParse({ reason: first, storeId: "x" });

    // Assert
    expect(CANCEL_REASONS).toContain("Vou parar de vender");
    expect(none.success && none.data.reason).toBeUndefined();
    expect(listed.success && listed.data.reason).toBe(first);
    expect(other.success).toBe(false);
    expect(extra.success).toBe(false);
  });
});
