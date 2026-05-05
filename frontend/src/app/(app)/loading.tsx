import { OrbitalLoader } from "@/components/ui/orbital-loader";

export default function AppLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <OrbitalLoader size="lg" />
    </div>
  );
}
