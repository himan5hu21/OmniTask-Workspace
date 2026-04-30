// src/app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod/v4";
import { Eye, EyeOff, LayoutGrid, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createZodResolver, Form, FormFieldError, handleApiFormError } from "@/lib/form";
import { useLoginMutation } from "@/api/auth";

// Validation schema
const loginSchema = z.object({
  email: z.email({ message: "Invalid email address" }),
  password: z.string().min(3, { message: "Password must be at least 3 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const resolver = createZodResolver<LoginFormValues>(loginSchema);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver });

  const loginMutation = useLoginMutation();
  
  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data, {
      onSuccess: () => {
        router.push("/dashboard");
      },
      onError: (err: unknown) => {
        handleApiFormError<LoginFormValues>({
          error: err,
          setError,
          fieldModes: {
            email: "inline",
            password: "inline",
          },
          fieldMessages: {
            email: {
              INVALID: "Please enter a valid email address.",
              UNIQUE: "This email is already in use.",
            },
            password: {
              INVALID: "Please enter a valid password.",
              MIN_LENGTH: "Password must be at least 3 characters.",
            },
          },
          fallbackMessage: "Login failed. Please try again.",
        });
      },
    });
  };


  return (
    <div className="relative flex items-center justify-center min-h-screen bg-background font-sans text-foreground overflow-hidden">
      
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[10%] -left-[5%] w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute top-[60%] -right-[5%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
      </div>

      {/* Main Login Card */}
      <Card className="w-full max-w-[420px] mx-4 shadow-2xl shadow-primary/5 border-border/50 bg-background/95 backdrop-blur-xl rounded-2xl overflow-hidden">
        
        {/* Subtle top color bar */}
        <div className="h-1.5 w-full bg-linear-to-r from-primary to-primary/50"></div>

        <CardHeader className="space-y-4 pt-8 pb-6 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/20">
              <LayoutGrid className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <CardTitle className="text-2xl font-extrabold tracking-tight text-foreground">
              Welcome back
            </CardTitle>
            <CardDescription className="text-muted-foreground text-base font-medium">
              Sign in to your OmniTask workspace.
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="px-8 pb-8">
          <Form onSubmit={handleSubmit(onSubmit)} errors={errors} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2 transition-all duration-300">
              <Label htmlFor="email" className="text-foreground font-semibold text-sm">Email address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@company.com" 
                className="h-11 px-4 text-base rounded-xl bg-background border-input shadow-sm hover:border-ring/50 focus-visible:ring-4 focus-visible:ring-ring/15 transition-all"
                {...register("email")} 
              />
              <FormFieldError errors={errors} name="email"/>
            </div>

            {/* Password Field */}
            <div className="space-y-2 transition-all duration-300">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-foreground font-semibold text-sm">Password</Label>
                <a href="#" className="text-sm font-semibold text-primary hover:text-primary/80 hover:underline transition-all">
                  Forgot password?
                </a>
              </div>
              
              {/* Password Input with Eye Icon */}
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••"
                  className="h-11 px-4 text-base rounded-xl bg-background border-input shadow-sm hover:border-ring/50 focus-visible:ring-4 focus-visible:ring-ring/15 transition-all pr-12" 
                  {...register("password")} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md flex items-center justify-center"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <FormFieldError errors={errors} name="password" />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-11 mt-4 rounded-xl shadow-md transition-all font-semibold text-base"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
            
          </Form>
          
          <div className="mt-8 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <a href="/signup" className="font-semibold text-primary hover:text-primary/80 hover:underline transition-all">
              Sign up
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
