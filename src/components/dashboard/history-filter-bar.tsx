"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FilterChip } from "@/components/ui/filter-chip";
import { SearchInput } from "@/components/ui/search-input";

const filters = [
  { label: "All", value: "" },
  { label: "Ready", value: "COMPLETED" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Failed", value: "FAILED" },
];

export function HistoryFilterBar({
  total,
  currentPage,
  pageSize,
}: {
  total: number;
  currentPage: number;
  pageSize: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get("status") ?? "";
  const currentSearch = searchParams.get("search") ?? "";
  const [search, setSearch] = useState(currentSearch);

  useEffect(() => {
    setSearch(currentSearch);
  }, [currentSearch]);

  const navigate = useCallback(
    (status: string, searchVal: string) => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (searchVal.trim()) params.set("search", searchVal.trim());
      router.push(`/dashboard/history${params.toString() ? `?${params}` : ""}`);
    },
    [router]
  );

  const rangeStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(total, currentPage * pageSize);

  return (
    <div className="mb-5 rounded-[20px] border border-border bg-surface p-4 shadow-card">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <SearchInput
          className="w-full xl:max-w-[360px]"
          value={search}
          onChange={(value) => {
            setSearch(value);
            navigate(currentStatus, value);
          }}
          placeholder="Search meetings, digests, or titles..."
        />
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <FilterChip
              key={filter.value}
              label={filter.label}
              active={currentStatus === filter.value}
              onClick={() => navigate(filter.value, search)}
            />
          ))}
        </div>
        <div className="text-sm font-medium text-muted xl:ml-auto">
          {total === 0
            ? "No meetings found"
            : `Showing ${rangeStart}-${rangeEnd} of ${total}`}
        </div>
      </div>
    </div>
  );
}
