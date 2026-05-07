"use client";

import { cn } from "@/lib/utils";
import { useIsMounted } from "@/hooks/useIsMounted";

interface OrbitalLoaderProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "full" | "minimal";
  color?: string; // Hex color or 'currentColor'
  className?: string;
}

const sizeClasses = {
  sm: "w-4 h-4 border-[1.5px]",   // Slightly smaller for buttons
  md: "w-8 h-8 border-2",
  lg: "w-16 h-16 border-[3px]",
  xl: "w-24 h-24 border-[3px]",
};

export function OrbitalLoader({ 
  size = "md", 
  variant = "full",
  color,
  className 
}: OrbitalLoaderProps) {
  const isMounted = useIsMounted();
  const dimensionsClass = sizeClasses[size].split(" ").filter(c => !c.startsWith("border-")).join(" ");
  const borderClass = sizeClasses[size].split(" ").find(c => c.startsWith("border-"));

  // Button loader (minimal) uses currentColor by default to inherit button text color
  const isMinimal = variant === "minimal";
  const ringColor = color || (isMinimal ? "currentColor" : "#5D5CFF");
  const isCurrentColor = ringColor === "currentColor";

  // Prevent hydration mismatch by rendering a simple placeholder until mounted
  if (!isMounted) {
    return (
      <OrbitalDesign className={className} borderClass={borderClass} dimensionsClass={dimensionsClass} />
    );
  }

  if (isMinimal) {
    return (
      <div 
        className={cn(
          "animate-spin rounded-full",
          isCurrentColor ? "border-current/20 border-t-current" : "",
          dimensionsClass, 
          borderClass,
          className
        )}
        style={!isCurrentColor ? {
          borderTopColor: ringColor,
          borderColor: `${ringColor}33`,
        } : undefined}
      />
    );
  }

  return (
    <OrbitalDesign className={className} borderClass={borderClass} dimensionsClass={dimensionsClass} />
  );
}


const OrbitalDesign = ({className, borderClass, dimensionsClass}: {className?: string, borderClass?: string, dimensionsClass?: string}) => {
  return(
    <>
      <style>{`
        .orbital-core-perspective { 
          perspective: 800px; 
          transform-style: preserve-3d; 
        }
        
        @keyframes orbital-spin-1 {
          0% { transform: rotateX(35deg) rotateY(-45deg) rotateZ(0deg); }
          100% { transform: rotateX(35deg) rotateY(-45deg) rotateZ(360deg); }
        }
        @keyframes orbital-spin-2 {
          0% { transform: rotateX(50deg) rotateY(10deg) rotateZ(0deg); }
          100% { transform: rotateX(50deg) rotateY(10deg) rotateZ(360deg); }
        }
        @keyframes orbital-spin-3 {
          0% { transform: rotateX(15deg) rotateY(60deg) rotateZ(0deg) scale(0.9); }
          50% { transform: rotateX(15deg) rotateY(60deg) rotateZ(180deg) scale(1.1); }
          100% { transform: rotateX(15deg) rotateY(60deg) rotateZ(360deg) scale(0.9); }
        }
        
        .animate-orbital-1 { animation: orbital-spin-1 1.5s linear infinite; }
        .animate-orbital-2 { animation: orbital-spin-2 2s linear infinite reverse; }
        .animate-orbital-3 { animation: orbital-spin-3 2.5s ease-in-out infinite alternate; }
      `}</style>
      
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
    </>
  )
}