'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import StepOne from './steps/step.01';
import StepTwo from './steps/step.02';
import StepThree from './steps/step.03';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@drivebase/react/components/card';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';

function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const step = searchParams.get('step') || '1';

  const steps = useMemo(
    () => [
      {
        id: '1',
        label: 'Step 1',
        component: (
          <StepOne
            onNext={(id) => {
              router.push(`/onboarding?step=2&workspaceId=${id}`);
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
              router.push('/onboarding?step=3');
            }}
            onSkip={() => {
              router.push(`/workspaces`);
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
    [router]
  );

  const currentStep = steps.find((s) => s.id === step);

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
            <Image
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
            <CardTitle className={'text-xl font-medium'}>Drivebase</CardTitle>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <CardDescription>
              Your unified file storage management across multiple cloud
              providers.
            </CardDescription>
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

export default Page;
