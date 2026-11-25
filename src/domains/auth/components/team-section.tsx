"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { ConfirmSheet } from "@/ui/confirm-sheet";
import { Initials } from "@/ui/initials";
import { TextField } from "@/ui/text-field";
import {
  inviteTeamMemberAction,
  removeTeamMemberAction,
  type InviteState,
} from "../actions";
import type { TeamMember } from "../team";

function RemoveButton({ member }: { member: TeamMember }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        Remover
      </Button>
      <ConfirmSheet
        open={open}
        title={`Remover ${member.name} da equipe?`}
        confirmLabel="Remover"
        confirmVariant="danger"
        busy={busy}
        onClose={() => setOpen(false)}
        onConfirm={async () => {
          setBusy(true);
          const r = await removeTeamMemberAction({
            profileId: member.profileId,
          });
          setBusy(false);
          if (!r.ok) return setMessage(r.message ?? null);
          setOpen(false);
          router.refresh();
        }}
        extra={
          message && (
            <p role="alert" className="text-sm text-caju-deep">
              {message}
            </p>
          )
        }
      >
        A pessoa perde o acesso ao admin na hora, e as sessões abertas são
        encerradas.
      </ConfirmSheet>
    </>
  );
}

function InviteForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState<InviteState, FormData>(
    async (prev, form) => {
      const r = await inviteTeamMemberAction(prev, form);
      if (r?.ok) router.refresh();
      return r;
    },
    null,
  );
  const [copied, setCopied] = useState(false);
  if (state?.ok)
    return (
      <div role="status" className="flex flex-col gap-2 rounded-card bg-bg p-3">
        <p className="text-sm font-semibold">{state.email} entrou na equipe.</p>
        {state.password ? (
          <>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-input bg-surface px-3 py-3 font-mono text-[17px] tracking-wider">
                {state.password}
              </code>
              <Button
                variant="dark"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(state.password!);
                  setCopied(true);
                }}
              >
                {copied ? "Copiada" : "Copiar"}
              </Button>
            </div>
            <p className="text-xs text-text-3">
              Senha temporária: aparece só agora e vale por 24 horas. No
              primeiro acesso, a pessoa cria a própria senha.
            </p>
          </>
        ) : (
          <p className="text-xs text-text-3">
            A conta já existia: a pessoa entra com a senha dela.
          </p>
        )}
      </div>
    );
  const errors = state?.errors ?? {};
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <TextField
        id="invite-name"
        name="name"
        label="Nome"
        maxLength={80}
        error={errors.name}
      />
      <TextField
        id="invite-email"
        name="email"
        label="E-mail"
        type="email"
        maxLength={254}
        error={errors.email}
      />
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-[13px] font-semibold">Papel</legend>
        <div className="flex gap-4">
          {[
            ["support", "Suporte"],
            ["admin", "Admin"],
          ].map(([value, label]) => (
            <label key={value} className="flex min-h-11 items-center gap-2">
              <input
                type="radio"
                name="role"
                value={value}
                defaultChecked={value === "support"}
                className="size-5 accent-caju"
              />
              {label}
            </label>
          ))}
        </div>
        {errors.role && <p className="text-sm text-caju-deep">{errors.role}</p>}
      </fieldset>
      {state?.message && (
        <p role="alert" className="text-sm text-caju-deep">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Convidando…" : "Convidar"}
      </Button>
    </form>
  );
}

/**
 * **Equipe CajuGo** na Conta admin [4c] (ADM-FR-012): admins e suportes, Convidar
 * (recolhível) e Remover; o suporte só vê.
 */
export function TeamSection({
  members,
  canManage,
}: {
  members: TeamMember[];
  canManage: boolean;
}) {
  return (
    <section
      aria-labelledby="team-title"
      className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4"
    >
      <h2 id="team-title" className="text-[17px] font-extrabold">
        Equipe CajuGo
      </h2>
      <ul className="flex flex-col">
        {members.map((m) => (
          <li
            key={m.profileId}
            data-testid="team-member"
            className="flex items-center gap-3 border-b border-line-2 py-2 last:border-0"
          >
            <Initials name={m.name} size="sm" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-bold">
                {m.name}
                {m.isSelf && " (você)"}
              </span>
              <span className="truncate text-xs text-text-2">{m.email}</span>
            </div>
            <Badge tone={m.role === "admin" ? "caju" : "neutral"} size="sm">
              {m.roleLabel}
            </Badge>
            {m.canRemove && <RemoveButton member={m} />}
          </li>
        ))}
      </ul>
      {canManage && (
        <details className="group border-t border-line-2 pt-1">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-[15px] font-bold [&::-webkit-details-marker]:hidden">
            Convidar para a equipe
            <span aria-hidden className="text-text-3 group-open:rotate-90">
              ›
            </span>
          </summary>
          <div className="pb-2">
            <InviteForm />
          </div>
        </details>
      )}
    </section>
  );
}
