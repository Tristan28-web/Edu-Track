"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";

const formSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type FormData = z.infer<typeof formSchema>;

export function LoginForm() {
  const { loginWithUsername, role: loggedInRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttemptCompleted, setLoginAttemptCompleted] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: FormData) {
    setIsLoading(true);
    setLoginAttemptCompleted(false);
    try {
      await loginWithUsername(values.username, values.password);
      setLoginAttemptCompleted(true);
    } catch (error) {
      setLoginAttemptCompleted(false);
    } finally {
      setIsLoading(false);
    }
  }
  
  useEffect(() => {
    if (loginAttemptCompleted && !authLoading && loggedInRole) {
      toast({
        title: "Login Successful",
        description: `Welcome back! Redirecting to your ${loggedInRole} dashboard.`,
      });
      router.push(`/${loggedInRole}/dashboard`);
      setLoginAttemptCompleted(false);
    }
  }, [loginAttemptCompleted, authLoading, loggedInRole, router]);


  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Login to Edu-Track</CardTitle>
        <CardDescription>Enter your credentials to access your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" autoComplete="off">
            {/* Hidden dummy inputs to prevent browser autofill/credential suggestions from showing on the visible fields */}
            <input type="text" name="prevent-username" autoComplete="username" tabIndex={-1} aria-hidden style={{position: "absolute", left: "-9999px", top: "auto", width: "1px", height: "1px", opacity: 0}} />
            <input type="password" name="prevent-password" autoComplete="new-password" tabIndex={-1} aria-hidden style={{position: "absolute", left: "-9999px", top: "auto", width: "1px", height: "1px", opacity: 0}} />
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    {/* set autoComplete off on visible inputs; hidden inputs above absorb autofill */}
                    <Input {...field} disabled={isLoading} autoComplete="off" />
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
                  <div className="relative">
                    <FormControl>
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        {...field} 
                        disabled={isLoading}
                        className="pr-10"
                        autoComplete="new-password"
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((prev) => !prev)}
                      disabled={isLoading}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
