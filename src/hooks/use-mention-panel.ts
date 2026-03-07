"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useMentionPanel() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeMentionId = searchParams.get("mention") ?? null;

  const openMention = useCallback(
    (mentionId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("mention", mentionId);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const closeMention = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("mention");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return { activeMentionId, openMention, closeMention };
}
