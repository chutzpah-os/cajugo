import { describe, expect, it } from "vitest";
import { fieldErrorsFromZod } from "@/platform/http/errors";
import { feeFor } from "./commission";
import {
  commissionOverrideSchema,
  confirmSaleSchema,
  networkRulesSchema,
  partnershipDecisionSchema,
} from "./schemas";

const ID = "0192f1e0-0000-7000-8000-00000000000a";
const errs = (r: { success: boolean; error?: unknown }) =>
  r.success
    ? []
    : fieldErrorsFromZod(r.error as never).map((e) => [e.field, e.message]);

describe("regras da loja na Rede Caju", () => {
  it("[RCL-FR-002] comissão padrão em % (até 10%) ou fixo (até R$ 10.000)", () => {
    // Act / Assert
    expect(
      networkRulesSchema.parse({
        acceptsSellers: true,
        commissionType: "pct",
        commissionValue: 200,
      }),
    ).toEqual({
      acceptsSellers: true,
      commissionType: "pct",
      commissionValue: 200,
    });
    expect(
      errs(
        networkRulesSchema.safeParse({
          acceptsSellers: true,
          commissionType: "pct",
          commissionValue: 1200,
        }),
      ),
    ).toEqual([["commissionValue", "Use até 10%."]]);
    expect(
      errs(
        networkRulesSchema.safeParse({
          acceptsSellers: true,
          commissionType: "fixed",
          commissionValue: 1_200_000,
        }),
      ),
    ).toEqual([["commissionValue", "Use até R$ 10.000."]]);
  });

  it("[RCL-FR-003] ajuste por veículo nos mesmos limites; nulo remove", () => {
    // Act / Assert
    expect(
      commissionOverrideSchema.parse({
        vehicleId: ID,
        type: "fixed",
        value: 150_000,
      }),
    ).toMatchObject({ type: "fixed", value: 150_000 });
    expect(
      commissionOverrideSchema.parse({
        vehicleId: ID,
        type: null,
        value: null,
      }),
    ).toMatchObject({ type: null, value: null });
    expect(
      commissionOverrideSchema.safeParse({
        vehicleId: ID,
        type: "pct",
        value: 1001,
      }).success,
    ).toBe(false);
  });

  it("[RCL-SEC-003] venda: só valor final como número, sem comissão, taxa nem status", () => {
    // Arrange
    const ok = {
      vehicleId: ID,
      finalPriceCents: 5_800_000,
      attribution: "link",
      sellerId: ID,
      commissionPaid: false,
    };

    // Act / Assert
    expect(confirmSaleSchema.safeParse(ok).success).toBe(true);
    for (const extra of [
      { commissionCents: 1 },
      { feeCents: 1 },
      { status: "paid" },
    ])
      expect(confirmSaleSchema.safeParse({ ...ok, ...extra }).success).toBe(
        false,
      );
    expect(
      errs(confirmSaleSchema.safeParse({ ...ok, finalPriceCents: undefined })),
    ).toEqual([["finalPriceCents", "Informe o valor final."]]);
    expect(
      partnershipDecisionSchema.safeParse({
        partnershipId: ID,
        decision: "approve",
      }).success,
    ).toBe(true);
  });

  it("[RCL-FR-010] taxa CajuGo: pontos-base sobre o valor final", () => {
    // Act / Assert
    expect(feeFor(5_800_000, 100)).toBe(58_000);
    expect(feeFor(6_000_000, 150)).toBe(90_000);
  });
});
