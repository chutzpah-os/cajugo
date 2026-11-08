"use client";

import { useState } from "react";
import { cn } from "./cn";

export type Suggestion = { value: string; label: string };

/**
 * Campo com sugestões (combobox da WAI-ARIA): digita, escolhe com toque ou setas+Enter.
 * Quem usa decide as sugestões (`onQuery`) e o que fazer na escolha (`onSelect`).
 */
export function AutocompleteField({
  id,
  label,
  value,
  suggestions,
  onQuery,
  onSelect,
  error,
  help,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  suggestions: Suggestion[];
  onQuery: (text: string) => void;
  onSelect: (s: Suggestion) => void;
  error?: string;
  help?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = `${id}-list`;
  const describedBy = error ? `${id}-error` : help ? `${id}-help` : undefined;
  const show = open && suggestions.length > 0;
  const choose = (s: Suggestion) => {
    onSelect(s);
    setOpen(false);
  };

  return (
    <div className="relative flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold">
        {label}
      </label>
      <input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={show}
        aria-controls={listId}
        aria-activedescendant={show ? `${id}-opt-${active}` : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!show) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, suggestions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            choose(suggestions[active]);
          } else if (e.key === "Escape") setOpen(false);
        }}
        className={cn(
          "h-[50px] rounded-input border bg-surface px-3.5 text-[15px] outline-none placeholder:text-text-4 focus:border-[1.5px] focus:border-ink",
          error ? "border-caju-deep" : "border-field",
        )}
      />
      <ul
        id={listId}
        role="listbox"
        aria-label={label}
        hidden={!show}
        className="absolute top-full z-20 mt-1 max-h-64 w-full overflow-auto rounded-input border border-line bg-surface shadow"
      >
        {suggestions.map((s, i) => (
          <li
            key={s.value}
            id={`${id}-opt-${i}`}
            role="option"
            aria-selected={i === active}
            onMouseDown={(e) => {
              e.preventDefault();
              choose(s);
            }}
            className="flex min-h-11 cursor-pointer items-center px-3.5 text-[15px] aria-selected:bg-caju-soft"
          >
            {s.label}
          </li>
        ))}
      </ul>
      {error ? (
        <p id={`${id}-error`} className="text-xs text-caju-deep">
          {error}
        </p>
      ) : (
        help && (
          <p id={`${id}-help`} className="text-xs text-text-3">
            {help}
          </p>
        )
      )}
    </div>
  );
}
