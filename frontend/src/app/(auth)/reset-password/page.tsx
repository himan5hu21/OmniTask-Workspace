"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod/v4";
import { Eye, EyeOff, Lock, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { ButtonSpinner } from "@/components/ui/orbital-loader";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createZodResolver, Form, FormFieldError, handleApiFormError } from "@/lib/form";
import { useResetPasswordMutation } from "@/api/auth";
import { Logo } from "@/components/logo";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

// Validation schema
const resetPasswordSchema = z
  .object({
    password: z.string().min(3, { message: "Password must be at least 3 characters" }),
    confirmPassword: z.string().min(3, { message: "Please confirm your password" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordFormContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const resolver = createZodResolver<ResetPasswordFormValues>(resetPasswordSchema);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({ resolver });

  const resetPasswordMutation = useResetPasswordMutation();

  const onSubmit = (data: ResetPasswordFormValues) => {
    if (!token) {
      setError("password", { type: "manual", message: "Token is missing or invalid" });
      return;
    }

    resetPasswordMutation.mutate(
      { token, password: data.password },
      {
        onSuccess: () => {
          setIsSuccess(true);
        },
        onError: (err: unknown) => {
          handleApiFormError<ResetPasswordFormValues>({
            error: err,
            setError,
            fieldModes: {
              password: "inline",
              confirmPassword: "inline",
            },
            fieldMessages: {
              password: {
                INVALID: "Please enter a valid password.",
              },
            },
            fallbackMessage: "Failed to reset password. The link may have expired.",
          });
        },
      }
    );
  };

  // If token is missing, render an elegant warning state
  if (!token) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <div className="h-16 w-16 bg-yellow-500/10 text-yellow-500 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle size={36} />
        </div>
        
        <h2 className="text-xl font-bold text-foreground tracking-tight mb-2">Invalid Reset Link</h2>
        <p className="text-sm text-muted-foreground max-w-xs mb-8">
          This password reset link is missing a secure token or is malformed. Please request a new link.
        </p>

        <Link href="/forgot-password" className="w-full">
          <Button className="w-full h-11 bg-primary text-primary-foreground font-semibold rounded-lg flex items-center justify-center hover:bg-primary/90 transition-all shadow-md">
            Request new reset link
          </Button>
        </Link>
        <Link href="/login" className="mt-4 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors">
          Back to sign in
        </Link>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <div className="h-16 w-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse">
          <CheckCircle2 size={36} />
        </div>
        
        <h2 className="text-2xl font-bold text-foreground tracking-tight mb-2">Password reset successful</h2>
        <p className="text-sm text-muted-foreground max-w-xs mb-8">
          Your account password has been updated securely. You can now use your new password to sign in.
        </p>

        <Link href="/login" className="w-full">
          <Button className="w-full h-11 bg-primary text-primary-foreground font-semibold rounded-lg flex items-center justify-center hover:bg-primary/90 transition-all shadow-md group">
            <span className="flex items-center gap-2">
              Sign in with new password
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Header Section */}
      <CardHeader className="p-0 flex flex-col items-center mb-6 gap-0">
        <Logo showText={false} className="mb-4" href={null} />
        <h1 className="text-2xl font-bold text-foreground m-0 text-center tracking-tight">Reset password</h1>
        <p className="text-xs text-muted-foreground mt-2 text-center max-w-[280px]">
          Enter your new password below. Make sure it is at least 3 characters long.
        </p>
      </CardHeader>

      {/* Form */}
      <CardContent className="p-0">
        <Form onSubmit={handleSubmit(onSubmit)} errors={errors} className="flex flex-col gap-4">
          
          {/* New Password Input */}
          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest" htmlFor="password">New Password</Label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 h-5 w-5 text-muted-foreground pointer-events-none" />
              <Input 
                id="password" 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                className="pl-10 pr-10"
                {...register("password")}
              />
              <button 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center" 
                type="button"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <FormFieldError errors={errors} name="password" />
          </div>

          {/* Confirm Password Input */}
          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest" htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 h-5 w-5 text-muted-foreground pointer-events-none" />
              <Input 
                id="confirmPassword" 
                type={showConfirmPassword ? "text" : "password"} 
                placeholder="••••••••" 
                className="pl-10 pr-10"
                {...register("confirmPassword")}
              />
              <button 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center" 
                type="button"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <FormFieldError errors={errors} name="confirmPassword" />
          </div>

          {/* Submit Button */}
          <Button 
            className="w-full h-11 mt-2 bg-primary text-primary-foreground font-semibold rounded-lg flex items-center justify-center hover:bg-primary/90 transition-all shadow-md" 
            type="submit"
            disabled={resetPasswordMutation.isPending}
          >
            {resetPasswordMutation.isPending ? (
              <span className="flex items-center gap-2">
                <ButtonSpinner className="mr-2" />
                Resetting password...
              </span>
            ) : "Reset password"}
          </Button>
        </Form>
      </CardContent>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="h-screen w-full bg-background overflow-hidden">
      <ScrollArea className="h-full w-full">
        <div className="min-h-screen flex flex-col items-center justify-center p-4 py-8 font-sans antialiased relative">
          {/* Background Decorative Gradients */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
            <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px]" />
            <div className="absolute top-[60%] right-[-5%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
          </div>

          <main className="w-full max-w-md">
            {/* Surface Card */}
            <Card className="border-border shadow-2xl relative overflow-hidden bg-white dark:bg-card ring-0 p-6 gap-0">
              <Suspense fallback={
                <div className="flex flex-col items-center py-10 justify-center">
                  <ButtonSpinner className="h-8 w-8 text-primary" />
                  <p className="text-xs text-muted-foreground mt-4">Loading secure environment...</p>
                </div>
              }>
                <ResetPasswordFormContent />
              </Suspense>
            </Card>
          </main>
        </div>
      </ScrollArea>
    </div>
  );
}
