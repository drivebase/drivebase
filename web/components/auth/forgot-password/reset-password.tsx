import { ResetPasswordDto } from '@drivebase/auth/dtos/forgot.password.dto';
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
  FormMessage,
} from '@drivebase/web/components/ui/form';
import { Input } from '@drivebase/web/components/ui/input';
import { useForgotPasswordResetMutation } from '@drivebase/web/lib/redux/endpoints/auth';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { useRouter } from '@tanstack/react-router';
import { LockIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type Props = {
  code: number;
  email: string;
};

const ForgotPasswordResetPassword = ({ code, email }: Props) => {
  const router = useRouter();
  const { t } = useTranslation(['auth', 'common']);

  const [resetPassword, { isLoading }] = useForgotPasswordResetMutation();

  const form = useForm<ResetPasswordDto>({
    resolver: classValidatorResolver(ResetPasswordDto),
    defaultValues: {
      email,
      code,
    },
  });

  const onSubmit = (data: ResetPasswordDto) => {
    resetPassword({ email, code, password: data.password })
      .unwrap()
      .then(() => {
        toast.success('Password reset successfully');
        void router.navigate({
          to: '/auth/login',
        });
      })
      .catch((err) =>
        toast.error(err.data?.message ?? 'An unknown error occurred'),
      );
  };

  return (
    <Form {...form}>
      <Card className="w-full max-w-sm shadow-xl z-10 rounded-2xl relative">
        <CardHeader className="border-b text-center py-12">
          <LockIcon className="w-20 h-20 mx-auto mb-4 p-4 bg-muted rounded-xl" />
          <CardTitle className="text-xl font-medium">
            {t('auth:reset_password_title')}
          </CardTitle>
          <CardDescription>
            {t('auth:reset_password_description')}
          </CardDescription>
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
              <input type="hidden" {...form.register('email')} />
              <input type="hidden" {...form.register('code')} />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder={t('auth:enter_new_password')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <Button className="w-full" isLoading={isLoading}>
                {t('common:submit')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </Form>
  );
};

export default ForgotPasswordResetPassword;
