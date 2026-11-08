"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { brl, centsToReais, reaisToCents } from "@/platform/br/money";
import { Chip } from "@/ui/chip";
import { MoneyField } from "@/ui/number-field";
import { SelectField } from "@/ui/select-field";
import { TextAreaField } from "@/ui/textarea-field";
import { TextField } from "@/ui/text-field";
import { Toggle } from "@/ui/toggle";
import { YesNo } from "@/ui/yes-no";
import { fipeAction, saveDraftAction } from "../actions";
import {
  BODIES,
  CONDITIONS,
  DOORS,
  FEATURES,
  FUELS,
  MAX_DESCRIPTION,
  TRANSMISSIONS,
} from "../lists";
import { priceVsFipe } from "../price";
import type { VehicleFormView } from "../service";

/** Listas da FIPE pela action; erro vira o aviso do formulário (VEH-NFR-004). */
async function loadFipe<T>(
  input: Parameters<typeof fipeAction>[0],
): Promise<{ items?: T; error?: string }> {
  const r = await fipeAction(input);
  return r.ok
    ? { items: r.items as T }
    : {
        error:
          r.message ?? "Lista indisponível agora. Tente de novo em instantes.",
      };
}

/** Espera depois da última alteração antes de salvar sozinho (VEH-FR-003). */
const AUTOSAVE_MS = 1000;

type Option = readonly [string, string];
const entries = (t: Record<string, string>): Option[] => Object.entries(t);

type Family = { family: string; versions: { id: string; name: string }[] };

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex scroll-mt-4 flex-col gap-4 rounded-card border border-line bg-surface p-4"
    >
      <h2 id={`${id}-title`} className="text-[17px] font-extrabold">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Formulário do veículo [2a] (VEH-FR-003…008): salva sozinho o que mudou, 1 s depois
 * da última alteração ("Rascunho salvo"); o 1º salvamento cria o veículo e troca o
 * endereço para o de edição, sem recarregar. Fotos e Publicar entram por `children`.
 */
export function VehicleForm({
  initial,
  children,
}: {
  initial: VehicleFormView | null;
  children?: (view: VehicleFormView | null, saving: boolean) => ReactNode;
}) {
  const [view, setView] = useState<VehicleFormView | null>(initial);
  const [values, setValues] = useState<Record<string, unknown>>(() => ({
    ...(initial ?? {}),
    priceText: initial?.priceCents ? centsToReais(initial.priceCents) : "",
  }));
  const pending = useRef<Record<string, unknown>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    initial ? "saved" : "idle",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const vehicleId = useRef(initial?.vehicleId);

  const [brandList, setBrandList] = useState<Option[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [yearList, setYearList] = useState<Option[]>([]);
  const [family, setFamily] = useState(initial?.model ?? "");
  const [fipeError, setFipeError] = useState<string>();

  const flush = async () => {
    const changes = pending.current;
    if (!Object.keys(changes).length) return;
    pending.current = {};
    setStatus("saving");
    const result = await saveDraftAction({
      vehicleId: vehicleId.current,
      ...changes,
    });
    if (!result.ok) {
      setStatus("error");
      setErrors((e) => ({ ...e, ...result.errors }));
      setMessage(result.message);
      return;
    }
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(changes)) delete next[k];
      return next;
    });
    setMessage(undefined);
    setView(result.view);
    setStatus("saved");
    if (!vehicleId.current) {
      vehicleId.current = result.view.vehicleId;
      window.history.replaceState(
        null,
        "",
        `/painel/veiculos/${result.view.vehicleId}/editar`,
      );
    }
  };

  const change = (
    patch: Record<string, unknown>,
    save: Record<string, unknown> = patch,
  ) => {
    setValues((v) => ({ ...v, ...patch }));
    pending.current = { ...pending.current, ...save };
    if (Object.keys(save).length) setStatus("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, AUTOSAVE_MS);
  };

  // Salva o que faltou ao sair da página.
  useEffect(() => () => void flush(), []);

  // Alteração ainda não salva: o navegador pergunta antes de sair (PRD [2a]).
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const brandId = values.fipeBrandId as string | null | undefined;
  const modelId = values.fipeModelId as string | null | undefined;

  useEffect(() => {
    let alive = true;
    loadFipe<{ id: string; name: string }[]>({ list: "brands" }).then((r) => {
      if (!alive) return;
      setFipeError(r.error);
      if (r.items) setBrandList(r.items.map((x) => [x.id, x.name]));
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    if (!brandId) return;
    loadFipe<Family[]>({ list: "models", brandId }).then((r) => {
      if (!alive) return;
      setFipeError(r.error);
      if (r.items) setFamilies(r.items);
    });
    return () => {
      alive = false;
    };
  }, [brandId]);

  useEffect(() => {
    let alive = true;
    if (!brandId || !modelId) return;
    loadFipe<{ id: string; label: string }[]>({
      list: "years",
      brandId,
      modelId,
    }).then((r) => {
      if (!alive) return;
      setFipeError(r.error);
      if (r.items) setYearList(r.items.map((x) => [x.id, x.label]));
    });
    return () => {
      alive = false;
    };
  }, [brandId, modelId]);

  /** Identificação vai junta: a versão depende da marca e o ano da versão. */
  const identify = (next: {
    fipeBrandId: string | null;
    fipeModelId: string | null;
    fipeYearId: string | null;
  }) => change(next, next);

  const versions = families.find((f) => f.family === family)?.versions ?? [];
  const yearModel = view?.yearModel ?? null;
  const manufactureOptions: Option[] = yearModel
    ? [yearModel - 1, yearModel].map((y) => [String(y), String(y)])
    : [];
  const conditions = (values.conditions as Record<string, boolean>) ?? {};
  const features = (values.features as string[]) ?? [];
  const priceCents = reaisToCents(String(values.priceText ?? ""));
  const vsFipe = priceVsFipe(
    Number.isFinite(priceCents) ? priceCents : null,
    view?.fipePriceCents ?? null,
  );
  const str = (k: string) => (values[k] as string | null | undefined) ?? "";

  return (
    <div className="flex flex-col gap-4">
      <p role="status" className="text-sm text-text-3" data-testid="autosave">
        {status === "saving"
          ? "Salvando…"
          : status === "saved"
            ? "Rascunho salvo"
            : status === "error"
              ? "Não foi possível salvar"
              : "Comece pelo que tiver à mão: tudo é salvo sozinho."}
      </p>
      {message && (
        <p role="alert" className="text-sm text-caju-deep">
          {message}
        </p>
      )}

      {children?.(view, status === "saving")}

      <Section id="identificacao" title="Identificação">
        {fipeError && (
          <p role="alert" className="text-sm text-warn">
            {fipeError}
          </p>
        )}
        <SelectField
          id="fipeBrandId"
          label="Marca"
          placeholder="Escolha a marca"
          options={brandList}
          value={str("fipeBrandId")}
          onChange={(e) => {
            setFamily("");
            setFamilies([]);
            setYearList([]);
            identify({
              fipeBrandId: e.target.value || null,
              fipeModelId: null,
              fipeYearId: null,
            });
          }}
          error={errors.fipeBrandId}
        />
        <SelectField
          id="model"
          label="Modelo"
          placeholder="Escolha o modelo"
          disabled={!brandId || !families.length}
          options={families.map((f) => [f.family, f.family] as const)}
          value={family}
          onChange={(e) => {
            setFamily(e.target.value);
            setYearList([]);
            identify({
              fipeBrandId: brandId ?? null,
              fipeModelId: null,
              fipeYearId: null,
            });
          }}
        />
        <SelectField
          id="fipeModelId"
          label="Versão"
          placeholder="Escolha a versão"
          disabled={!family}
          options={versions.map((v) => [v.id, v.name] as const)}
          value={str("fipeModelId")}
          onChange={(e) => {
            setYearList([]);
            identify({
              fipeBrandId: brandId ?? null,
              fipeModelId: e.target.value || null,
              fipeYearId: null,
            });
          }}
          error={errors.fipeModelId}
        />
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            id="fipeYearId"
            label="Ano modelo"
            placeholder="Ano"
            disabled={!modelId || !yearList.length}
            options={yearList}
            value={str("fipeYearId")}
            onChange={(e) =>
              identify({
                fipeBrandId: brandId ?? null,
                fipeModelId: modelId ?? null,
                fipeYearId: e.target.value || null,
              })
            }
            error={errors.fipeYearId}
          />
          <SelectField
            id="yearManufacture"
            label="Ano fabricação"
            placeholder="Ano"
            disabled={!yearModel}
            options={manufactureOptions}
            value={values.yearManufacture ? String(values.yearManufacture) : ""}
            onChange={(e) =>
              change({
                yearManufacture: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
            error={errors.yearManufacture}
          />
        </div>
        <TextField
          id="plate"
          label="Placa"
          help="Não aparece no anúncio; só o final."
          autoCapitalize="characters"
          maxLength={8}
          value={str("plate")}
          onChange={(e) => change({ plate: e.target.value.toUpperCase() })}
          error={errors.plate}
        />
      </Section>

      <Section id="ficha" title="Ficha técnica">
        <TextField
          id="mileageKm"
          label="Quilometragem"
          inputMode="numeric"
          suffix="km"
          value={
            values.mileageKm === undefined || values.mileageKm === null
              ? ""
              : String(values.mileageKm)
          }
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "");
            change(
              { mileageKm: digits ? Number(digits) : null },
              digits ? { mileageKm: Number(digits) } : {},
            );
          }}
          error={errors.mileageKm}
        />
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            id="transmission"
            label="Câmbio"
            placeholder="Escolha"
            options={entries(TRANSMISSIONS)}
            value={str("transmission")}
            onChange={(e) =>
              e.target.value && change({ transmission: e.target.value })
            }
            error={errors.transmission}
          />
          <SelectField
            id="fuel"
            label="Combustível"
            placeholder="Escolha"
            options={entries(FUELS)}
            value={str("fuel")}
            onChange={(e) => e.target.value && change({ fuel: e.target.value })}
            error={errors.fuel}
          />
          <SelectField
            id="body"
            label="Carroceria"
            placeholder="Escolha"
            options={entries(BODIES)}
            value={str("body")}
            onChange={(e) => e.target.value && change({ body: e.target.value })}
            error={errors.body}
          />
          <SelectField
            id="doors"
            label="Portas"
            placeholder="Escolha"
            options={DOORS.map((d) => [String(d), String(d)] as const)}
            value={values.doors ? String(values.doors) : ""}
            onChange={(e) =>
              e.target.value && change({ doors: Number(e.target.value) })
            }
            error={errors.doors}
          />
          <TextField
            id="color"
            label="Cor"
            maxLength={30}
            value={str("color")}
            onChange={(e) => change({ color: e.target.value })}
            error={errors.color}
          />
          <TextField
            id="engine"
            label="Motor"
            placeholder="1.0"
            maxLength={10}
            value={str("engine")}
            onChange={(e) => change({ engine: e.target.value })}
            error={errors.engine}
          />
        </div>
      </Section>

      <Section id="preco" title="Preço">
        <MoneyField
          id="price"
          label="Preço de venda"
          value={String(values.priceText ?? "")}
          onChange={(e) => {
            const cents = reaisToCents(e.target.value);
            change(
              { priceText: e.target.value },
              Number.isFinite(cents) ? { priceCents: cents } : {},
            );
          }}
          error={errors.priceCents}
        />
        {view?.fipePriceCents ? (
          <p
            className="rounded-input bg-ok-soft p-3 text-sm text-ok"
            data-testid="fipe-reference"
          >
            FIPE {view.fipeMonth}: <strong>{brl(view.fipePriceCents)}</strong>
            {vsFipe && <> · {vsFipe}</>}
          </p>
        ) : null}
        <Toggle
          title="Exibir parcela estimada"
          checked={!!values.showInstallment}
          onChange={(e) => change({ showInstallment: e.target.checked })}
        />
      </Section>

      <Section id="condicoes" title="Condições">
        {Object.entries(CONDITIONS).map(([key, label]) => (
          <YesNo
            key={key}
            name={`condition-${key}`}
            label={label}
            value={conditions[key] ?? null}
            onChange={(v) => {
              const next = { ...conditions, [key]: v };
              change({ conditions: next });
            }}
          />
        ))}
      </Section>

      <Section id="itens" title="Itens do veículo">
        <p className="text-sm text-text-3">{features.length} selecionados</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(FEATURES).map(([key, label]) => {
            const on = features.includes(key);
            return (
              <Chip
                key={key}
                active={on}
                className="h-11"
                onClick={() =>
                  change({
                    features: on
                      ? features.filter((f) => f !== key)
                      : [...features, key],
                  })
                }
              >
                {label}
              </Chip>
            );
          })}
        </div>
      </Section>

      <Section id="descricao" title="Descrição">
        <TextAreaField
          id="description"
          label="Conte o que o comprador precisa saber"
          max={MAX_DESCRIPTION}
          value={str("description")}
          onChange={(e) => change({ description: e.target.value })}
          error={errors.description}
        />
      </Section>

      <Section id="divulgacao" title="Divulgação">
        <Toggle
          title="Divulgar na CajuGo"
          caption="O mesmo veículo aparece no seu catálogo e na vitrine CajuGo; mudou aqui, muda em todos."
          checked={!!values.shareOnCajugo}
          onChange={(e) => change({ shareOnCajugo: e.target.checked })}
        />
        <TextField
          id="contactWhatsapp"
          label="WhatsApp do anúncio"
          type="tel"
          inputMode="tel"
          value={str("contactWhatsapp").replace(/^55/, "")}
          onChange={(e) => change({ contactWhatsapp: e.target.value })}
          error={errors.contactWhatsapp}
        />
      </Section>
    </div>
  );
}
