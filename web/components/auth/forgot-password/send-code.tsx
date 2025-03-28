import { useMutation } from '@apollo/client';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { Link } from '@tanstack/react-router';
import { LockIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { ForgotPasswordSendCodeInput } from '@drivebase/sdk';
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
import { FORGOT_PASSWORD_SEND_CODE } from '@drivebase/web/gql/mutations/auth';

type Props = {
  onNext: (email: string) => void;
};

const ForgotPasswordSendCode = ({ onNext }: Props) => {
  const [sendCode, { loading }] = useMutation(FORGOT_PASSWORD_SEND_CODE);
  const { t } = useTranslation(['errors', 'common', 'auth']);

  const form = useForm<ForgotPasswordSendCodeInput>({
    defaultValues: {
      email: '',
    },
  });

  function onSubmit(data: ForgotPasswordSendCodeInput) {
    sendCode({ variables: { input: data } })
      .then(() => {
        onNext(data.email);
      })
      .catch((err) => {
        toast.error(err.data?.message ?? 'An unknown error occurred');
      });
  }
  return (
    <Form {...form}>
      <Card className="w-full max-w-sm shadow-xl z-10 rounded-2xl relative">
        <CardHeader className="border-b text-center py-12">
          <LockIcon className="w-20 h-20 mx-auto mb-4 p-4 bg-muted rounded-xl" />
          <CardTitle className="text-xl font-medium">{t('auth:forgot_password_title')}</CardTitle>
          <CardDescription>{t('auth:forgot_password_description')}</CardDescription>
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
            </div>

            <div className="space-y-2">
              <Button className="w-full" disabled={loading}>
                {t('common:submit')}
              </Button>

              <Button className="w-full" variant="outline" type="button" asChild>
                <Link to="/auth/register">{t('auth:dont_have_account')}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </Form>
  );
};

export default ForgotPasswordSendCode;
