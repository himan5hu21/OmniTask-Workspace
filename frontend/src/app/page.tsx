"use client";

import Link from "next/link";
import Image from "next/image";
import { Network, RefreshCw, MessageSquare, LayoutDashboard } from "lucide-react";
import { getToken } from "@/api/api";
import { useIsMounted, useServerValue } from "@/hooks/useIsMounted";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

function AuthButtons({ isMounted, isAuthenticated, mode = "header" }: { isMounted: boolean, isAuthenticated: boolean, mode?: "header" | "hero" }) {
  const isHeader = mode === "header";
  const buttonClass = isHeader 
    ? "px-4 text-base font-medium cursor-pointer rounded-md" 
    : "w-full sm:w-auto h-10 px-8 text-base font-medium cursor-pointer rounded-md";

  if (isMounted && isAuthenticated) {
    return (
      <Button size="lg" className={buttonClass} asChild>
        <Link href="/dashboard" className="flex items-center justify-center gap-2">
          <LayoutDashboard className={isHeader ? "h-4 w-4" : "h-5 w-5"} />
          Go to Dashboard
        </Link>
      </Button>
    );
  }

  const loginBtn = (
    <Button key="login" variant="outline" size="lg" className={buttonClass} asChild>
      <Link href="/login">Sign In</Link>
    </Button>
  );

  const registerBtn = (
    <Button key="register" size="lg" className={buttonClass} asChild>
      <Link href="/signup">Get Started</Link>
    </Button>
  );

  return (
    <>
      {isHeader ? (
        <>
          {loginBtn}
          {registerBtn}
        </>
      ) : (
        <>
          {registerBtn}
          {loginBtn}
        </>
      )}
    </>
  );
}

export default function LandingPage() {
  const isMounted = useIsMounted();
  const isAuthenticated = useServerValue(() => !!getToken(), false);

  return (
    <div className="bg-background text-foreground antialiased h-screen w-full overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="flex justify-between items-center px-6 py-4 max-w-full mx-auto">
          <Logo />
          <div className="hidden md:flex gap-2">
            <AuthButtons isMounted={isMounted} isAuthenticated={isAuthenticated} mode="header" />
          </div>
        </div>
      </header>


      <ScrollArea className="h-full w-full">
        {/* Main Content */}
        <main className="flex-grow pt-32 pb-24 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          
          {/* Hero Section */}
          <section className="text-center mb-32 max-w-4xl mx-auto">
            <h1 className="font-heading text-4xl md:text-5xl font-extrabold text-foreground mb-6 tracking-tight">
              Work together. Ship faster.
            </h1>
            <p className="font-sans text-base md:text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              Master your team&apos;s velocity with deep task hierarchies, synchronous
              real-time chat, and a frictionless interface designed for
              high-performance software engineering teams.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <AuthButtons isMounted={isMounted} isAuthenticated={isAuthenticated} mode="hero" />
            </div>
            
            {/* Dashboard Preview Image */}
            <div className="mt-20 relative w-full aspect-video rounded-xl border border-border overflow-hidden bg-muted shadow-2xl">
              <Image
                alt="Dashboard Interface Preview"
                className="w-full h-full object-cover opacity-80 mix-blend-luminosity"
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop"
                fill
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
            </div>
          </section>


          {/* Features Section */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-32">
            
            {/* Feature 1 */}
            <div className="bg-card rounded-xl p-8 border border-border relative overflow-hidden group hover:border-primary transition-colors">
              <div className="mb-6 h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-primary">
                <Network className="h-6 w-6" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-card-foreground mb-3">
                Deep Hierarchy
              </h3>
              <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                Structure complex projects with infinite nesting. Break down epics
                into actionable tasks without losing context or cluttering the view.
              </p>
              <div className="absolute -right-12 -bottom-12 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all"></div>
            </div>

            {/* Feature 2 */}
            <div className="bg-card rounded-xl p-8 border border-border relative overflow-hidden group hover:border-primary transition-colors">
              <div className="mb-6 h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-primary">
                <RefreshCw className="h-6 w-6" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-card-foreground mb-3">
                Real-time Sync
              </h3>
              <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                Instantly see updates across your entire team. No refreshing
                required. A single source of truth updated at the speed of thought.
              </p>
              <div className="absolute -right-12 -bottom-12 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all"></div>
            </div>

            {/* Feature 3 */}
            <div className="bg-card rounded-xl p-8 border border-border relative overflow-hidden group hover:border-primary transition-colors">
              <div className="mb-6 h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-primary">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-card-foreground mb-3">
                Team Chat
              </h3>
              <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                Contextual discussions right alongside your tasks. Keep
                conversations tied to the work, eliminating context switching and
                lost decisions.
              </p>
              <div className="absolute -right-12 -bottom-12 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all"></div>
            </div>

          </section>
        </div>
      </main>

      <footer className="w-full border-t mt-auto border-border bg-background">
        <div className="flex flex-col md:flex-row justify-between items-center px-8 py-12 gap-6 w-full max-w-7xl mx-auto">
          <Logo showText={false} />
          <nav className="flex flex-wrap justify-center gap-6">
            <Link href="#" className="font-sans text-sm text-muted-foreground hover:text-primary transition-colors duration-200">
              Privacy Policy
            </Link>
            <Link href="#" className="font-sans text-sm text-muted-foreground hover:text-primary transition-colors duration-200">
              Terms of Service
            </Link>
            <Link href="#" className="font-sans text-sm text-muted-foreground hover:text-primary transition-colors duration-200">
              Security
            </Link>
            <Link href="#" className="font-sans text-sm text-muted-foreground hover:text-primary transition-colors duration-200">
              Status
            </Link>
          </nav>
          <div className="font-sans text-sm text-muted-foreground">
            © {new Date().getFullYear()} OmniTask. Engineered for velocity.
          </div>
        </div>
        </footer>
      </ScrollArea>
    </div>
  );
}
