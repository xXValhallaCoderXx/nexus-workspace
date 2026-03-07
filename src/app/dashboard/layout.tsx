import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { Sidebar } from "@/components/layout/sidebar";
import { getProcessingRunCount } from "@/lib/db/scoped-queries";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/");
  }

  const processingCount = await getProcessingRunCount(session.user.id);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userName={session.user.name}
        processingCount={processingCount}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
