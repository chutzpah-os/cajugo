import { cn } from "./cn";

type Props = {
  name: string;
  label: string;
  defaultValue?: boolean;
};

const option = cn(
  "flex h-[34px] w-[52px] cursor-pointer items-center justify-center rounded-lg text-sm font-semibold text-text-3",
  "has-[:checked]:font-bold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink",
);

/** Segmentado Sim/Não (DESIGN.md §3). Rádios nativos: envia "true"/"false" no formulário. */
export function YesNo({ name, label, defaultValue }: Props) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <span id={`${name}-label`} className="text-[15px]">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={`${name}-label`}
        className="flex rounded-input bg-bg p-0.5"
      >
        <label
          className={cn(
            option,
            "has-[:checked]:bg-ink has-[:checked]:text-white",
          )}
        >
          <input
            type="radio"
            name={name}
            value="true"
            defaultChecked={defaultValue === true}
            className="sr-only"
          />
          Sim
        </label>
        <label
          className={cn(
            option,
            "has-[:checked]:bg-surface has-[:checked]:text-ink",
          )}
        >
          <input
            type="radio"
            name={name}
            value="false"
            defaultChecked={defaultValue === false}
            className="sr-only"
          />
          Não
        </label>
      </div>
    </div>
  );
}
