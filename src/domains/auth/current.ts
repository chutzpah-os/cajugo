import { connection } from "next/server";
import { cache } from "react";
import { db } from "@/platform/db/client";
import { requestAuthProvider } from "@/platform/supabase/next";
import { getSession } from "./service";

/** Sessão da requisição atual, lida uma vez por render (layouts e páginas). */
export const currentSession = cache(async () => {
  // A sessão depende da hora (inatividade): sempre por requisição, nunca pré-renderizada.
  await connection();
  return getSession({ db, auth: await requestAuthProvider() });
});
