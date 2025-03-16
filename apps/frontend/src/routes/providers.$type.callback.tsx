import { createFileRoute, useRouter } from '@tanstack/react-router';
import { Loader } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@drivebase/react/components/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@drivebase/react/components/card';
import { ProviderType } from '@prisma/client';
import { useCallbackMutation } from '@drivebase/react/lib/redux/endpoints/accounts';

function Page() {
  const r = useRouter();
  const params = Route.useParams();
  const searchParams = Route.useSearch();
  const [error, setError] = useState<string | null>(null);
  const [callback] = useCallbackMutation();

  useEffect(() => {
    const code = searchParams.code;
    const state = searchParams.state;

    if (code && state) {
      callback({ code, state, type: params.type as ProviderType })
        .unwrap()
        .then(() => {
          r.navigate({ to: '/settings/accounts' });
        })
        .catch(() => {
          setError('Failed to connect provider');
        });
    } else {
      r.navigate({ to: '/settings/keys' });
    }
  }, [callback, params.type, r, searchParams]);

  return (
    <div className="h-screen flex items-center justify-center relative">
      <div className="absolute inset-0 h-full w-full bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      {error ? (
        <Card className="shadow-xl rounded-2xl z-20 w-[25rem]">
          <CardHeader className="border-b pb-6">
            <CardTitle className="text-2xl font-semibold">Error</CardTitle>
            <CardDescription>
              An error occurred while connecting to the provider.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4 bg-accent/50">
            <p className="text-sm text-muted-foreground">
              Please check console for more details.
            </p>
            <Button
              variant={'outline'}
              onClick={() => r.navigate({ to: '/settings/keys' })}
            >
              Go back
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Loader className="animate-spin z-20" size={32} />
      )}
    </div>
  );
}

type SearchParams = {
  code: string;
  state: string;
};

export const Route = createFileRoute('/providers/$type/callback')({
  component: Page,
  validateSearch: (search: SearchParams) => {
    return search;
  },
});
