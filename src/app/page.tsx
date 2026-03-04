import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { SignInButton } from "@/components/auth/sign-in-button";

export default async function Home() {
  const session = await getSession();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white">
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Nexus
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            Automated meeting transcript processing
          </p>
        </div>
        <SignInButton />
      </div>
    </div>
  );
}
