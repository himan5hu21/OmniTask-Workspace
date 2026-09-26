import { cn } from "@/lib/utils";
import { OrbitalLoader } from "./ui/orbital-loader";

export default function Spinner({ className, size = "xl" }: { className?: string, size?: "sm" | "md" | "lg" | "xl" }) {
  return (
    <div className={cn("flex h-full w-full items-center justify-center bg-background", className)}>
      <OrbitalLoader size={size} />
    </div>
  );
}