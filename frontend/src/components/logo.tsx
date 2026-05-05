import Link from "next/link";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  iconClassName?: string;
  showText?: boolean;
  href?: string | null;
}

export function Logo({ 
  className, 
  iconClassName,
  showText = true, 
  href = "/"
}: LogoProps) {
  const content = (
    <div className={cn("flex items-center gap-2.5 group transition-all", className)}>
      <div className={cn(
        "flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary/80 text-primary-foreground shadow-[0_4px_16px_rgba(var(--primary),0.2)] transition-transform group-hover:scale-105",
        iconClassName
      )}>
        <Zap className="h-6 w-6 fill-current" />
      </div>
      {showText && (
        <span className="text-xl font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
          OmniTask
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center">
        {content}
      </Link>
    );
  }

  return content;
}
