'use client';

import { Loader } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
  const params = useParams();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [callback] = useCallbackMutation();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (code && state) {
      callback({ code, state, type: params.type as ProviderType })
        .unwrap()
        .then(() => {
          r.push('/settings/accounts');
        })
        .catch(() => {
          setError('Failed to connect provider');
        });
    } else {
      r.push('/settings/keys');
    }
  }, [callback, params.type, r, searchParams]);

  return (
    <div className="h-screen flex items-center justify-center">
      {error ? (
        <Card className="shadow-xl rounded-2xl">
          <CardHeader className="border-b pb-10">
            <CardTitle className="text-2xl font-semibold">Error</CardTitle>
            <CardDescription>
              We were unable to connect to the provider. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8 bg-accent/50">
            <Button variant={'outline'} onClick={() => r.push('/')}>
              Go back
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Loader className="animate-spin" size={32} />
      )}
    </div>
  );
}

export default Page;
