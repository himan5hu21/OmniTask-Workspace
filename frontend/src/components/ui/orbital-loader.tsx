"use client";

import { cn } from "@/lib/utils";

// --- ButtonSpinner ---

interface ButtonSpinnerProps {
  size?: "xs" | "sm" | "md";
  className?: string;
}

const buttonSpinnerSizes = {
  xs: "w-3 h-3 border",
  sm: "w-4 h-4 border-[1.5px]",
  md: "w-5 h-5 border-2",
};

/**
 * A lightweight spinning ring intended for use inside buttons.
 * Inherits the button's text color via `currentColor` so it always
 * matches — no extra color props needed.
 */
export function ButtonSpinner({ size = "sm", className }: ButtonSpinnerProps) {
  return (
    <span
      className={cn(
        "inline-block animate-spin rounded-full",
        "border-current/25 border-t-current",
        buttonSpinnerSizes[size],
        className
      )}
      aria-hidden="true"
    />
  );
}

// --- OrbitalLoader ---

interface OrbitalLoaderProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "w-4 h-4 border-[1.5px]",
  md: "w-8 h-8 border-2",
  lg: "w-16 h-16 border-[3px]",
  xl: "w-24 h-24 border-[3px]",
};

export function OrbitalLoader({ size = "md", className }: OrbitalLoaderProps) {
  const dimensionsClass = sizeClasses[size].split(" ").filter(c => !c.startsWith("border-")).join(" ");
  const borderClass = sizeClasses[size].split(" ").find(c => c.startsWith("border-"));

  return (
    <OrbitalDesign className={className} borderClass={borderClass} dimensionsClass={dimensionsClass} />
  );
}


const OrbitalDesign = ({className, borderClass, dimensionsClass}: {className?: string, borderClass?: string, dimensionsClass?: string}) => {
  return (
    <div className={cn("relative orbital-core-perspective", dimensionsClass, className)}>
      {/* Core Ring 1 - Fast, Glowing, Primary Axis */}
      <div className={cn(
        "absolute w-full h-full rounded-full border-[#4F6EF7]/20 border-t-[#4F6EF7] border-r-[#4F6EF7] animate-orbital-1 drop-shadow-[0_0_6px_rgba(79,110,247,0.8)]", 
        borderClass
      )} />
      
      {/* Core Ring 2 - Reverse, Dimmed, Secondary Axis */}
      <div className={cn(
        "absolute w-full h-full rounded-full border-[#4F6EF7]/20 border-b-[#4F6EF7]/60 border-l-[#4F6EF7]/60 animate-orbital-2", 
        borderClass
      )} />
      
      {/* Core Ring 3 - Scaling, Pulsing, Tertiary Axis */}
      <div className={cn(
        "absolute w-full h-full rounded-full border-[#4F6EF7]/20 border-t-[#4F6EF7] animate-orbital-3 drop-shadow-[0_0_4px_rgba(79,110,247,0.5)]", 
        borderClass
      )} />
    </div>
  );
}