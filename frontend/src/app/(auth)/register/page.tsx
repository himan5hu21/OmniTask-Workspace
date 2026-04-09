// src/app/(auth)/register/page.tsx
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
    <div className="relative flex items-center justify-center min-h-screen bg-slate-50 overflow-hidden py-10">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[500px] h-[500px] bg-blue-200/50 rounded-full blur-[100px]" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[500px] h-[500px] bg-indigo-200/50 rounded-full blur-[100px]" />
      </div>

      <Card className="w-full max-w-md mx-4 shadow-xl border-slate-200/60 bg-white/80 backdrop-blur-xl">
        <CardHeader className="space-y-3 pb-6 text-center">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-2xl tracking-tighter">O</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Create an account</CardTitle>
          <CardDescription className="text-slate-500 font-medium">Join OmniTask and start collaborating.</CardDescription>
        </CardHeader>
        
        <CardContent>
          <Form onSubmit={handleSubmit(onSubmit)} errors={errors} className="space-y-4">

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="John Doe" className="bg-white/50" {...register("name")} />
              <FormFieldError errors={errors} name="name" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="name@company.com" className="bg-white/50" {...register("email")} />
              <FormFieldError errors={errors} name="email" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" className="bg-white/50 pr-10" {...register("password")} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <FormFieldError errors={errors} name="password" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" className="bg-white/50 pr-10" {...register("confirmPassword")} />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <FormFieldError errors={errors} name="confirmPassword" />
            </div>

            <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-md mt-2" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? "Creating account..." : "Sign up"}
            </Button>
          </Form>
          
          <div className="mt-6 text-center text-sm text-slate-500">
            Already have an account? <a href="/login" className="font-semibold text-slate-900 hover:underline">Sign in</a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
