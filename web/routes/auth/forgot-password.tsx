import ForgotPasswordResetPassword from '@drivebase/web/components/auth/forgot-password/reset-password';
import ForgotPasswordSendCode from '@drivebase/web/components/auth/forgot-password/send-code';
import ForgotPasswordVerifyCode from '@drivebase/web/components/auth/forgot-password/verify-code';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useState } from 'react';

type Step = 'send-code' | 'verify-code' | 'reset-password';

function Page() {
  const search = Route.useSearch();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(0);

  const step =
    search.step === 'send-code' ? (
      <ForgotPasswordSendCode
        onNext={(email) => {
          setEmail(email);
          void router.navigate({
            to: '/auth/forgot-password',
            search: {
              step: 'verify-code',
            },
          });
        }}
      />
    ) : search.step === 'verify-code' ? (
      <ForgotPasswordVerifyCode
        email={email}
        onNext={(code) => {
          setCode(code);
          void router.navigate({
            to: '/auth/forgot-password',
            search: {
              step: 'reset-password',
            },
          });
        }}
      />
    ) : search.step === 'reset-password' ? (
      <ForgotPasswordResetPassword code={code} email={email} />
    ) : null;

  return (
    <div className="h-screen flex justify-center bg-accent items-center gap-6 overflow-hidden relative">
      <div className="absolute inset-0 h-full w-full bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      {step}
    </div>
  );
}

type PageSearch = {
  step: Step;
};

export const Route = createFileRoute('/auth/forgot-password')({
  component: Page,
  validateSearch: (search: Record<string, string>): PageSearch => {
    return {
      step: (search.step as Step) ?? 'send-code',
    };
  },
});
