import { HONEYPOT_FIELD } from "@/platform/http/honeypot";

/** Campo armadilha para bots: fora da tela, fora do teclado e do leitor de tela. */
export function HoneypotField() {
  return (
    <div
      aria-hidden
      className="absolute -left-[9999px] h-px w-px overflow-hidden"
    >
      <label>
        Não preencha
        <input
          type="text"
          name={HONEYPOT_FIELD}
          tabIndex={-1}
          autoComplete="off"
        />
      </label>
    </div>
  );
}
