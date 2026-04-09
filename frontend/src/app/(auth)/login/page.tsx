// src/app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod/v4";
import { Eye, EyeOff } from "lucide-react";

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
    <div className="relative flex items-center justify-center min-h-screen bg-slate-50 overflow-hidden">
      
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[500px] h-[500px] bg-blue-200/50 rounded-full blur-[100px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[500px] h-[500px] bg-indigo-200/50 rounded-full blur-[100px]" />
      </div>

      {/* Main Login Card */}
      <Card className="w-full max-w-md mx-4 shadow-xl border-slate-200/60 bg-white/80 backdrop-blur-xl">
        <CardHeader className="space-y-3 pb-6 text-center">
          {/* Logo Placeholder */}
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-2xl tracking-tighter">O</span>
            </div>
          </div>
          
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            Sign in to OmniTask
          </CardTitle>
          <CardDescription className="text-slate-500 font-medium">
            Welcome back! Please enter your details.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Form onSubmit={handleSubmit(onSubmit)} errors={errors} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@company.com" 
                className="bg-white/50 focus:bg-white transition-colors"
                {...register("email")} 
              />
              <FormFieldError errors={errors} name="email" />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-700">Password</Label>
                <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-500 transition-colors">
                  Forgot password?
                </a>
              </div>
              
              {/* 👈 Password Input with Eye Icon */}
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••"
                  className="bg-white/50 focus:bg-white transition-colors pr-10" 
                  {...register("password")} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <FormFieldError errors={errors} name="password" />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-md transition-all active:scale-[0.98]"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
            
          </Form>
          
          <div className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <a href="/register" className="font-semibold text-slate-900 hover:underline transition-all">
              Sign up
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
