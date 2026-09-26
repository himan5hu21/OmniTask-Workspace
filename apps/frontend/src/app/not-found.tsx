"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Search, Ghost } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background px-4 text-center">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-md"
      >
        {/* Icon/Illustration Area */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <motion.div
              animate={{ 
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="flex h-24 w-24 items-center justify-center rounded-3xl bg-muted/50 text-primary shadow-xl"
            >
              <Ghost className="h-12 w-12" />
            </motion.div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
            >
              <Search className="h-4 w-4" />
            </motion.div>
          </div>
        </div>

        {/* Text Content */}
        <h1 className="mb-3 text-7xl font-black tracking-tighter text-foreground sm:text-8xl">
          404
        </h1>
        <h2 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl">
          Lost in the workspace?
        </h2>
        <p className="mb-10 text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved to another channel. Let&apos;s get you back to safety.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="h-12 gap-2 rounded-xl px-8 shadow-md transition-all hover:-translate-y-px active:scale-95">
            <Link href="/dashboard">
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
          
          <Button 
            variant="outline" 
            size="lg" 
            className="h-12 gap-2 rounded-xl px-8 transition-all hover:bg-muted/50 active:scale-95"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </div>
      </motion.div>

      {/* Footer Branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-8 text-sm font-medium text-muted-foreground/60"
      >
        OmniTask Workspace &copy; {new Date().getFullYear()}
      </motion.div>
    </div>
  );
}
