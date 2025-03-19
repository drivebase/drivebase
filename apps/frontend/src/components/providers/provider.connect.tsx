import { ProviderListItem } from '@drivebase/internal/providers/providers';
import {
  Dialog,
  DialogTitle,
  DialogHeader,
  DialogContent,
  DialogTrigger,
  DialogDescription,
} from '@drivebase/react/components/dialog';
import { Input } from '@drivebase/react/components/input';
import { Label } from '@drivebase/react/components/label';
import { Button } from '@drivebase/react/components/button';
import { useGetAvailableProvidersQuery } from '@drivebase/react/lib/redux/endpoints/providers';
import { KeyIcon } from 'lucide-react';
import { useState } from 'react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
} from '@drivebase/react/components/select';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useGetAuthUrlMutation,
  useAuthorizeApiKeyMutation,
} from '@drivebase/react/lib/redux/endpoints/providers';
import { toast } from 'sonner';

const createKeySchema = z.object({
  label: z.string().min(1),
  provider: z.string().min(1),
  inputFields: z.record(z.string(), z.string()),
});

type ConnectProviderDialogProps = {
  children: React.ReactNode;
};

function ConnectProviderDialog({ children }: ConnectProviderDialogProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] =
    useState<ProviderListItem | null>(null);

  const [getAuthUrl, { isLoading: isGettingAuthUrl }] = useGetAuthUrlMutation();
  const [authorizeApiKey, { isLoading: isAuthorizingApiKey }] =
    useAuthorizeApiKeyMutation();

  const form = useForm<z.infer<typeof createKeySchema>>({
    resolver: zodResolver(createKeySchema),
    defaultValues: {
      label: '',
    },
  });

  const { data: providers } = useGetAvailableProvidersQuery();

  const onSubmit = (data: z.infer<typeof createKeySchema>) => {
    if (selectedProvider?.authType === 'oauth') {
      getAuthUrl({
        type: selectedProvider.type,
        clientId: data.inputFields.clientId,
        clientSecret: data.inputFields.clientSecret,
      })
        .unwrap()
        .then((data) => {
          window.location.href = data.data;
        })
        .catch((error) => {
          toast.error(error.data.message);
        });
    } else if (selectedProvider?.authType === 'api_key') {
      authorizeApiKey({
        type: selectedProvider.type,
        label: data.label,
        credentials: data.inputFields,
      })
        .unwrap()
        .then(() => {
          toast.success('Provider connected successfully');
        })
        .catch((error) => {
          toast.error(error.data.message);
        });
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className="p-0 w-96"
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        <DialogHeader className="px-8 py-10">
          <DialogTitle
            asChild
            className="mx-auto text-2xl select-none text-center"
          >
            <div>
              <KeyIcon
                size={60}
                className="mx-auto mb-4 p-4 bg-muted rounded-xl"
              />
              <h1 className="text-2xl font-medium">Connect Provider</h1>
            </div>
          </DialogTitle>
          <DialogDescription className="text-center">
            Connect a new provider to your account.
          </DialogDescription>
        </DialogHeader>
        <form
          className="py-8 px-6 bg-accent/30 border-t space-y-4 max-h-[500px] overflow-y-auto"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="space-y-1">
            <Label>Provider</Label>
            <Select
              onValueChange={(value) => {
                const provider = providers?.data?.find(
                  (provider) => provider.type === value
                );
                if (provider) {
                  form.setValue('provider', provider.type);
                  setSelectedProvider(provider);

                  form.setValue('label', provider.label);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Providers</SelectLabel>
                  {providers?.data?.map((provider) => (
                    <SelectItem key={provider.type} value={provider.type}>
                      {provider.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {selectedProvider &&
            Object.entries(selectedProvider.inputFields).map(([key, field]) => (
              <div className="space-y-1" key={key}>
                <Label>{field.label}</Label>
                <Input
                  type={field.type}
                  {...form.register(`inputFields.${key}`)}
                />
              </div>
            ))}

          <Button
            variant={'outline'}
            className="w-full mt-4"
            disabled={
              isGettingAuthUrl ||
              isAuthorizingApiKey ||
              selectedProvider === null
            }
          >
            {selectedProvider?.authType === 'oauth' ? 'Authorize' : 'Submit'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ConnectProviderDialog;
