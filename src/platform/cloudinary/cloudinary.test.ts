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

  describe("arquivos privados (ADR 0011)", () => {
    /** fetch falso que guarda as chamadas e responde o que o teste mandar. */
    function recorder(respond: (url: URL) => Response) {
      const calls: { url: URL; init?: RequestInit }[] = [];
      const fetchFn = (async (input: string | URL, init?: RequestInit) => {
        const url = new URL(String(input));
        calls.push({ url, init });
        return respond(url);
      }) as typeof fetch;
      return { calls, fetchFn };
    }

    it("[PIX-SEC-002] o envio privado assina type=authenticated e aceita PDF", () => {
      const cloud = createCloudinary(config);

      const signed = cloud.signUpload({
        folder: "receipts/loja-1",
        publicId: "receipt-abc",
        allowedFormats: ["jpg", "png", "webp", "heic", "pdf"],
        type: "authenticated",
        now: new Date("2026-11-08T12:00:00Z"),
      });

      expect(signed.fields.type).toBe("authenticated");
      expect(signed.fields.signature).toBe(
        signParams(
          {
            allowed_formats: "jpg,png,webp,heic,pdf",
            folder: "staging/receipts/loja-1",
            public_id: "receipt-abc",
            timestamp: 1794139200,
            type: "authenticated",
          },
          "abcd",
        ),
      );
    });

    it("[PIX-SEC-002] confere o envio privado no endereço do tipo authenticated", async () => {
      const { calls, fetchFn } = recorder(() =>
        Response.json({ format: "pdf", bytes: 1234 }),
      );
      const cloud = createCloudinary(config, fetchFn);

      const image = await cloud.verifyUpload(
        "staging/receipts/loja-1/receipt-abc",
        "authenticated",
      );

      expect(image).toEqual({ format: "pdf", bytes: 1234 });
      expect(calls[0].url.pathname).toBe(
        "/v1_1/demo/resources/image/authenticated/staging/receipts/loja-1/receipt-abc",
      );
    });

    it("[PIX-SEC-002] apaga o arquivo recusado com pedido assinado", async () => {
      const { calls, fetchFn } = recorder(() =>
        Response.json({ result: "ok" }),
      );
      const cloud = createCloudinary(config, fetchFn);

      await cloud.destroy(
        "staging/receipts/loja-1/receipt-abc",
        "authenticated",
        new Date("2026-11-08T12:00:00Z"),
      );

      expect(calls[0].url.pathname).toBe("/v1_1/demo/image/destroy");
      const body = new URLSearchParams(String(calls[0].init?.body));
      expect(Object.fromEntries(body)).toEqual({
        public_id: "staging/receipts/loja-1/receipt-abc",
        type: "authenticated",
        invalidate: "true",
        timestamp: "1794139200",
        api_key: "123",
        signature: signParams(
          {
            invalidate: "true",
            public_id: "staging/receipts/loja-1/receipt-abc",
            timestamp: 1794139200,
            type: "authenticated",
          },
          "abcd",
        ),
      });
    });

    it("[PIX-SEC-002] lê o arquivo privado pela API de download assinada, sem URL pública", async () => {
      const { calls, fetchFn } = recorder(
        () =>
          new Response(new Uint8Array([37, 80, 68, 70]), {
            headers: { "content-type": "application/pdf" },
          }),
      );
      const cloud = createCloudinary(config, fetchFn);

      const file = await cloud.fetchPrivate(
        "staging/receipts/loja-1/receipt-abc",
        "pdf",
        new Date("2026-11-08T12:00:00Z"),
      );

      expect(file?.contentType).toBe("application/pdf");
      expect([...new Uint8Array(file!.body)]).toEqual([37, 80, 68, 70]);
      const url = calls[0].url;
      expect(url.host).toBe("api.cloudinary.com");
      expect(url.pathname).toBe("/v1_1/demo/image/download");
      expect(url.searchParams.get("type")).toBe("authenticated");
      expect(url.searchParams.get("signature")).toBe(
        signParams(
          {
            format: "pdf",
            public_id: "staging/receipts/loja-1/receipt-abc",
            timestamp: 1794139200,
            type: "authenticated",
          },
          "abcd",
        ),
      );
    });

    it("[PIX-SEC-002] o falso guarda por tipo, apaga e devolve o arquivo", async () => {
      const fake = new FakeCloudinary();
      const signed = fake.signUpload({
        folder: "receipts/loja-1",
        publicId: "receipt-abc",
        allowedFormats: ["pdf"],
        type: "authenticated",
      });
      fake.simulateUpload(signed, { format: "pdf", bytes: 4 });
      const id = "staging/receipts/loja-1/receipt-abc";

      expect(await fake.verifyUpload(id, "upload")).toBeNull();
      expect(await fake.verifyUpload(id, "authenticated")).toEqual({
        format: "pdf",
        bytes: 4,
      });
      expect((await fake.fetchPrivate(id, "pdf"))?.contentType).toBe(
        "application/pdf",
      );
      await fake.destroy(id, "authenticated");
      expect(await fake.verifyUpload(id, "authenticated")).toBeNull();
      expect(fake.destroyed).toEqual([id]);
    });
  });

  describe("fotos públicas reduzidas e sem metadados (VEH-SEC-003)", () => {
    it("[VEH-SEC-003] [VEH-NFR-002] a assinatura inclui a transformação de entrada", () => {
      const cloud = createCloudinary(config);

      const signed = cloud.signUpload({
        folder: "vehicles/v-1",
        publicId: "photo-abc",
        allowedFormats: ["jpg", "png", "webp", "heic"],
        transformation: "c_limit,w_1600,h_1600",
        now: new Date("2026-11-08T12:00:00Z"),
      });

      expect(signed.fields.transformation).toBe("c_limit,w_1600,h_1600");
      expect(signed.fields.signature).toBe(
        signParams(
          {
            allowed_formats: "jpg,png,webp,heic",
            folder: "staging/vehicles/v-1",
            public_id: "photo-abc",
            timestamp: 1794139200,
            transformation: "c_limit,w_1600,h_1600",
          },
          "abcd",
        ),
      );
    });

    it("[VEH-NFR-002] a conferência devolve largura e altura reais", async () => {
      const cloud = createCloudinary(config, (async () =>
        Response.json({
          format: "jpg",
          bytes: 1000,
          width: 1600,
          height: 1200,
        })) as typeof fetch);

      expect(
        await cloud.verifyUpload("staging/vehicles/v-1/photo-abc"),
      ).toEqual({
        format: "jpg",
        bytes: 1000,
        width: 1600,
        height: 1200,
      });
    });
  });
});
