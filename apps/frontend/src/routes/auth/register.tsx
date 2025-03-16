import { createFileRoute, Link, useRouter } from '@tanstack/react-router';

import { Input } from '@drivebase/react/components/input';
import { Button } from '@drivebase/react/components/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@drivebase/react/components/form';
import { useForm } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@drivebase/react/components/card';
import { Checkbox } from '@drivebase/react/components/checkbox';
import { DotPattern } from '@drivebase/react/components/dot-pattern';
import { cn } from '@drivebase/react/lib/utils';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { CreateUserDto } from '@drivebase/internal/auth/dtos/create.user.dto';
import { useRegisterMutation } from '@drivebase/react/lib/redux/endpoints/auth';
import { toast } from 'sonner';

function Page() {
  const r = useRouter();
  const [register, { isLoading }] = useRegisterMutation();

  const form = useForm<CreateUserDto>({
    resolver: classValidatorResolver(CreateUserDto),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  function onSubmit(data: CreateUserDto) {
    register({ ...data })
      .unwrap()
      .then(() => {
        toast.success('Account created successfully');
        r.navigate({ to: '/auth/login' });
      })
      .catch((err) => {
        toast.error(err.data?.message ?? 'An unknown error occurred');
      });
  }

  return (
    <Form {...form}>
      <div className="h-screen flex justify-center bg-accent items-center gap-6 overflow-hidden relative">
        <DotPattern
          className={cn(
            '[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]'
          )}
        />
        <Card className="w-96 z-10">
          <CardHeader>
            <CardTitle className="text-xl">Create an account</CardTitle>
            <CardDescription>
              Enter your details to create an account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="you@domain.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="terms" />
                  <label
                    htmlFor="terms"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I agree to the Terms and Conditions
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Button className="w-full" disabled={isLoading}>
                  Register
                </Button>

                <Button
                  className="w-full"
                  variant="outline"
                  type="button"
                  asChild
                >
                  <Link to="/auth/login">Already have an account?</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Form>
  );
}

export const Route = createFileRoute('/auth/register')({
  component: Page,
});
