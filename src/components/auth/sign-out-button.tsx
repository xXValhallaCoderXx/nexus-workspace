"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 hover:bg-gray-100"
    >
      Sign out
    </button>
  );
}
