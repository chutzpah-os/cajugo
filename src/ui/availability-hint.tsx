export type Availability =
  "idle" | "checking" | "available" | "taken" | "invalid";

const TEXT: Record<Exclude<Availability, "idle">, [string, string]> = {
  checking: ["Verificando…", "text-text-3"],
  available: ["Disponível", "text-ok"],
  taken: ["Indisponível", "text-caju-deep"],
  invalid: ["Endereço inválido", "text-caju-deep"],
};

/** "Disponível" / "Indisponível" ao vivo, anunciado ao leitor de tela (STO-FR-005). */
export function AvailabilityHint({
  id,
  status,
}: {
  id: string;
  status: Availability;
}) {
  return (
    <p
      id={id}
      role="status"
      aria-live="polite"
      className="min-h-4 text-xs font-semibold"
    >
      {status !== "idle" && (
        <span className={TEXT[status][1]}>{TEXT[status][0]}</span>
      )}
    </p>
  );
}
