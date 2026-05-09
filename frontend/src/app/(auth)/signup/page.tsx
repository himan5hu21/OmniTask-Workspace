"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod/v4";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { ButtonSpinner } from "@/components/ui/orbital-loader";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createZodResolver, Form, FormFieldError, handleApiFormError } from "@/lib/form";
import { useRegisterMutation } from "@/api/auth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Logo } from "@/components/logo";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Register Schema
const registerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.email({ message: "Invalid email address" }),
  password: z.string().min(3, { message: "Password must be at least 3 characters" }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const resolver = createZodResolver<RegisterFormValues>(registerSchema);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver });

  const registerMutation = useRegisterMutation();

  const onSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(data, {
      onSuccess: () => {
        router.push("/dashboard");
      },
      onError: (err: unknown) => {
        handleApiFormError<RegisterFormValues>({
          error: err,
          setError,
          fieldModes: {
            name: "inline",
            email: "inline",
            password: "inline",
            confirmPassword: "inline",
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
          fallbackMessage: "Registration failed. Please try again.",
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
            <div className="absolute top-[10%] left-[-5%] w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[10%] right-[-5%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
          </div>

          <main className="w-full max-w-md">
            <Card className="border-border shadow-2xl relative overflow-hidden bg-white dark:bg-card ring-0 p-6 gap-0">
              <CardHeader className="p-0 flex flex-col items-center mb-6 gap-0">
                <Logo showText={false} className="mb-4" href={null} />
                <h1 className="text-2xl font-bold text-foreground mb-1 tracking-tight">Create your account</h1>
                <p className="text-sm text-muted-foreground">OmniTask. Engineered for velocity.</p>
              </CardHeader>

              <CardContent className="p-0 relative z-10">
                <Form onSubmit={handleSubmit(onSubmit)} errors={errors} className="flex flex-col gap-4">
                  {/* Name Input */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest" htmlFor="name">Full Name</Label>
                    <div className="relative flex items-center">
                      <User className="absolute left-3 h-5 w-5 text-muted-foreground pointer-events-none" />
                        <Input 
                          id="name" 
                          placeholder="John Doe" 
                          autoComplete="name"
                          className="pl-10"
                          {...register("name")}
                        />
                    </div>
                    <FormFieldError errors={errors} name="name" />
                  </div>

                  {/* Email Input */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest" htmlFor="email">Email Address</Label>
                    <div className="relative flex items-center">
                      <Mail className="absolute left-3 h-5 w-5 text-muted-foreground pointer-events-none" />
                        <Input 
                          id="email" 
                          type="email" 
                          placeholder="john@example.com" 
                          autoComplete="email"
                          className="pl-10"
                          {...register("email")}
                        />
                    </div>
                    <FormFieldError errors={errors} name="email" />
                  </div>

                  {/* Password Input */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest" htmlFor="password">Password</Label>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-3 h-5 w-5 text-muted-foreground pointer-events-none" />
                        <Input 
                          id="password" 
                          type={showPassword ? "text" : "password"} 
                          placeholder="••••••••" 
                          autoComplete="new-password"
                          className="pl-10 pr-12"
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
                          autoComplete="new-password"
                          className="pl-10 pr-12"
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

                  <Button 
                    className="w-full h-11 bg-primary text-primary-foreground font-semibold rounded-lg mt-2 hover:bg-primary/90 transition-all shadow-md active:scale-[0.98]" 
                    type="submit"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <ButtonSpinner className="mr-2" />
                        Creating account...
                      </span>
                    ) : "Sign up"}
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
                  Already have an account? 
                  <Link className="text-primary hover:text-primary/80 font-semibold transition-colors ml-1" href="/login">Sign in</Link>
                </p>
              </CardContent>
            </Card>
          </main>
        </div>
      </ScrollArea>
    </div>
  );
}
