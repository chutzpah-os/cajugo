import type { ComponentProps } from "react";
import { TextField } from "./text-field";

type Props = Omit<ComponentProps<typeof TextField>, "prefix" | "suffix">;

/** Porcentagem em pt-BR ("1,79"), teclado numérico no celular. A conversão fica no servidor. */
export function PercentField(props: Props) {
  return (
    <TextField inputMode="decimal" autoComplete="off" suffix="%" {...props} />
  );
}

/** Valor em reais ("50,00"), teclado numérico no celular. A conversão fica no servidor. */
export function MoneyField(props: Props) {
  return (
    <TextField inputMode="decimal" autoComplete="off" prefix="R$" {...props} />
  );
}
