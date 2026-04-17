import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "urql";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConnectProviderMutation } from "./mutations";
import { ProviderIcon } from "./ProviderIcon";
import type { AvailableProvider } from "@/gql/graphql";
import { useDesktop } from "@/features/desktop/hooks/use-desktop";
import { eventBus } from "@/lib/event-bus";

interface ConnectProviderAppProps {
  windowId: string;
  appState?: Record<string, unknown>;
}

export function ConnectProviderApp({ windowId, appState }: ConnectProviderAppProps) {
  const provider = appState?.provider as AvailableProvider | undefined;
  const desktop = useDesktop();
  const [{ fetching }, connectProvider] = useMutation(ConnectProviderMutation);

  const schema = z.object({
    name: z.string().min(1, "Name is required"),
    ...(provider
      ? Object.fromEntries(
          provider.fields.map((f) => [
            f.name,
            f.required
              ? z.string().min(1, `${f.label} is required`)
              : z.string().optional(),
          ]),
        )
      : {}),
  });

  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: provider ? `My ${provider.label}` : "" },
  });

  async function onSubmit(values: FormValues) {
    if (!provider) return;
    const { name, ...rest } = values;
    const result = await connectProvider({
      input: { name, type: provider.type, credentials: JSON.stringify(rest) },
    });

    if (!result.error) {
      eventBus.emit("provider:connected", {
        providerId: result.data!.connectProvider.id,
        type: provider.type,
      });
      desktop.closeApp(windowId);
    } else {
      form.setError("root", { message: result.error.message });
    }
  }

  if (!provider) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No provider selected.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-4 border-b">
        <ProviderIcon type={provider.type} size={20} />
        <div>
          <p className="text-sm font-medium">Connect {provider.label}</p>
          <p className="text-xs text-muted-foreground">{provider.description}</p>
        </div>
      </div>

      <form
        id="connect-provider-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex-1 overflow-auto px-5 py-4 space-y-4"
      >
        {form.formState.errors.root && (
          <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive ring-1 ring-destructive/20">
            {form.formState.errors.root.message}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="provider-name">Display name</Label>
          <Input
            id="provider-name"
            placeholder={`My ${provider.label}`}
            {...form.register("name")}
          />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        {provider.fields.map((field) => (
          <div key={field.name} className="space-y-1.5">
            <Label htmlFor={`field-${field.name}`}>
              {field.label}
              {field.required && <span className="text-destructive ml-0.5">*</span>}
            </Label>
            <Input
              id={`field-${field.name}`}
              placeholder={field.placeholder ?? ""}
              type={
                field.name.toLowerCase().includes("secret") ||
                field.name.toLowerCase().includes("key") ||
                field.name.toLowerCase().includes("password")
                  ? "password"
                  : "text"
              }
              {...form.register(field.name as keyof FormValues)}
            />
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            {form.formState.errors[field.name as keyof FormValues] && (
              <p className="text-xs text-destructive">
                {form.formState.errors[field.name as keyof FormValues]?.message as string}
              </p>
            )}
          </div>
        ))}
      </form>

      <div className="flex items-center justify-end gap-2 px-5 py-3 border-t">
        <Button variant="outline" onClick={() => desktop.closeApp(windowId)} disabled={fetching}>
          Cancel
        </Button>
        <Button type="submit" form="connect-provider-form" disabled={fetching}>
          {fetching ? "Connecting…" : "Connect"}
        </Button>
      </div>
    </div>
  );
}
