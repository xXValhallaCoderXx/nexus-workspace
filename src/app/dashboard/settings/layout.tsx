import { Topbar } from "@/components/layout/topbar";
import { SettingsNav } from "./settings-nav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Topbar title="Settings" subtitle="— connections & preferences" />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <SettingsNav />
        <div className="flex-1 overflow-y-auto p-5 md:p-8">
          <div className="mx-auto max-w-3xl">{children}</div>
        </div>
      </div>
    </>
  );
}
