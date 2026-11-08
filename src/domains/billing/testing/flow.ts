import type { FakeCloudinary } from "@/platform/cloudinary/fake-cloudinary";
import { payments } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { eq } from "drizzle-orm";
import { receiptUpload, startCheckout, submitReceipt } from "../service";
import { storeOwner } from "./fixtures";

/** Só testes: loja que passou por [5d] e enviou o comprovante; devolve o pagamento. */
export async function storeInReview(
  deps: { db: Db; cloudinary: FakeCloudinary; now?: () => Date },
  slug: string,
  paidCents = 10000,
) {
  const owner = await storeOwner(deps.db, slug, `${slug}@x.com`);
  await startCheckout(deps, owner, { taxId: "529.982.247-25" });
  const signed = await receiptUpload(deps, owner);
  deps.cloudinary.simulateUpload(signed, { format: "png", bytes: 1000 });
  await submitReceipt(deps, owner, {
    publicId: `${signed.fields.folder}/${signed.fields.public_id}`,
    paidCents,
  });
  const [payment] = await deps.db
    .select({ id: payments.id })
    .from(payments)
    .where(eq(payments.storeId, owner.storeId));
  return { owner, paymentId: payment.id };
}
