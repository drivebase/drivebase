import { createFileRoute, useRouter } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import StepOne from '@drivebase/web/components/onboarding/step.01';
import StepTwo from '@drivebase/web/components/onboarding/step.02';
import StepThree from '@drivebase/web/components/onboarding/step.03';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@drivebase/web/components/ui/card';

function Page() {
  const router = useRouter();
  const { step } = Route.useSearch();
  const { t } = useTranslation(['common', 'onboarding']);

  const steps = useMemo(
    () => [
      {
        id: '1',
        label: 'Step 1',
        component: (
          <StepOne
            onNext={() => {
              router.navigate({
                to: '/onboarding',
                search: {
                  step: 2,
                },
              });
            }}
          />
        ),
      },
      {
        id: '2',
        label: 'Step 2',
        component: (
          <StepTwo
            onNext={() => {
              router.navigate({
                to: '/onboarding',
                search: {
                  step: 3,
                },
              });
            }}
            onSkip={() => {
              router.navigate({
                to: '/workspaces',
              });
            }}
          />
        ),
      },
      {
        id: '3',
        label: 'Step 3',
        component: (
          <StepThree
            onNext={() => {
              // router.push('/onboarding?step=4');
            }}
          />
        ),
      },
    ],
    [router],
  );

  const currentStep = steps.find((s) => s.id === step.toString());

  return (
    <div className="h-screen relative flex flex-col gap-6 justify-center items-center overflow-hidden">
      <Card className="w-full max-w-sm shadow-xl z-10 rounded-2xl relative">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          className="py-1 px-2 text-xs absolute top-2 right-2 text-blue-400 bg-blue-50 dark:bg-blue-900 dark:text-blue-400 rounded-lg"
        >
          v2.4.1
        </motion.span>
        <div className="pt-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <img
              src="/drivebase.svg"
              alt="Drivebase Logo"
              width={65}
              height={65}
              className="rounded-2xl z-10 mx-auto"
            />
          </motion.div>
        </div>

        <CardHeader className="border-b text-center pb-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <CardTitle className={'text-xl font-medium'}>{t('onboarding:title')}</CardTitle>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <CardDescription>{t('onboarding:description')}</CardDescription>
          </motion.div>
        </CardHeader>

        <CardContent className="pt-10 bg-accent/50">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              layout
              className="min-h-[100px]"
            >
              {currentStep?.component}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      <div className="absolute inset-0 h-full w-full bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
    </div>
  );
}

type PageParams = {
  step: number;
};

export const Route = createFileRoute('/_protected/onboarding')({
  component: Page,
  validateSearch: (search: Record<string, string>): PageParams => {
    return {
      step: search.step ? Number(search.step) : 1,
    };
  },
});
