import { cn } from "@/lib/utils";

interface OrbitalLoaderProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "w-5 h-5 border-[1.5px]",   // Slightly thinner stroke for tiny spaces
  md: "w-8 h-8 border-2",         // Standard 2px stroke
  lg: "w-16 h-16 border-[3px]",   // Scaled stroke for larger components
  xl: "w-24 h-24 border-[3px]",   // Scaled stroke for page loads
};

export function OrbitalLoader({ size = "md", className }: OrbitalLoaderProps) {
  // Extract border width class for dynamic scaling
  const borderClass = sizeClasses[size].split(" ").find(c => c.startsWith("border-"));
  const dimensionsClass = sizeClasses[size].split(" ").filter(c => !c.startsWith("border-")).join(" ");

  return (
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
  );
}