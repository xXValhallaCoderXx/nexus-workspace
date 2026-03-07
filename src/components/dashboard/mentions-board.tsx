"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MentionCategoryBadge } from "@/components/dashboard/mention-category-badge";
import { MentionDetailPanel } from "@/components/dashboard/mention-detail-panel";
import { MentionSourceAvatar } from "@/components/dashboard/mention-source-avatar";
import { DestinationBadge } from "@/components/dashboard/workflow-run-primitives";
import { Card } from "@/components/ui/card";
import { FilterChip } from "@/components/ui/filter-chip";
import { SearchInput } from "@/components/ui/search-input";
import { useMentionPanel } from "@/hooks/use-mention-panel";
import {
  getMentionCategoryMeta,
  getMentionPreviewText,
  getMentionSourceMeta,
  getMentionTitle,
  matchesMentionQuery,
  type MentionCategory,
  type MentionListItem,
} from "@/lib/utils/mention-display";
import { formatRelativeAge, truncateText } from "@/lib/utils/workflow-run-display";

type CategoryFilter = "ALL" | MentionCategory;

export function MentionsBoard({
  items,
  pendingCount,
  hasSlackConnected,
  quietModeEnabled,
}: {
  items: MentionListItem[];
  pendingCount: number;
  hasSlackConnected: boolean;
  quietModeEnabled: boolean;
}) {
  const { activeMentionId, openMention, closeMention } = useMentionPanel();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");

  const counts = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.ALL += 1;
        acc[item.category] += 1;
        return acc;
      },
      {
        ALL: 0,
        ACTION_REQUIRED: 0,
        READ_ONLY: 0,
        NOISE: 0,
      }
    );
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory =
        categoryFilter === "ALL" ? true : item.category === categoryFilter;
      return matchesCategory && matchesMentionQuery(item, search);
    });
  }, [categoryFilter, items, search]);

  const activeMention =
    items.find((item) => item.id === activeMentionId) ?? null;

  const filters: Array<{ key: CategoryFilter; label: string }> = [
    { key: "ALL", label: `All (${counts.ALL})` },
    {
      key: "ACTION_REQUIRED",
      label: `${getMentionCategoryMeta("ACTION_REQUIRED").label} (${counts.ACTION_REQUIRED})`,
    },
    {
      key: "READ_ONLY",
      label: `${getMentionCategoryMeta("READ_ONLY").label} (${counts.READ_ONLY})`,
    },
    {
      key: "NOISE",
      label: `${getMentionCategoryMeta("NOISE").label} (${counts.NOISE})`,
    },
  ];

  return (
    <>
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted">
            <span className="h-2 w-2 rounded-full bg-green" />
            {counts.ALL} triaged mention{counts.ALL === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted">
            <span className={`h-2 w-2 rounded-full ${pendingCount > 0 ? "bg-amber" : "bg-border2"}`} />
            {pendingCount > 0
              ? `${pendingCount} queued for processing`
              : "Queue is clear"}
          </span>
        </div>
        <ProcessMentionsButton
          pendingCount={pendingCount}
          hasSlackConnected={hasSlackConnected}
          quietModeEnabled={quietModeEnabled}
        />
      </div>

      <Card className="mb-5 rounded-[20px] p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <SearchInput
            className="w-full xl:max-w-[360px]"
            value={search}
            onChange={setSearch}
            placeholder="Search mentions, authors, or reasons..."
          />
          <div className="flex flex-wrap items-center gap-2">
            {filters.map((filter) => (
              <FilterChip
                key={filter.key}
                label={filter.label}
                active={categoryFilter === filter.key}
                onClick={() => setCategoryFilter(filter.key)}
              />
            ))}
          </div>
          <div className="text-sm font-medium text-muted xl:ml-auto">
            Showing {filteredItems.length} mention{filteredItems.length === 1 ? "" : "s"}
          </div>
        </div>
      </Card>

      {filteredItems.length === 0 ? (
        <EmptyMentionsState
          hasSlackConnected={hasSlackConnected}
          quietModeEnabled={quietModeEnabled}
          hasAnyMentions={items.length > 0}
          pendingCount={pendingCount}
        />
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const sourceMeta = getMentionSourceMeta(item.source);
            const categoryMeta = getMentionCategoryMeta(item.category);
            const preview = getMentionPreviewText(item.content, 190);
            const visibleDeliveries = item.deliveries.slice(0, 3);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => openMention(item.id)}
                aria-label={`View mention from ${item.author}: ${getMentionTitle(item)}`}
                className={`group w-full rounded-[22px] border bg-surface px-5 py-5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-md ${categoryMeta.cardAccentClassName}`}
              >
                <div className="flex items-start gap-4">
                  <MentionSourceAvatar source={item.source} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[15px] font-semibold text-text">
                        {item.author}
                      </p>
                      <span className="text-[12px] text-muted2">•</span>
                      <p className="text-[12px] text-muted2">{sourceMeta.label}</p>
                    </div>
                    <p className="mt-1 text-[20px] font-semibold tracking-tight text-text">
                      {getMentionTitle(item)}
                    </p>
                    <p className="mt-2 text-[14px] leading-6 text-muted">
                      {preview}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <MentionCategoryBadge category={item.category} />
                      <span className="rounded-full border border-border bg-bg px-2.5 py-1 text-[11px] font-medium text-muted">
                        {truncateText(item.reason, 78)}
                      </span>
                      {visibleDeliveries.length > 0 ? (
                        <div className="flex items-center gap-2">
                          {visibleDeliveries.map((delivery, index) => (
                            <DestinationBadge
                              key={`${item.id}-${delivery.provider}-${index}`}
                              delivery={delivery}
                              compact
                            />
                          ))}
                          {item.deliveries.length > visibleDeliveries.length ? (
                            <span className="rounded-full border border-border bg-surface px-2 py-1 text-[11px] font-medium text-muted">
                              +{item.deliveries.length - visibleDeliveries.length}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="ml-auto flex shrink-0 flex-col items-end gap-3 pl-2">
                    <span className="text-[12px] font-medium text-muted2">
                      {formatRelativeAge(item.processedAt)}
                    </span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface2 text-muted transition-colors group-hover:text-text">
                      <svg
                        width="15"
                        height="15"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.2"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
                      </svg>
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <MentionDetailPanel mention={activeMention} onClose={closeMention} />
    </>
  );
}

function ProcessMentionsButton({
  pendingCount,
  hasSlackConnected,
  quietModeEnabled,
}: {
  pendingCount: number;
  hasSlackConnected: boolean;
  quietModeEnabled: boolean;
}) {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ message: string; ok: boolean } | null>(null);

  if (!hasSlackConnected) {
    return (
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center justify-center rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface2"
      >
        Connect Slack
      </Link>
    );
  }

  if (!quietModeEnabled) {
    return (
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center justify-center rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface2"
      >
        Enable Quiet Mode
      </Link>
    );
  }

  async function handleProcess() {
    setProcessing(true);
    setResult(null);
    try {
      const response = await fetch("/api/user/triage/trigger", { method: "POST" });
      const data = (await response.json()) as {
        error?: string;
        message?: string;
        messageCount?: number;
        fetchedFromSlack?: number;
      };

      if (!response.ok) {
        setResult({ message: data.error ?? "Failed to process mentions", ok: false });
        return;
      }

      const parts: string[] = [];
      if (data.fetchedFromSlack && data.fetchedFromSlack > 0) {
        parts.push(`Fetched ${data.fetchedFromSlack} from Slack`);
      }
      if (data.messageCount && data.messageCount > 0) {
        parts.push(
          `Processed ${data.messageCount} mention${data.messageCount === 1 ? "" : "s"}`
        );
      }

      setResult({
        message: parts.length > 0 ? parts.join(" · ") : data.message ?? "No new mentions found",
        ok: (data.messageCount ?? 0) > 0 || (data.fetchedFromSlack ?? 0) > 0,
      });
      router.refresh();
    } catch {
      setResult({ message: "Network error", ok: false });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {result ? (
        <span className={`text-xs ${result.ok ? "text-green" : "text-red"}`}>
          {result.message}
        </span>
      ) : null}
      <button
        type="button"
        onClick={handleProcess}
        disabled={processing}
        className="inline-flex items-center justify-center rounded-full bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#111C34] disabled:opacity-60"
      >
        {processing
          ? "Processing…"
          : pendingCount > 0
            ? `Process queue (${pendingCount})`
            : "Sync mentions"}
      </button>
    </div>
  );
}

function EmptyMentionsState({
  hasSlackConnected,
  quietModeEnabled,
  hasAnyMentions,
  pendingCount,
}: {
  hasSlackConnected: boolean;
  quietModeEnabled: boolean;
  hasAnyMentions: boolean;
  pendingCount: number;
}) {
  let title = "No mentions match your filters";
  let body = "Try a different search or filter to widen the results.";
  let cta: { href: string; label: string } | null = null;

  if (!hasAnyMentions) {
    title = "No triaged mentions yet";
    body =
      pendingCount > 0
        ? "Your queue has mentions waiting to be processed. Run the triage flow to populate this workspace."
        : "Once Nexus processes Slack mentions through Quiet Mode, they will appear here with their triage reasoning and detail panel.";
  }

  if (!hasSlackConnected) {
    title = "Connect Slack to unlock Mentions";
    body = "Nexus needs your Slack connection to sync mentions and build triage digests.";
    cta = { href: "/dashboard/settings", label: "Open Settings" };
  } else if (!quietModeEnabled) {
    title = "Enable Quiet Mode to triage mentions";
    body = "Quiet Mode batches Slack mentions into digests that power this Mentions workspace.";
    cta = { href: "/dashboard/settings", label: "Enable in Settings" };
  }

  return (
    <Card className="rounded-[22px] px-6 py-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-lt text-brand">
        <svg
          width="20"
          height="20"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 15 6.75 17.25A2.25 2.25 0 1 1 3.57 14.07L5.82 11.82M15 9l2.25-2.25a2.25 2.25 0 0 1 3.18 3.18L18.18 12.18M8.25 15.75 15.75 8.25"
          />
        </svg>
      </div>
      <p className="text-base font-semibold text-text">{title}</p>
      <p className="mx-auto mt-2 max-w-[520px] text-sm leading-6 text-muted">
        {body}
      </p>
      {cta ? (
        <Link
          href={cta.href}
          className="mt-4 inline-flex items-center justify-center rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface2"
        >
          {cta.label}
        </Link>
      ) : null}
    </Card>
  );
}
