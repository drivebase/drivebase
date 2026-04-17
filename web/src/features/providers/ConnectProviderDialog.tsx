import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "urql";
import { ProviderIcon } from "./ProviderIcon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConnectProviderMutation } from "./mutations";
import type { AvailableProvider } from "@/gql/graphql";
import { ProviderType } from "@/gql/graphql";

interface ConnectProviderDialogProps {
  provider: AvailableProvider | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ConnectProviderDialog({ provider, onClose, onSuccess }: ConnectProviderDialogProps) {
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
    defaultValues: {
      name: provider ? `My ${provider.label}` : "",
    },
  });

  async function onSubmit(values: FormValues) {
    if (!provider) return;

    const { name, ...rest } = values;
    const credentials = JSON.stringify(rest);

    const result = await connectProvider({
      input: { name, type: provider.type, credentials },
    });

    if (!result.error) {
      onSuccess();
      onClose();
    } else {
      form.setError("root", { message: result.error.message });
    }
  }

  return (
    <Dialog open={!!provider} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            {provider && <ProviderIcon type={provider.type} size={20} />}
            <div>
              <DialogTitle>Connect {provider?.label}</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {provider?.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form id="connect-provider-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
          {form.formState.errors.root && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive ring-1 ring-destructive/20">
              {form.formState.errors.root.message}
            </div>
          )}

          {/* Display name */}
          <div className="space-y-1.5">
            <Label htmlFor="provider-name">Display name</Label>
            <Input
              id="provider-name"
              placeholder={`My ${provider?.label}`}
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Dynamic fields from provider definition */}
          {provider?.fields.map((field) => (
            <div key={field.name} className="space-y-1.5">
              <Label htmlFor={`field-${field.name}`}>
                {field.label}
                {field.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              <Input
                id={`field-${field.name}`}
                placeholder={field.placeholder ?? ""}
                type={field.name.toLowerCase().includes("secret") || field.name.toLowerCase().includes("key") ? "password" : "text"}
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={fetching}>
            Cancel
          </Button>
          <Button type="submit" form="connect-provider-form" disabled={fetching}>
            {fetching ? "Connecting…" : "Connect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
