import { notFound } from "next/navigation";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Chip } from "@/ui/chip";
import { EmptyState } from "@/ui/empty-state";
import { Logo } from "@/ui/logo";
import { Skeleton } from "@/ui/skeleton";
import { TextField } from "@/ui/text-field";
import { Toggle } from "@/ui/toggle";
import { YesNo } from "@/ui/yes-no";

/** Vitrine dos componentes base para conferir o visual. Só existe em desenvolvimento. */
export default function UiPreview() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto flex w-full max-w-[390px] flex-col gap-6 p-4">
      <Logo />
      <section className="flex flex-col gap-2">
        <Button block>Publicar</Button>
        <Button variant="dark" block>
          Ver detalhes
        </Button>
        <Button variant="outline" block>
          Carregar mais veículos
        </Button>
        <Button variant="whatsapp" block>
          WhatsApp
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">
            Vendido
          </Button>
          <Button disabled size="sm">
            Desabilitado
          </Button>
        </div>
      </section>
      <section className="flex flex-wrap gap-2">
        <Badge tone="ok">Publicado</Badge>
        <Badge tone="warn">Atrasada</Badge>
        <Badge tone="info">Negociando</Badge>
        <Badge tone="neutral">Rascunho</Badge>
        <Badge tone="caju">Novo</Badge>
        <Badge tone="dark">Via CajuGo</Badge>
      </section>
      <section className="flex gap-2 overflow-x-auto">
        <Chip active count={4}>
          Todos
        </Chip>
        <Chip count={2}>Publicados</Chip>
        <Chip>Rascunhos</Chip>
      </section>
      <section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4">
        <TextField
          id="name"
          label="Nome da loja"
          placeholder="Auto Center Silva"
        />
        <TextField
          id="slug"
          label="Endereço do seu catálogo"
          prefix="cajugo.com.br/"
          help="Disponível"
        />
        <TextField
          id="email"
          label="E-mail"
          error="Informe um e-mail válido."
        />
        <Toggle
          title="Divulgar na CajuGo"
          caption="Visível na vitrine CajuGo"
          defaultChecked
        />
        <Toggle
          title="Divulgar na CajuGo"
          caption="Publique para liberar"
          disabled
        />
        <YesNo name="acceptsTrade" label="Aceita troca" defaultValue />
      </section>
      <EmptyState
        icon="🚗"
        title="Seu catálogo está vazio"
        action={<Button>+ Cadastrar primeiro veículo</Button>}
      >
        Cadastre o primeiro veículo para ele aparecer no seu link e, se quiser,
        na vitrine CajuGo.
      </EmptyState>
      <section className="flex flex-col gap-2">
        <Skeleton className="h-[220px]" />
        <Skeleton className="h-5 w-2/3" />
      </section>
    </main>
  );
}
