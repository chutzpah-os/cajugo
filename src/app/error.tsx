"use client";

import { SiteFooter } from "@/ui/site-footer";
import { useEffect } from "react";
import { Unavailable } from "@/domains/showcase/components/unavailable";
import { BasicSiteHeader } from "@/ui/basic-site-header";
import { Button } from "@/ui/button";

/** Erro de carregamento [12b] (SHW-FR-012): nunca mostra o detalhe técnico. */
export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <>
      <BasicSiteHeader />
      <Unavailable title="Não foi possível carregar esta página">
        <p className="text-sm text-text-2">
          Verifique a sua conexão e tente de novo.
        </p>
        <Button onClick={() => retry()}>Tentar de novo</Button>
      </Unavailable>
      <SiteFooter />
    </>
  );
}
