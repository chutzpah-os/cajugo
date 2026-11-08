import { NextResponse, type NextRequest } from "next/server";

/**
 * Link de indicação `/i/{codigo}` (STO-FR-014): leva ao cadastro da loja com o
 * código aplicado. A landing [8c] completa é da spec 010.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/i/[codigo]">,
) {
  const { codigo } = await params;
  const url = new URL("/lojistas/cadastro", request.url);
  if (/^[A-Za-z0-9]{3,20}$/.test(codigo))
    url.searchParams.set("codigo", codigo.toUpperCase());
  return NextResponse.redirect(url, 307);
}
