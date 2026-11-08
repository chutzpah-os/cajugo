import { describe, expect, it } from "vitest";
import { createCloudinary, signParams } from "./cloudinary";
import { FakeCloudinary } from "./fake-cloudinary";

const config = {
  cloudName: "demo",
  apiKey: "123",
  apiSecret: "abcd",
  folder: "staging",
};

describe("Cloudinary", () => {
  it("[STO-SEC-004] assina os parâmetros como o Cloudinary (exemplo da documentação)", () => {
    // Exemplo oficial: https://cloudinary.com/documentation/authentication_signatures
    expect(
      signParams(
        {
          eager: "w_400,h_300,c_pad|w_260,h_200,c_crop",
          public_id: "sample_image",
          timestamp: 1315060510,
        },
        "abcd",
      ),
    ).toBe("bfd09f95f331f558cbd1320e67aa8d488770583e");
  });

  it("[STO-SEC-004] a assinatura fixa pasta, nome do arquivo e formatos; o segredo não sai", () => {
    // Arrange
    const cloud = createCloudinary(config);

    // Act
    const signed = cloud.signUpload({
      folder: "stores/loja-1",
      publicId: "logo-abc",
      allowedFormats: ["jpg", "png", "webp", "heic"],
      now: new Date("2026-11-08T12:00:00Z"),
    });

    // Assert
    expect(signed).toMatchObject({
      cloudName: "demo",
      apiKey: "123",
      fields: {
        folder: "staging/stores/loja-1",
        public_id: "logo-abc",
        allowed_formats: "jpg,png,webp,heic",
        timestamp: "1794139200",
      },
    });
    expect(signed.fields.signature).toBe(
      signParams(
        {
          allowed_formats: "jpg,png,webp,heic",
          folder: "staging/stores/loja-1",
          public_id: "logo-abc",
          timestamp: 1794139200,
        },
        "abcd",
      ),
    );
    expect(JSON.stringify(signed)).not.toContain("abcd");
  });

  it("[STO-SEC-004] o publicId completo inclui a pasta do ambiente", () => {
    const cloud = createCloudinary(config);

    expect(cloud.fullPublicId("stores/loja-1", "logo-abc")).toBe(
      "staging/stores/loja-1/logo-abc",
    );
  });

  it("monta a URL de entrega otimizada", () => {
    const cloud = createCloudinary(config);

    expect(
      cloud.imageUrl("staging/stores/loja-1/logo-abc", { width: 200 }),
    ).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_200/staging/stores/loja-1/logo-abc",
    );
  });

  it("[STO-SEC-004] o falso registra só os envios que ele mesmo assinou", async () => {
    // Arrange
    const fake = new FakeCloudinary();
    const signed = fake.signUpload({
      folder: "stores/loja-1",
      publicId: "logo-abc",
      allowedFormats: ["jpg"],
    });
    fake.simulateUpload(signed, { format: "jpg", bytes: 2048 });

    // Act / Assert
    expect(await fake.verifyUpload("staging/stores/loja-1/logo-abc")).toEqual({
      format: "jpg",
      bytes: 2048,
    });
    expect(await fake.verifyUpload("staging/stores/outra/logo")).toBeNull();
  });
});
