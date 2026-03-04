import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { UserAvatar } from "@/components/auth/user-avatar";
import { SignOutButton } from "@/components/auth/sign-out-button";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Link
              href="/dashboard"
              className="text-xl font-bold text-gray-900"
            >
              Nexus
            </Link>
            <div className="flex gap-4">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/history"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                History
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <UserAvatar />
            <SignOutButton />
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
