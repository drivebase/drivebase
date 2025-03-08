'use client';

import Link from 'next/link';
import { Input } from '@xilehq/ui/components/input';
import { Button } from '@xilehq/ui/components/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@xilehq/ui/components/form';
import { useForm } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@xilehq/ui/components/card';
import { Checkbox } from '@xilehq/ui/components/checkbox';
import { DotPattern } from '@xilehq/ui/components/dot-pattern';
import { cn } from '@xilehq/ui/lib/utils';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { LoginUserDto } from '@xilehq/internal/auth/dtos/login.user.dto';
import { useLoginMutation } from '@xilehq/ui/lib/redux/endpoints/auth';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

function Page() {
  const r = useRouter();
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
      .then(() => {
        r.push('/');
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
                  href="/auth/forgot-password"
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
                  <Link href="/auth/register">Don&apos;t have an account?</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Form>
  );
}

export default Page;
