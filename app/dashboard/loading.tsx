import { VinylLogo } from "@/components/VinylLogo";

export default function DashboardLoading() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ backgroundColor: "var(--background)" }}
    >
      <VinylLogo size={64} />
      <span
        className="font-bold text-xl tracking-tight"
        style={{ color: "var(--foreground)", opacity: 0.55 }}
      >
        sonaara
      </span>
    </div>
  );
}
