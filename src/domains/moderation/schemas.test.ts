import { describe, expect, it } from "vitest";
import { fieldErrorsFromZod } from "@/platform/http/errors";
import { hideSchema, reportSchema } from "./schemas";
import { HIDE_REASONS, REASON_LABEL, REPORT_REASONS } from "./reasons";

const VEHICLE = "0192f1e0-0000-7000-8000-00000000000a";
const VALID = {
  requestId: "0192f1e0-0000-7000-8000-0000000000ff",
  vehicleId: VEHICLE,
  reason: "wrong_photos",
  details: "A placa da foto é de outro veículo",
  website: "",
};

const errors = (
  schema: typeof reportSchema | typeof hideSchema,
  v: unknown,
) => {
  const r = schema.safeParse(v);
  return r.success
    ? []
    : fieldErrorsFromZod(r.error).map(({ field, message }) => ({
        field,
        message,
      }));
};

describe("formulário de denúncia [14d]", () => {
  it("[RPT-FR-001] [PRO-FR-010] os 5 motivos da denúncia, com rótulo", () => {
    // Assert
    expect(REPORT_REASONS.map((r) => REASON_LABEL[r])).toEqual([
      "Já vendido",
      "Preço não real",
      "Fotos de outro carro",
      "Suspeita de golpe",
      "Procedência ou sinistro omitido",
    ]);
  });

  it("[RPT-FR-001] aceita motivo e descrição; sem motivo, 'Escolha um motivo.'", () => {
    // Act
    const ok = reportSchema.parse(VALID);
    const missing = errors(reportSchema, { ...VALID, reason: undefined });
    const empty = errors(reportSchema, { ...VALID, reason: "" });

    // Assert
    expect(ok.details).toBe("A placa da foto é de outro veículo");
    expect(missing).toEqual([
      { field: "reason", message: "Escolha um motivo." },
    ]);
    expect(empty).toEqual([{ field: "reason", message: "Escolha um motivo." }]);
  });

  it("[RPT-SEC-002] descrição até 1.000, 'Outro' recusado e sem campo a mais", () => {
    // Act / Assert
    expect(
      errors(reportSchema, { ...VALID, details: "a".repeat(1000) }),
    ).toEqual([]);
    expect(
      errors(reportSchema, { ...VALID, details: "a".repeat(1001) }).map(
        (e) => e.field,
      ),
    ).toEqual(["details"]);
    expect(reportSchema.safeParse({ ...VALID, reason: "other" }).success).toBe(
      false,
    );
    expect(reportSchema.safeParse({ ...VALID, status: "kept" }).success).toBe(
      false,
    );
    expect(
      reportSchema.safeParse({ ...VALID, requestId: crypto.randomUUID() })
        .success,
    ).toBe(false);
  });
});

describe("Ocultar [6f]", () => {
  it("[RPT-FR-004] 6 motivos; 'Outro' exige nota de até 200 caracteres", () => {
    // Act / Assert
    expect(HIDE_REASONS.map((r) => REASON_LABEL[r])).toEqual([
      "Já vendido",
      "Preço não real",
      "Fotos de outro carro",
      "Suspeita de golpe",
      "Procedência ou sinistro omitido",
      "Outro",
    ]);
    expect(
      hideSchema.parse({ vehicleId: VEHICLE, reason: "unreal_price" }),
    ).toMatchObject({ reason: "unreal_price" });
    expect(errors(hideSchema, { vehicleId: VEHICLE })).toEqual([
      { field: "reason", message: "Escolha um motivo." },
    ]);
    expect(
      errors(hideSchema, { vehicleId: VEHICLE, reason: "other", note: " " }),
    ).toEqual([{ field: "note", message: "Descreva o motivo." }]);
    expect(
      errors(hideSchema, {
        vehicleId: VEHICLE,
        reason: "other",
        note: "a".repeat(201),
      }).map((e) => e.field),
    ).toEqual(["note"]);
    expect(
      hideSchema.parse({
        vehicleId: VEHICLE,
        reason: "other",
        note: "Duplicado",
      }),
    ).toMatchObject({ note: "Duplicado" });
  });
});
