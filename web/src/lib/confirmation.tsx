import { AlertDialog, Button } from "@heroui/react";
import { useEffect, useState } from "react";

type ConfirmationOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
};

type ConfirmationRequest = ConfirmationOptions & {
  resolve: (value: boolean) => void;
};

let openConfirmation: ((opts: ConfirmationOptions) => Promise<boolean>) | null = null;

export function askConfirmation(
  title: string,
  description: string,
  options?: Pick<ConfirmationOptions, "confirmLabel" | "cancelLabel" | "variant">,
): Promise<boolean> {
  if (!openConfirmation) return Promise.resolve(false);
  return openConfirmation({ title, description, ...options });
}

export function ConfirmationDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [request, setRequest] = useState<ConfirmationRequest | null>(null);

  useEffect(() => {
    openConfirmation = (opts) =>
      new Promise((resolve) => {
        setRequest({ ...opts, resolve });
        setIsOpen(true);
      });

    return () => {
      openConfirmation = null;
    };
  }, []);

  function handleConfirm() {
    request?.resolve(true);
    setIsOpen(false);
  }

  function handleCancel() {
    request?.resolve(false);
    setIsOpen(false);
  }

  return (
    <AlertDialog isOpen={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[400px]">
            <AlertDialog.CloseTrigger onPress={handleCancel} />
            <AlertDialog.Header>
              <AlertDialog.Icon status={request?.variant ?? "danger"} />
              <AlertDialog.Heading>{request?.title}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>{request?.description}</p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button variant="tertiary" onPress={handleCancel}>
                {request?.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                variant={request?.variant ?? "danger"}
                onPress={handleConfirm}
              >
                {request?.confirmLabel ?? "Confirm"}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
