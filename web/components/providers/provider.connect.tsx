import { useMutation, useQuery } from '@apollo/client';
import { KeyIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { AuthType } from '@drivebase/sdk';
import { Button } from '@drivebase/web/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@drivebase/web/components/ui/dialog';
import { Input } from '@drivebase/web/components/ui/input';
import { Label } from '@drivebase/web/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@drivebase/web/components/ui/select';
import {
  AUTHORIZE_API_KEY,
  CONNECT_LOCAL_PROVIDER,
  GET_AUTH_URL,
} from '@drivebase/web/gql/mutations/providers';
import { GET_AVAILABLE_PROVIDERS } from '@drivebase/web/gql/queries/providers';

type ConnectProviderDialogProps = {
  children: React.ReactNode;
};

function ConnectProviderDialog({ children }: ConnectProviderDialogProps) {
  const form = useForm();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);

  const [getAuthUrl, { loading: isGettingAuthUrl }] = useMutation(GET_AUTH_URL);
  const [authorizeApiKey, { loading: isAuthorizingApiKey }] = useMutation(AUTHORIZE_API_KEY);
  const [connectLocalProvider, { loading: isConnectingLocalProvider }] =
    useMutation(CONNECT_LOCAL_PROVIDER);

  const { data } = useQuery(GET_AVAILABLE_PROVIDERS);

  const selectedProvider = data?.availableProviders?.find(
    (provider) => provider.type === selectedProviderId,
  );

  const onSubmit = (data: Record<string, any>) => {
    if (!selectedProvider) return;

    if (selectedProvider?.authType === AuthType.Oauth2) {
      getAuthUrl({
        variables: {
          input: {
            type: selectedProvider.type,
            clientId: data.inputFields.clientId,
            clientSecret: data.inputFields.clientSecret,
          },
        },
      })
        .then(({ data }) => {
          window.location.href = data?.getAuthUrl.url ?? '';
        })
        .catch((error) => {
          toast.error(error.data.message);
        });
    } else if (selectedProvider?.authType === AuthType.ApiKey) {
      authorizeApiKey({
        variables: {
          input: {
            label: data.label,
            credentials: data.inputFields,
            type: selectedProvider.type,
          },
        },
      })
        .then(() => {
          toast.success('Provider connected successfully');
        })
        .catch((error) => {
          toast.error(error.data.message);
        });
    } else if (selectedProvider?.authType === AuthType.None) {
      connectLocalProvider({
        variables: {
          input: { label: data.label || 'Local Storage', basePath: data.inputFields.basePath },
        },
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
          <DialogTitle asChild className="mx-auto text-2xl select-none text-center">
            <div>
              <KeyIcon size={60} className="mx-auto mb-4 p-4 bg-muted rounded-xl" />
              <h1 className="text-2xl font-medium">Connect Provider</h1>
            </div>
          </DialogTitle>
          <DialogDescription className="text-center">
            Connect a new provider to your account.
          </DialogDescription>
        </DialogHeader>
        <form
          className="py-8 px-6 bg-accent/30 border-t space-y-4 max-h-[500px] overflow-y-auto [&::-webkit-scrollbar]:hidden"
          onSubmit={(e) => {
            e.preventDefault();
            form
              .handleSubmit(onSubmit)(e)
              .catch((err) => {
                toast.error(err.data?.message ?? 'An unknown error occurred');
              });
          }}
        >
          <div className="space-y-1">
            <Label>Provider</Label>
            <Select
              onValueChange={(value) => {
                const provider = data?.availableProviders?.find(
                  (provider) => provider.type === value,
                );
                if (provider) {
                  form.setValue('provider', provider.type);
                  setSelectedProviderId(provider.type);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Providers</SelectLabel>
                  {data?.availableProviders?.map((provider) => (
                    <SelectItem key={provider.type} value={provider.type}>
                      {provider.displayName}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {selectedProvider &&
            selectedProvider.configSchema.fields.map((field) => (
              <div className="space-y-1" key={field.id}>
                <Label>{field.label}</Label>
                <Input type={field.type} {...form.register(`inputFields.${field.id}`)} />
              </div>
            ))}

          <Button
            variant={'outline'}
            className="w-full mt-4"
            disabled={
              isGettingAuthUrl ||
              isAuthorizingApiKey ||
              isConnectingLocalProvider ||
              selectedProvider === null
            }
          >
            {selectedProvider?.authType === AuthType.Oauth2 ? 'Authorize' : 'Submit'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ConnectProviderDialog;
