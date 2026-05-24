"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import * as z from "zod/v4";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { ButtonSpinner } from "@/components/ui/orbital-loader";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createZodResolver, Form, FormFieldError, handleApiFormError } from "@/lib/form";
import { useForgotPasswordMutation } from "@/api/auth";
import { Logo } from "@/components/logo";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

// Validation schema
const forgotPasswordSchema = z.object({
  email: z.email({ message: "Invalid email address" }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const resolver = createZodResolver<ForgotPasswordFormValues>(forgotPasswordSchema);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({ resolver });

  const forgotPasswordMutation = useForgotPasswordMutation();

  const onSubmit = (data: ForgotPasswordFormValues) => {
    forgotPasswordMutation.mutate(data, {
      onSuccess: () => {
        setSubmittedEmail(data.email);
        setIsSuccess(true);
      },
      onError: (err: unknown) => {
        handleApiFormError<ForgotPasswordFormValues>({
          error: err,
          setError,
          fieldModes: {
            email: "inline",
          },
          fieldMessages: {
            email: {
              INVALID: "Please enter a valid email address.",
            },
          },
          fallbackMessage: "Failed to process request. Please try again.",
        });
      },
    });
  };

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
              
              {!isSuccess ? (
                <>
                  {/* Header Section */}
                  <CardHeader className="p-0 flex flex-col items-center mb-6 gap-0">
                    <Logo showText={false} className="mb-4" href={null} />
                    <h1 className="text-2xl font-bold text-foreground m-0 text-center tracking-tight">Forgot password?</h1>
                    <p className="text-xs text-muted-foreground mt-2 text-center max-w-[280px]">
                      Enter your email address and we will send you a secure link to reset your password.
                    </p>
                  </CardHeader>

                  {/* Form */}
                  <CardContent className="p-0">
                    <Form onSubmit={handleSubmit(onSubmit)} errors={errors} className="flex flex-col gap-4">
                      {/* Email Input */}
                      <div className="flex flex-col gap-2">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest" htmlFor="email">Email address</Label>
                        <div className="relative flex items-center">
                          <Mail className="absolute left-3 h-5 w-5 text-muted-foreground pointer-events-none" />
                          <Input 
                            id="email" 
                            type="email" 
                            autoComplete="email"
                            placeholder="name@company.com" 
                            className="pl-10"
                            {...register("email")}
                          />
                        </div>
                        <FormFieldError errors={errors} name="email" />
                      </div>

                      {/* Submit Button */}
                      <Button 
                        className="w-full h-11 mt-2 bg-primary text-primary-foreground font-semibold rounded-lg flex items-center justify-center hover:bg-primary/90 transition-all shadow-md" 
                        type="submit"
                        disabled={forgotPasswordMutation.isPending}
                      >
                        {forgotPasswordMutation.isPending ? (
                          <span className="flex items-center gap-2">
                            <ButtonSpinner className="mr-2" />
                            Sending reset link...
                          </span>
                        ) : "Send reset link"}
                      </Button>
                    </Form>

                    {/* Back to Login Footer Action */}
                    <div className="flex justify-center mt-6">
                      <Link 
                        className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-medium" 
                        href="/login"
                      >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Back to sign in
                      </Link>
                    </div>
                  </CardContent>
                </>
              ) : (
                <>
                  {/* Success View */}
                  <div className="flex flex-col items-center py-4 text-center">
                    <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6 animate-bounce shadow-inner">
                      <CheckCircle2 size={36} />
                    </div>
                    
                    <h2 className="text-2xl font-bold text-foreground tracking-tight mb-2">Check your email</h2>
                    <p className="text-sm text-muted-foreground max-w-xs mb-8">
                      If an account exists with <strong className="text-foreground font-semibold">{submittedEmail}</strong>, we have sent a secure password reset link to your inbox.
                    </p>

                    <div className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl p-4 mb-8 text-xs text-muted-foreground leading-relaxed text-left">
                      <p className="font-semibold text-foreground uppercase tracking-widest text-[9px] mb-1.5">Didn&apos;t get the email?</p>
                      <ul className="list-disc pl-4 space-y-1.5">
                        <li>Check your spam, promotions or junk folder.</li>
                        <li>Verify that you entered the correct email address.</li>
                        <li>Wait a few minutes, or try again.</li>
                      </ul>
                    </div>

                    <Link href="/login" className="w-full">
                      <Button className="w-full h-11 bg-primary text-primary-foreground font-semibold rounded-lg flex items-center justify-center hover:bg-primary/90 transition-all shadow-md">
                        Return to sign in
                      </Button>
                    </Link>
                  </div>
                </>
              )}

            </Card>
          </main>
        </div>
      </ScrollArea>
    </div>
  );
}
