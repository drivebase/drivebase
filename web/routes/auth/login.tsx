import { ApolloError, useMutation } from '@apollo/client';
import { Link, createFileRoute, useRouter } from '@tanstack/react-router';
import { LockIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { LoginInput } from '@drivebase/sdk';
import { Button } from '@drivebase/web/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@drivebase/web/components/ui/card';
import { Checkbox } from '@drivebase/web/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@drivebase/web/components/ui/form';
import { Input } from '@drivebase/web/components/ui/input';
import { LOGIN_USER } from '@drivebase/web/gql/mutations/auth';

function Page() {
  const router = useRouter();
  const [login, { loading }] = useMutation(LOGIN_USER);
  const { t } = useTranslation(['errors', 'common', 'auth']);

  const form = useForm<LoginInput>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  function onSubmit(data: LoginInput) {
    login({
      variables: {
        input: data,
      },
    })
      .then(({ data }) => {
        if (data?.login.accessToken) {
          localStorage.setItem('accessToken', data.login.accessToken);
          void router.navigate({
            to: '/',
            reloadDocument: true,
          });
        } else {
          toast.error('Invalid credentials');
        }
      })
      .catch((err) => {
        if (err instanceof ApolloError) {
          toast.error(err.message);
        } else {
          toast.error('An unknown error occurred');
        }
      });
  }

  return (
    <Form {...form}>
      <div className="h-screen flex justify-center bg-accent items-center gap-6 overflow-hidden relative">
        <div className="absolute inset-0 h-full w-full bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <Card className="w-full max-w-sm shadow-xl z-10 rounded-2xl relative">
          <CardHeader className="border-b text-center py-12">
            <LockIcon className="w-20 h-20 mx-auto mb-4 p-4 bg-muted rounded-xl" />
            <CardTitle className="text-xl font-medium">{t('auth:login_title')}</CardTitle>
            <CardDescription>{t('auth:login_description')}</CardDescription>
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
              <div className="flex justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="terms" />
                  <label
                    htmlFor="terms"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t('auth:remember_me')}
                  </label>
                </div>

                <Link
                  to="/auth/forgot-password"
                  className="text-sm text-muted-foreground"
                  search={{
                    step: 'send-code',
                  }}
                >
                  {t('auth:forgot_password')}
                </Link>
              </div>
              <div className="space-y-2">
                <Button className="w-full" disabled={loading}>
                  {t('auth:login')}
                </Button>

                <Button className="w-full" variant="outline" type="button" asChild>
                  <Link to="/auth/register">{t('auth:dont_have_account')}</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Form>
  );
}

export const Route = createFileRoute('/auth/login')({
  component: Page,
});
