import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

type Props = {
  id: string;
  label: string;
  help?: ReactNode;
  error?: string;
  prefix?: string;
} & ComponentProps<"input">;

/** Campo com rótulo, ajuda, erro e prefixo opcional (ex.: "cajugo.com.br/"). */
export function TextField({
  id,
  label,
  help,
  error,
  prefix,
  className,
  ...props
}: Props) {
  const describedBy = error ? `${id}-error` : help ? `${id}-help` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold">
        {label}
      </label>
      <div
        className={cn(
          "flex h-[50px] overflow-hidden rounded-input border bg-surface focus-within:border-[1.5px] focus-within:border-ink",
          error ? "border-caju-deep" : "border-field",
        )}
      >
        {prefix && (
          <span className="flex items-center border-r border-field bg-bg px-3 text-sm text-text-3">
            {prefix}
          </span>
        )}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "min-w-0 flex-1 bg-transparent px-3.5 text-[15px] outline-none placeholder:text-text-4",
            className,
          )}
          {...props}
        />
      </div>
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
