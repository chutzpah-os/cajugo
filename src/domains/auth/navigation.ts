import type { NavItem } from "@/ui/panel-nav";
import type { Area, Permission } from "./permissions";

/** Item do menu; `permission` esconde o item de quem não pode abrir a tela. */
export type AreaNavItem = NavItem & { permission?: Permission };

/**
 * Menu de cada área (PRD §6 › Navegação). `mobile`: os 4 da barra inferior;
 * o computador mostra todos na barra lateral [15c].
 */
export const AREA_NAV: Partial<Record<Area, AreaNavItem[]>> = {
  painel: [
    {
      href: "/painel/veiculos",
      label: "Veículos",
      mobile: true,
      permission: "vehicles.manage",
    },
    {
      href: "/painel/leads",
      label: "Leads",
      mobile: true,
      permission: "leads.view",
    },
    {
      href: "/painel/loja",
      label: "Minha loja",
      mobile: true,
      permission: "store.edit",
    },
    {
      href: "/painel/conta",
      label: "Conta",
      mobile: true,
      permission: "billing.manage",
    },
    { href: "/painel/avisos", label: "Avisos" },
  ],
  rede: [
    { href: "/rede-caju", label: "Início", mobile: true },
    { href: "/rede-caju/vitrine", label: "Vitrine", mobile: true },
    { href: "/rede-caju/extrato", label: "Extrato", mobile: true },
    { href: "/rede-caju/conta", label: "Conta", mobile: true },
    { href: "/rede-caju/avisos", label: "Avisos" },
  ],
  indica: [
    { href: "/indica", label: "Início", mobile: true },
    { href: "/indica/avisos", label: "Avisos", mobile: true },
  ],
  admin: [
    { href: "/admin", label: "Painel", mobile: true },
    { href: "/admin/lojas", label: "Lojas", mobile: true },
    { href: "/admin/assinaturas", label: "Assinaturas", mobile: true },
    { href: "/admin/pagamentos", label: "Pagamentos Pix" },
    { href: "/admin/veiculos", label: "Veículos" },
    {
      href: "/admin/denuncias",
      label: "Denúncias",
      permission: "admin.moderate",
    },
    { href: "/admin/alertas", label: "Alertas", permission: "alerts.notify" },
    { href: "/admin/vendedores", label: "Rede Caju" },
    { href: "/admin/indica", label: "Caju Indica" },
    { href: "/admin/conta", label: "Conta", mobile: true },
    { href: "/admin/log", label: "Log" },
    { href: "/admin/avisos", label: "Avisos" },
  ],
};
