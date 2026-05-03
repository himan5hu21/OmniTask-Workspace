import { OrbitalLoader } from "@/components/ui/orbital-loader";

export default function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <OrbitalLoader size="xl" />
    </div>
  );
}

