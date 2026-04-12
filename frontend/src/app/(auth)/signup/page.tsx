// src/app/(auth)/register/page.tsx
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
import { useRegisterMutation } from "@/services/auth.service";

// Register Schema (Password match check sathe)
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

  const registerMutation = useRegisterMutation({
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

  const onSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-background font-sans text-foreground overflow-hidden py-10 px-4">
      
      {/* Background Decorative Gradients (Matched with Login) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[10%] -left-[5%] w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] -right-[5%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
      </div>

      {/* Main Register Card */}
      <Card className="w-full max-w-[420px] shadow-2xl shadow-primary/10 border-border/60 bg-background/90 backdrop-blur-xl rounded-2xl overflow-hidden">
        
        {/* Subtle top color bar */}
        <div className="h-1.5 w-full bg-linear-to-r from-indigo-500 to-blue-500"></div>

        <CardHeader className="space-y-4 pt-8 pb-4 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-indigo-600 to-blue-600 shadow-md shadow-indigo-200">
              <LayoutGrid className="h-6 w-6 text-white" />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <CardTitle className="text-2xl font-extrabold tracking-tight text-foreground">
              Create an account
            </CardTitle>
            <CardDescription className="text-muted-foreground text-base font-medium">
              Join OmniTask and start collaborating.
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="px-8 pb-8">
          <Form onSubmit={handleSubmit(onSubmit)} errors={errors} className="space-y-4">

            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground font-semibold text-sm">Full Name</Label>
              <Input 
                id="name" 
                placeholder="John Doe" 
                className="h-11 px-4 text-base rounded-xl bg-background border-input shadow-sm hover:border-ring/50 focus-visible:ring-4 focus-visible:ring-ring/15 transition-all"
                {...register("name")} 
              />
              <FormFieldError errors={errors} name="name" />
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-semibold text-sm">Email address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@company.com" 
                className="h-11 px-4 text-base rounded-xl bg-background border-input shadow-sm hover:border-ring/50 focus-visible:ring-4 focus-visible:ring-ring/15 transition-all"
                {...register("email")} 
              />
              <FormFieldError errors={errors} name="email" />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-semibold text-sm">Password</Label>
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

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground font-semibold text-sm">Confirm Password</Label>
              <div className="relative">
                <Input 
                  id="confirmPassword" 
                  type={showConfirmPassword ? "text" : "password"} 
                  placeholder="••••••••"
                  className="h-11 px-4 text-base rounded-xl bg-background border-input shadow-sm hover:border-ring/50 focus-visible:ring-4 focus-visible:ring-ring/15 transition-all pr-12"
                  {...register("confirmPassword")} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md flex items-center justify-center"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <FormFieldError errors={errors} name="confirmPassword" />
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full h-11 mt-4 rounded-xl shadow-md transition-all font-semibold text-base"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating account...
                </span>
              ) : (
                "Sign up"
              )}
            </Button>
          </Form>
          
          <div className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <a href="/login" className="font-semibold text-primary hover:text-primary/80 hover:underline transition-all">
              Sign in
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}