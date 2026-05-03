import { OrbitalLoader } from "@/components/ui/orbital-loader";

export default function DashboardLoading() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[400px]">
      <OrbitalLoader size="lg" />
    </div>
  );
}
