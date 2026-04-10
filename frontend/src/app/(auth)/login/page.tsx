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
import { useLoginMutation } from "@/services/auth.service";

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

  const loginMutation = useLoginMutation({
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

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      {/* Background Decorative Gradients (Matching Dashboard style) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[10%] -left-[5%] w-[400px] h-[400px] bg-indigo-100/60 rounded-full blur-[120px]" />
        <div className="absolute top-[60%] -right-[5%] w-[500px] h-[500px] bg-blue-100/60 rounded-full blur-[120px]" />
      </div>

      {/* Main Login Card */}
      <Card className="w-full max-w-[420px] mx-4 shadow-2xl shadow-indigo-100/50 border-slate-200/60 bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
        
        {/* Subtle top color bar like Dashboard cards */}
        <div className="h-1.5 w-full bg-linear-to-r from-indigo-500 to-blue-500"></div>

        <CardHeader className="space-y-4 pt-8 pb-6 text-center">
          {/* Logo - Matched with Dashboard */}
          <div className="flex justify-center mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-indigo-600 to-blue-600 shadow-md shadow-indigo-200">
              <LayoutGrid className="h-6 w-6 text-white" />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900">
              Welcome back
            </CardTitle>
            <CardDescription className="text-slate-500 text-base font-medium">
              Sign in to your OmniTask workspace.
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="px-8 pb-8">
          <Form onSubmit={handleSubmit(onSubmit)} errors={errors} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-semibold text-sm">Email address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@company.com" 
                className="h-12 text-base rounded-xl border-slate-300 focus-visible:ring-indigo-500 bg-slate-50 focus:bg-white transition-colors"
                {...register("email")} 
              />
              <FormFieldError errors={errors} name="email" />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-700 font-semibold text-sm">Password</Label>
                <a href="#" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition-all">
                  Forgot password?
                </a>
              </div>
              
              {/* Password Input with Eye Icon */}
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••"
                  className="h-12 text-base rounded-xl border-slate-300 focus-visible:ring-indigo-500 bg-slate-50 focus:bg-white transition-colors pr-10" 
                  {...register("password")} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors p-1 rounded-md"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <FormFieldError errors={errors} name="password" />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200/50 transition-all font-medium text-base"
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
          
          <div className="mt-8 text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <a href="/register" className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition-all">
              Sign up
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}