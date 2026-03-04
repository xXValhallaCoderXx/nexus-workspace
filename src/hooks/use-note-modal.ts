"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";

export function useNoteModal() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeNoteId = searchParams.get("note") ?? null;

  const openNote = useCallback(
    (jobId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("note", jobId);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const closeNote = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("note");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, router, pathname]);

  return { activeNoteId, openNote, closeNote };
}
