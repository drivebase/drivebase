'use client';

import { Loader } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCallbackMutation } from '@xilehq/ui/lib/redux/endpoints/providers';
import { Button } from '@xilehq/ui/components/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@xilehq/ui/components/card';

function Page() {
  const r = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [callback] = useCallbackMutation();

  useEffect(() => {
    const code = params.get('code');
    const state = params.get('state');

    if (code && state) {
      callback({ code, state })
        .unwrap()
        .then(() => {
          r.push('/');
        })
        .catch(() => {
          setError('Failed to connect provider');
        });
    } else {
      r.push('/');
    }
  }, [callback, params, r]);

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
