"use client";

import { useId } from "react";
import { cn } from "./cn";
import { CheckIcon } from "./icons";

export type CheckNode = {
  value: string;
  label: string;
  count?: number;
  /** Subtipos (ex.: modelos da marca, cidades do estado). */
  children?: CheckNode[];
};

/** Mais que isto e a lista rola (pedido do dono do produto, 012). */
const VISIBLE_ROWS = 5;

/** Checkbox do DESIGN.md §3: 22 px, raio 6, marcado em `ink` com o check branco. */
function Box({ state }: { state: "on" | "off" | "some" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-[22px] flex-none items-center justify-center rounded-md border-[1.5px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink",
        state === "off"
          ? "border-field bg-surface"
          : "border-ink bg-ink text-white",
      )}
    >
      {state === "on" && <CheckIcon size={14} strokeWidth={3} />}
      {state === "some" && <span className="h-0.5 w-2.5 rounded bg-white" />}
    </span>
  );
}

function Row({
  node,
  state,
  onToggle,
  child = false,
}: {
  node: CheckNode;
  state: "on" | "off" | "some";
  onToggle: () => void;
  child?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-3 text-sm",
        child ? "pl-8 font-medium" : "font-semibold",
      )}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={state === "on"}
        aria-checked={state === "some" ? "mixed" : state === "on"}
        onChange={onToggle}
      />
      <Box state={state} />
      <span className="min-w-0 flex-1 truncate">{node.label}</span>
      {node.count !== undefined && (
        <span className="text-xs text-text-3">{node.count}</span>
      )}
    </label>
  );
}

/**
 * Lista de checkbox com tipo e subtipo (ex.: Marca → Modelos): o tipo marcado vale
 * para todos os subtipos; marcar só alguns subtipos deixa o tipo "em parte". Os
 * subtipos aparecem quando o tipo tem algo marcado. Com mais de 5 linhas, a lista
 * rola dentro do grupo.
 */
export function CheckTree({
  nodes,
  isOn,
  onToggleParent,
  onToggleChild,
  label,
}: {
  nodes: CheckNode[];
  /** O valor está marcado? (tipo ou subtipo) */
  isOn: (value: string) => boolean;
  onToggleParent: (node: CheckNode) => void;
  onToggleChild: (parent: CheckNode, child: CheckNode) => void;
  label: string;
}) {
  const id = useId();
  const stateOf = (n: CheckNode): "on" | "off" | "some" => {
    if (isOn(n.value)) return "on";
    const kids = n.children ?? [];
    const marked = kids.filter((c) => isOn(c.value)).length;
    if (!marked) return "off";
    return marked === kids.length ? "on" : "some";
  };
  const rows = nodes.reduce(
    (sum, n) =>
      sum + 1 + (stateOf(n) !== "off" ? (n.children?.length ?? 0) : 0),
    0,
  );
  return (
    <div
      role="group"
      aria-labelledby={id}
      className={cn(
        "flex flex-col",
        rows > VISIBLE_ROWS &&
          "max-h-[226px] overflow-y-auto overscroll-contain pr-1",
      )}
    >
      <span id={id} className="sr-only">
        {label}
      </span>
      {nodes.map((n) => {
        const state = stateOf(n);
        const parentOn = isOn(n.value);
        return (
          <div key={n.value} className="flex flex-col">
            <Row node={n} state={state} onToggle={() => onToggleParent(n)} />
            {state !== "off" &&
              n.children &&
              n.children.length > 1 &&
              n.children.map((c) => (
                <Row
                  key={c.value}
                  node={c}
                  child
                  state={parentOn || isOn(c.value) ? "on" : "off"}
                  onToggle={() => onToggleChild(n, c)}
                />
              ))}
          </div>
        );
      })}
    </div>
  );
}
