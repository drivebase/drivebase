import { useRouter } from '@tanstack/react-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@drivebase/react/components/button';
import { Input } from '@drivebase/react/components/input';
import {
  useTelegramVerifyCodeMutation,
  useTelegramVerifyPasswordMutation,
  useTelegramSendCodeMutation,
} from '@drivebase/react/lib/redux/endpoints/custom.provider';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogClose,
} from '@drivebase/react/components/dialog';
import { CustomProviderProps } from '.';

function TelegramProvider({ onClose }: CustomProviderProps) {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');

  const [sendPhoneCode, { isLoading: isSendingPhoneCode }] =
    useTelegramSendCodeMutation();
  const [verifyOtp, { isLoading: isVerifyingOtp }] =
    useTelegramVerifyCodeMutation();
  const [verifyPass, { isLoading: isVerifyingPass }] =
    useTelegramVerifyPasswordMutation();
  const [step, setStep] = useState(1);

  const refs = {
    phoneNumber: useRef<HTMLInputElement>(null),
    otp: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
  };

  const handeSendOtp = useCallback(async () => {
    if (!refs.phoneNumber.current) return;
    const phoneNumber = refs.phoneNumber.current?.value;

    if (!phoneNumber) {
      toast.error('Please enter phone number');
      return;
    }

    await sendPhoneCode({
      phoneNumber,
    })
      .unwrap()
      .then((res) => {
        setPhoneNumber(phoneNumber);

        if (res.error) {
          toast.error(res.error);
        } else {
          setStep(2);
        }
      });
  }, [refs.phoneNumber, sendPhoneCode]);

  const handleVerifyOtp = useCallback(async () => {
    if (!refs.otp.current) return;
    const otp = refs.otp.current?.value;

    if (!otp) {
      toast.error('Please enter OTP');
      return;
    }

    await verifyOtp({
      code: otp,
    })
      .unwrap()
      .then((res) => {
        if (res.error) {
          toast.error(res.error);
        } else if (res.data?.next === 'require_password') {
          setStep(3);
        } else {
          router.navigate({ to: '/settings/accounts', reloadDocument: true });
        }
      });
  }, [refs.otp, router, verifyOtp]);

  const handleVerifyPassword = useCallback(async () => {
    const password = refs.password.current?.value;

    if (!password) {
      toast.error('Please enter password');
      return;
    }

    await verifyPass({
      password: password,
    })
      .unwrap()
      .then((res) => {
        if (!res.error) {
          router.navigate({ to: '/settings/accounts', reloadDocument: true });
        } else {
          toast.error(res.error);
        }
      });
  }, [refs.password, router, verifyPass]);

  const StepView = useMemo(() => {
    if (step === 1) {
      return (
        <>
          <Input
            placeholder="Phone Number"
            ref={refs.phoneNumber}
            name="phoneNumber"
          />
          <div className="flex gap-2">
            <Button
              variant={'outline'}
              onClick={handeSendOtp}
              isLoading={isSendingPhoneCode}
            >
              Submit
            </Button>
            <DialogClose asChild>
              <Button variant={'ghost'}>Cancel</Button>
            </DialogClose>
          </div>
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <Input placeholder="OTP" ref={refs.otp} name="otp" />
          <Button
            variant={'outline'}
            onClick={handleVerifyOtp}
            isLoading={isVerifyingOtp}
          >
            Verify
          </Button>
        </>
      );
    }
    if (step === 3) {
      return (
        <>
          <Input
            type="password"
            placeholder="Password"
            ref={refs.password}
            name="password"
          />
          <Button
            variant={'outline'}
            onClick={handleVerifyPassword}
            isLoading={isVerifyingPass}
          >
            Verify
          </Button>
        </>
      );
    }
  }, [
    handeSendOtp,
    handleVerifyOtp,
    handleVerifyPassword,
    isSendingPhoneCode,
    isVerifyingOtp,
    isVerifyingPass,
    refs.otp,
    refs.password,
    refs.phoneNumber,
    step,
  ]);

  return (
    <Dialog
      defaultOpen
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="p-0 w-96"
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        <DialogHeader className="px-8 py-16">
          <DialogTitle asChild className="text-center">
            <div className="space-y-4">
              <img
                alt="telegram"
                src="https://api.iconify.design/logos/telegram.svg"
                className="w-20 h-20 mx-auto p-4 bg-accent rounded-xl"
              />
              <h1 className="text-2xl font-medium">
                {phoneNumber || 'Telegram'}
              </h1>
            </div>
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            Please enter your phone number to continue
          </DialogDescription>
        </DialogHeader>
        <div className="py-10 px-8 bg-accent/30 border-t space-y-4">
          {StepView}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TelegramProvider;
