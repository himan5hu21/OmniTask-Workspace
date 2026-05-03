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
    <div className={cn("text-xl font-black tracking-tighter text-primary flex items-center gap-2", className)}>
      <Zap className={cn("h-6 w-6 fill-current", iconClassName)} />
      {showText && <span>OmniTask</span>}
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
