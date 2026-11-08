import { receiptResponse } from "@/domains/billing/http";
import { currentSession } from "@/domains/auth/service";
import { getCloudinary } from "@/platform/cloudinary/cloudinary";
import { getDb } from "@/platform/db/client";

/** Comprovante privado (contract.md da spec 004, ADR 0011). */
export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/v1/payments/[id]/receipt">,
) {
  const { id } = await ctx.params;
  return receiptResponse(
    { db: getDb(), cloudinary: getCloudinary() },
    await currentSession(),
    id,
  );
}
