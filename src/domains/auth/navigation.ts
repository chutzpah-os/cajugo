import type { NavItem } from "@/ui/panel-nav";
import type { Area } from "./permissions";

/**
 * Menu de cada área (PRD §6 › Navegação). `mobile`: os 4 da barra inferior;
 * o computador mostra todos na barra lateral [15c].
 */
export const AREA_NAV: Partial<Record<Area, NavItem[]>> = {
  admin: [
    { href: "/admin", label: "Painel", mobile: true },
    { href: "/admin/lojas", label: "Lojas", mobile: true },
    { href: "/admin/assinaturas", label: "Assinaturas", mobile: true },
    { href: "/admin/pagamentos", label: "Pagamentos Pix" },
    { href: "/admin/veiculos", label: "Veículos" },
    { href: "/admin/vendedores", label: "Rede Caju" },
    { href: "/admin/indica", label: "Caju Indica" },
    { href: "/admin/conta", label: "Conta", mobile: true },
  ],
};
