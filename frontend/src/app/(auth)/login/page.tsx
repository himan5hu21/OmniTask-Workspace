"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod/v4";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { ButtonSpinner } from "@/components/ui/orbital-loader";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createZodResolver, Form, FormFieldError, handleApiFormError } from "@/lib/form";
import { useLoginMutation } from "@/api/auth";
import { Logo } from "@/components/logo";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

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
              {/* Header Section */}
              <CardHeader className="p-0 flex flex-col items-center mb-6 gap-0">
                <Logo showText={false} className="mb-4" href={null} />
                <h1 className="text-2xl font-bold text-foreground m-0 text-center tracking-tight">Welcome back</h1>
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

                  {/* Password Input */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest" htmlFor="password">Password</Label>
                      <a className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors" href="#">Forgot password?</a>
                    </div>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-3 h-5 w-5 text-muted-foreground pointer-events-none" />
                        <Input 
                          id="password" 
                          type={showPassword ? "text" : "password"} 
                          autoComplete="current-password"
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

                  {/* Submit Button */}
                  <Button 
                    className="w-full h-11 mt-2 bg-primary text-primary-foreground font-semibold rounded-lg flex items-center justify-center hover:bg-primary/90 transition-all shadow-md" 
                    type="submit"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <ButtonSpinner className="mr-2" />
                        Signing in...
                      </span>
                    ) : "Sign in"}
                  </Button>
                </Form>

                {/* Divider */}
                <div className="flex items-center gap-4 my-6">
                  <div className="h-px bg-border flex-1"></div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">OR</span>
                  <div className="h-px bg-border flex-1"></div>
                </div>

                {/* Footer Action */}
                <p className="text-center text-sm text-muted-foreground m-0">
                  Don&apos;t have an account? <Link className="text-primary hover:text-primary/80 transition-colors ml-1 font-semibold" href="/signup">Create an account</Link>
                </p>
              </CardContent>
            </Card>
          </main>
        </div>
      </ScrollArea>
    </div>
  );
}

