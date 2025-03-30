import { zodResolver } from '@hookform/resolvers/zod';
import { LucideIcon } from 'lucide-react';
import { useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@drivebase/web/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@drivebase/web/components/ui/dialog';
import { Input } from '@drivebase/web/components/ui/input';
import { Label } from '@drivebase/web/components/ui/label';

export type InputField = {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  validation?: z.ZodTypeAny;
  defaultValue?: string;
};

export type InputDialogOptions = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  inputFields: InputField[];
};

type FormData = Record<string, string>;

export async function inputDialog(options: InputDialogOptions): Promise<FormData | null> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    // Cleanup function
    const cleanup = () => {
      root.unmount();
      container.remove();
    };

    const DialogComponent = () => {
      const [isOpen, setIsOpen] = useState(true);

      // Dynamically create Zod schema based on input fields
      const schema = z.object(
        options.inputFields.reduce<z.ZodRawShape>(
          (acc, field) => ({
            ...acc,
            [field.name]: field.validation || z.string().min(1, `${field.label} is required`),
          }),
          {},
        ),
      );

      const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
      });

      const onSubmit = useCallback((data: FormData) => {
        setIsOpen(false);
        cleanup();
        resolve(data);
      }, []);

      const handleClose = useCallback(() => {
        setIsOpen(false);
        cleanup();
        resolve(null);
      }, []);

      const Icon = options.icon;

      return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
          <DialogContent className="p-0 w-96">
            <DialogHeader className="px-8 py-10">
              <DialogTitle asChild className="mx-auto text-2xl select-none text-center">
                <div>
                  {Icon && <Icon size={60} className="mx-auto mb-4 p-4 bg-muted rounded-xl" />}
                  <h1 className="text-2xl font-medium">{options.title}</h1>
                </div>
              </DialogTitle>
              {options.description && (
                <DialogDescription className="text-center">{options.description}</DialogDescription>
              )}
            </DialogHeader>
            <form
              className="py-8 px-6 bg-accent/30 border-t space-y-4"
              onSubmit={() => {
                form
                  .handleSubmit(onSubmit)()
                  .catch((error) => {
                    console.error(error);
                  });
              }}
            >
              {options.inputFields.map((field) => (
                <div className="space-y-1" key={field.name}>
                  <Label>{field.label}</Label>
                  <Input
                    type={field.type}
                    placeholder={field.placeholder}
                    defaultValue={field.defaultValue}
                    {...form.register(field.name)}
                  />
                </div>
              ))}

              <Button variant="outline" className="w-full mt-4" type="submit">
                Submit
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      );
    };

    // Mount the dialog component
    root.render(<DialogComponent />);
  });
}
