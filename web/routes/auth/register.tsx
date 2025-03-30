import { useMutation } from '@apollo/client';
import { Link, createFileRoute, useRouter } from '@tanstack/react-router';
import { UserPlus2Icon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { RegisterInput } from '@drivebase/sdk';
import { Button } from '@drivebase/web/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@drivebase/web/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@drivebase/web/components/ui/form';
import { Input } from '@drivebase/web/components/ui/input';
import { REGISTER_USER } from '@drivebase/web/gql/mutations/auth';

function Page() {
  const r = useRouter();
  const [register, { loading }] = useMutation(REGISTER_USER);

  const { t } = useTranslation(['errors', 'common', 'auth']);

  const form = useForm<RegisterInput>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  function onSubmit(data: RegisterInput) {
    register({
      variables: {
        input: data,
      },
    })
      .then(() => {
        toast.success('Account created successfully');
        void r.navigate({ to: '/auth/login' });
      })
      .catch((err) => {
        toast.error(err.data?.message ?? 'An unknown error occurred');
      });
  }

  return (
    <Form {...form}>
      <div className="h-screen flex justify-center bg-accent items-center gap-6 overflow-hidden relative">
        <div className="absolute inset-0 h-full w-full bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <Card className="w-full max-w-sm shadow-xl z-10 rounded-2xl relative">
          <CardHeader className="border-b text-center py-12">
            <UserPlus2Icon className="w-20 h-20 mx-auto mb-4 p-4 bg-muted rounded-xl" />
            <CardTitle className="text-xl font-medium">{t('auth:register_title')}</CardTitle>
            <CardDescription>{t('auth:register_description')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-8 bg-accent/50">
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                form
                  .handleSubmit(onSubmit)(e)
                  .catch((err) => {
                    toast.error(err.data?.message ?? 'An unknown error occurred');
                  });
              }}
            >
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth:name')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('auth:name_placeholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth:email')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('auth:email_placeholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth:password')}</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={t('auth:password_placeholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Button className="w-full" disabled={loading}>
                  {t('auth:register')}
                </Button>

                <Button className="w-full" variant="outline" type="button" asChild>
                  <Link to="/auth/login">{t('auth:already_have_account')}</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Form>
  );
}

export const Route = createFileRoute('/auth/register')({
  component: Page,
});
