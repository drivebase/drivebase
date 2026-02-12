import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DialogState = {
  open: boolean;
  title: string;
  description: string;
  resolve: ((confirmed: boolean) => void) | null;
};

let openConfirmDialog:
  | ((title: string, description: string, resolve: (confirmed: boolean) => void) => void)
  | null = null;

export function confirmDialog(title: string, description: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!openConfirmDialog) {
      resolve(false);
      return;
    }
    openConfirmDialog(title, description, resolve);
  });
}

export function ConfirmDialogHost() {
  const [state, setState] = useState<DialogState>({
    open: false,
    title: "",
    description: "",
    resolve: null,
  });

  useEffect(() => {
    openConfirmDialog = (title, description, resolve) => {
      setState({
        open: true,
        title,
        description,
        resolve,
      });
    };

    return () => {
      openConfirmDialog = null;
    };
  }, []);

  const close = (confirmed: boolean) => {
    const resolver = state.resolve;
    setState((prev) => ({ ...prev, open: false, resolve: null }));
    resolver?.(confirmed);
  };

  return (
    <AlertDialog open={state.open} onOpenChange={(open) => !open && close(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state.title}</AlertDialogTitle>
          <AlertDialogDescription>{state.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => close(true)}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
