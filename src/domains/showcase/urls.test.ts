import { describe, expect, it } from "vitest";
import { idFromVehicleParam, vehiclePath } from "./urls";

const ID = "01a1bd63-aa08-7185-b1e3-7d43560946cf";

describe("endereço do veículo", () => {
  it("[SHW-FR-008] [SHW-FR-013] id + marca, modelo, ano, cidade e UF, sem acento", () => {
    expect(
      vehiclePath({
        id: ID,
        make: "GM - Chevrolet",
        model: "ONIX",
        yearModel: 2020,
        city: "São Cristóvão",
        state: "SE",
      }),
    ).toBe(`/v/${ID}-gm-chevrolet-onix-2020-sao-cristovao-se`);
  });

  it("[SHW-FR-014] tira o id do endereço, com ou sem texto; o resto é inválido", () => {
    expect(idFromVehicleParam(`${ID}-gm-chevrolet-onix`)).toBe(ID);
    expect(idFromVehicleParam(ID)).toBe(ID);
    expect(idFromVehicleParam("abc")).toBeNull();
  });
});
