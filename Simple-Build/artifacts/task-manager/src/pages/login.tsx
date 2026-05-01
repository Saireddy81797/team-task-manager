import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const { user, isLoading, login, isLoggingIn } = useAuth();
  const [, setLocation] = useLocation();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading || user) return null;

  function onSubmit(values: z.infer<typeof loginSchema>) {
    login({ data: values });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md shadow-lg border-muted">
        <CardHeader className="space-y-2 text-center pb-6">
          <CardTitle className="text-3xl font-bold tracking-tight">Welcome back</CardTitle>
          <CardDescription>Enter your credentials to access your workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                {...form.register("email")}
                data-testid="input-email"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                {...form.register("password")}
                data-testid="input-password"
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={isLoggingIn}
              data-testid="button-submit"
            >
              {isLoggingIn ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center border-t p-6">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/signup" className="text-primary font-medium hover:underline" data-testid="link-signup">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
