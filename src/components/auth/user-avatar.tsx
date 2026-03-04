"use client";

import { useSession } from "next-auth/react";
import Image from "next/image";

export function UserAvatar() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  return (
    <div className="flex items-center gap-3">
      {session.user.image ? (
        <Image
          src={session.user.image}
          alt={session.user.name ?? "User"}
          width={32}
          height={32}
          className="rounded-full"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
          {session.user.name?.[0] ?? "U"}
        </div>
      )}
      <span className="text-sm font-medium text-gray-700">
        {session.user.name}
      </span>
    </div>
  );
}
