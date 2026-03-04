"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { FilterChip } from "@/components/ui/filter-chip";
import { SearchInput } from "@/components/ui/search-input";

const filters = [
  { label: "All", value: "" },
  { label: "Ready", value: "COMPLETED" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Failed", value: "FAILED" },
];

export function HistoryFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get("status") ?? "";
  const currentSearch = searchParams.get("search") ?? "";
  const [search, setSearch] = useState(currentSearch);

  const navigate = useCallback(
    (status: string, searchVal: string) => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (searchVal) params.set("search", searchVal);
      router.push(`/dashboard/history${params.toString() ? `?${params}` : ""}`);
    },
    [router]
  );

  return (
    <div className="mb-4 flex items-center gap-2">
      {filters.map((f) => (
        <FilterChip
          key={f.value}
          label={f.label}
          active={currentStatus === f.value}
          onClick={() => navigate(f.value, search)}
        />
      ))}
      <div className="ml-auto">
        <SearchInput
          value={search}
          onChange={(val) => {
            setSearch(val);
            navigate(currentStatus, val);
          }}
          placeholder="Search meetings..."
        />
      </div>
    </div>
  );
}
