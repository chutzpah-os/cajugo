import { connection } from "next/server";
import { cache } from "react";
import { getDb } from "@/platform/db/client";
import { requestAuthProvider } from "@/platform/supabase/next";
import { getSession, storeStatusOf } from "./service";

/** Sessão da requisição atual, lida uma vez por render (layouts e páginas). */
export const currentSession = cache(async () => {
  // A sessão depende da hora (inatividade): sempre por requisição, nunca pré-renderizada.
  await connection();
  return getSession({ db: getDb(), auth: await requestAuthProvider() });
});

/** Status da loja da sessão atual, consultado uma vez por render (guardas e moldura). */
export const currentStoreStatus = cache(async (storeId: string | null) =>
  storeStatusOf(getDb(), storeId),
);
