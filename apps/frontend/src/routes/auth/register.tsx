import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { Input } from '@drivebase/react/components/input';
import { Button } from '@drivebase/react/components/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@drivebase/react/components/form';
import { useForm } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@drivebase/react/components/card';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { CreateUserDto } from '@drivebase/dtos/create.user.dto';
import { useRegisterMutation } from '@drivebase/react/redux/endpoints/auth';
import { toast } from 'sonner';
import { UserPlus2Icon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function Page() {
  const r = useRouter();
  const [register, { isLoading }] = useRegisterMutation();

  const { t } = useTranslation(['errors', 'common', 'auth']);

  const form = useForm<CreateUserDto>({
    resolver: classValidatorResolver(CreateUserDto),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  function onSubmit(data: CreateUserDto) {
    register({ ...data })
      .unwrap()
      .then(() => {
        toast.success('Account created successfully');
        r.navigate({ to: '/auth/login' });
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
            <CardTitle className="text-xl font-medium">
              {t('auth:register_title')}
            </CardTitle>
            <CardDescription>{t('auth:register_description')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-8 bg-accent/50">
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth:name')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('auth:name_placeholder')}
                          {...field}
                        />
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
                        <Input
                          placeholder={t('auth:email_placeholder')}
                          {...field}
                        />
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
                <Button className="w-full" disabled={isLoading}>
                  {t('auth:register')}
                </Button>

                <Button
                  className="w-full"
                  variant="outline"
                  type="button"
                  asChild
                >
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
