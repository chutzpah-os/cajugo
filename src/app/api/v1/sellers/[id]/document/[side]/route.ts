import { currentSession } from "@/domains/auth/service";
import { documentFile } from "@/domains/sellers/service";
import { getCloudinary } from "@/platform/cloudinary/cloudinary";
import { getDb } from "@/platform/db/client";
import { privateFileResponse } from "@/platform/http/private-file";

/** Foto do documento do vendedor (contract.md da spec 008, ADR 0011). */
export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/v1/sellers/[id]/document/[side]">,
) {
  const { id, side } = await ctx.params;
  const session = await currentSession();
  return privateFileResponse(
    session,
    () =>
      documentFile(
        { db: getDb(), cloudinary: getCloudinary() },
        session,
        id,
        side,
      ),
    "sellers.document_failed",
  );
}
