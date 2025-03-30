import { useMutation } from '@apollo/client';
import { useRouter } from '@tanstack/react-router';
import { LockIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { ForgotPasswordVerifyCodeInput } from '@drivebase/sdk';
import { Button } from '@drivebase/web/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@drivebase/web/components/ui/card';
import { Form } from '@drivebase/web/components/ui/form';
import { Input } from '@drivebase/web/components/ui/input';
import { FORGOT_PASSWORD_VERIFY_CODE } from '@drivebase/web/gql/mutations/auth';

type Props = {
  email: string;
  onNext: (code: number) => void;
};

const ForgotPasswordVerifyCode = ({ email, onNext }: Props) => {
  const router = useRouter();
  const { t } = useTranslation(['auth', 'common']);
  const [verifyCode, { loading }] = useMutation(FORGOT_PASSWORD_VERIFY_CODE);

  const form = useForm<ForgotPasswordVerifyCodeInput>({
    defaultValues: {
      email,
    },
  });

  useEffect(() => {
    if (!email) {
      void router.navigate({
        to: '/auth/forgot-password',
        search: {
          step: 'send-code',
        },
      });
    }
  }, [email, router]);

  const onSubmit = (data: ForgotPasswordVerifyCodeInput) => {
    verifyCode({ variables: { input: data } })
      .then(() => {
        onNext(data.code);
      })
      .catch((err) => {
        toast.error(err.data?.message ?? 'An unknown error occurred');
      });
  };

  return (
    <Form {...form}>
      <Card className="w-full max-w-sm shadow-xl z-10 rounded-2xl relative">
        <CardHeader className="border-b text-center py-12">
          <LockIcon className="w-20 h-20 mx-auto mb-4 p-4 bg-muted rounded-xl" />
          <CardTitle className="text-xl font-medium">{t('auth:verify_code_title')}</CardTitle>
          <CardDescription>{t('auth:verify_code_description', { email })}</CardDescription>
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
              <Input
                type="number"
                {...form.register('code', {
                  setValueAs: (value) => Number(value),
                })}
                placeholder={t('auth:verify_code_placeholder')}
              />
            </div>

            <div className="space-y-2">
              <Button className="w-full" isLoading={loading}>
                {t('common:submit')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </Form>
  );
};

export default ForgotPasswordVerifyCode;
