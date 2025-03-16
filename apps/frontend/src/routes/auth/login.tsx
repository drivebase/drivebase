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
import { LoginUserDto } from '@drivebase/internal/auth/dtos/login.user.dto';
import { useLoginMutation } from '@drivebase/react/lib/redux/endpoints/auth';
import { toast } from 'sonner';

function Page() {
  const router = useRouter();
  const [login, { isLoading }] = useLoginMutation();

  const form = useForm<LoginUserDto>({
    resolver: classValidatorResolver(LoginUserDto),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  function onSubmit(data: LoginUserDto) {
    login({ ...data })
      .unwrap()
      .then((res) => {
        router.navigate({ to: '/', reloadDocument: true });
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
            <CardTitle className="text-xl">Welcome, back!</CardTitle>
            <CardDescription>
              Enter your email and password to login.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-3">
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
                    Remember me
                  </label>
                </div>

                <Link
                  to="/auth/forget-password"
                  className="text-sm text-muted-foreground"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="space-y-2">
                <Button className="w-full" disabled={isLoading}>
                  Login
                </Button>

                <Button
                  className="w-full"
                  variant="outline"
                  type="button"
                  asChild
                >
                  <Link to="/auth/register">Don&apos;t have an account?</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Form>
  );
}

export const Route = createFileRoute('/auth/login')({
  component: Page,
});
