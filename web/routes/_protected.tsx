import { ApolloError, useQuery } from '@apollo/client';
import { Navigate, Outlet, createFileRoute, useRouter } from '@tanstack/react-router';
import { Loader } from 'lucide-react';
import { SignalIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@drivebase/web/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@drivebase/web/components/ui/card';

import { GET_ME } from '../gql/queries/auth';

export const Route = createFileRoute('/_protected')({
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  const { t } = useTranslation(['errors', 'common']);
  const { loading, error } = useQuery(GET_ME);

  useEffect(() => {
    if (error && 'status' in error && error.status === 401) {
      void router.navigate({ to: '/auth/login' });
    }
  }, [error, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  if (!error) return <Outlet />;

  if (error instanceof ApolloError) {
    if (error.message === 'Failed to fetch') {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="absolute inset-0 h-full w-full bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <Card className="w-full max-w-sm shadow-xl z-10 rounded-2xl relative">
            <CardHeader className="border-b text-center py-12">
              <SignalIcon className="w-20 h-20 mx-auto mb-4 p-4 bg-muted rounded-xl" />
              <CardTitle className="text-xl font-medium">
                {t('errors:not_reachable_title')}
              </CardTitle>
              <CardDescription>{t('errors:not_reachable_description')}</CardDescription>
            </CardHeader>
            <CardContent className="pt-8 space-y-4 bg-accent/50">
              <Button variant={'outline'} onClick={() => window.location.reload()}>
                {t('common:retry')}
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (error.message === 'Unauthorized') {
      return <Navigate to="/auth/login" />;
    }
  }
}
