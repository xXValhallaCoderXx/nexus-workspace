"use client";

import Link from "next/link";
import {
  DestinationBadge,
  getProviderLabel,
} from "@/components/dashboard/workflow-run-primitives";
import { MentionCategoryBadge } from "@/components/dashboard/mention-category-badge";
import { MentionSourceAvatar } from "@/components/dashboard/mention-source-avatar";
import { Modal } from "@/components/ui/modal";
import {
  formatLongDateTime,
  formatRelativeAge,
  getDeliveryStatus,
  truncateText,
} from "@/lib/utils/workflow-run-display";
import {
  formatSlackMessageText,
  getMentionCategoryMeta,
  getMentionSourceMeta,
  getMentionTitle,
  type MentionListItem,
} from "@/lib/utils/mention-display";

const deliveryStateClassNames = {
  delivered: "bg-[#F0FDF4] text-[#15803D]",
  failed: "bg-[#FEF2F2] text-red",
  pending: "bg-[#FFFBEB] text-[#B45309]",
} as const;

export function MentionDetailPanel({
  mention,
  onClose,
}: {
  mention: MentionListItem | null;
  onClose: () => void;
}) {
  const sourceMeta = mention ? getMentionSourceMeta(mention.source) : null;
  const categoryMeta = mention
    ? getMentionCategoryMeta(mention.category)
    : null;

  return (
    <Modal
      open={!!mention}
      onClose={onClose}
      variant="side"
      bodyClassName="min-h-0 flex-1 overflow-y-auto bg-bg p-6"
      headerContent={
        mention ? (
          <div className="border-b border-border bg-surface px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted2">
                  <span className="rounded-full bg-brand-lt px-2.5 py-1 text-brand">
                    {sourceMeta?.label ?? "Mention"}
                  </span>
                  <span>{formatRelativeAge(mention.processedAt)}</span>
                </div>
                <div className="mt-4 flex items-start gap-3">
                  <MentionSourceAvatar source={mention.source} size="lg" />
                  <div className="min-w-0">
                    <h2 className="text-[28px] font-bold leading-tight tracking-tight text-text">
                      {getMentionTitle(mention)}
                    </h2>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <MentionCategoryBadge category={mention.category} />
                      <span className="rounded-full border border-border bg-bg px-2.5 py-1 text-[11px] font-medium text-muted">
                        {mention.author}
                      </span>
                      <span className="rounded-full border border-border bg-bg px-2.5 py-1 text-[11px] font-medium text-muted">
                        {mention.digestTimeLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface2 text-muted transition-colors hover:text-text"
                aria-label="Close mention details"
              >
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.4"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ) : undefined
      }
    >
      {mention ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoCard
              label="Author"
              value={mention.author}
              detail={`${sourceMeta?.label ?? "Source"} mention`}
            />
            <InfoCard
              label="Processed"
              value={formatLongDateTime(mention.processedAt)}
              detail={`Included in ${mention.digestTitle}`}
            />
          </div>

          <SectionCard title="Mention">
            <div className="flex items-start gap-3">
              <MentionSourceAvatar source={mention.source} />
              <div>
                <p className="text-[15px] font-semibold text-text">{mention.author}</p>
                <p className="mt-1 text-xs text-muted2">
                  {sourceMeta?.label ?? mention.source} · Processed {formatRelativeAge(mention.processedAt)}
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-[18px] border border-border bg-bg px-4 py-4">
              <p className="whitespace-pre-wrap text-[15px] leading-7 text-text">
                {formatSlackMessageText(mention.content)}
              </p>
            </div>
          </SectionCard>

          <SectionCard title="AI analysis">
            <div className="rounded-[20px] border border-[#D8D3FF] bg-[#F7F7FF] p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-brand text-white">
                  <svg
                    width="18"
                    height="18"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m9 12 2 2 4-4m1.5-5.5h-9A2.5 2.5 0 0 0 5 7v10a2.5 2.5 0 0 0 2.5 2.5h9A2.5 2.5 0 0 0 19 17V7a2.5 2.5 0 0 0-2.5-2.5Z"
                    />
                  </svg>
                </span>
                <div>
                  <p className="text-[16px] font-semibold text-text">Triage Analysis</p>
                  <p className="mt-1 text-sm text-muted">
                    {categoryMeta?.description ?? "Triaged by Nexus"}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <MentionCategoryBadge category={mention.category} />
                <span className="rounded-full border border-border bg-white px-2.5 py-1 text-[11px] font-medium text-muted">
                  {sourceMeta?.label ?? mention.source}
                </span>
              </div>
              <div className="mt-4 rounded-[18px] border border-[#E5E7EB] bg-white px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted2">
                  Reason
                </p>
                <p className="mt-2 text-[15px] leading-7 text-muted">
                  {mention.reason}
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Quick actions">
            <div className="grid gap-3 sm:grid-cols-2">
              {mention.permalink ? (
                <a
                  href={mention.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center rounded-[16px] bg-[#0F172A] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#111C34]"
                >
                  View in Slack
                </a>
              ) : null}
              <Link
                href={`/dashboard/history?note=${mention.digestRunId}`}
                className="flex items-center justify-center rounded-[16px] border border-border bg-surface px-4 py-3 text-sm font-semibold text-text transition-colors hover:bg-surface2"
              >
                Open digest
              </Link>
            </div>
          </SectionCard>

          {mention.deliveries.length > 0 && (
            <SectionCard title="Digest destinations">
              <div className="space-y-3">
                {mention.deliveries.map((delivery, index) => {
                  const state = getDeliveryStatus(delivery.status);
                  const stateLabel =
                    state === "delivered"
                      ? "Delivered"
                      : state === "failed"
                        ? "Failed"
                        : "Pending";
                  const detail = delivery.errorMessage
                    ? truncateText(delivery.errorMessage, 140)
                    : delivery.deliveredAt
                      ? `Updated ${formatLongDateTime(delivery.deliveredAt)}`
                      : "Awaiting delivery update.";

                  return (
                    <div
                      key={`${delivery.provider}-${index}`}
                      className="rounded-[18px] border border-border bg-bg px-4 py-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                          <DestinationBadge delivery={delivery} compact />
                          <div>
                            <p className="text-[15px] font-semibold text-text">
                              {getProviderLabel(delivery.provider)}
                            </p>
                            <p
                              className={`mt-1 text-sm ${
                                state === "failed" ? "text-red" : "text-muted"
                              }`}
                            >
                              {detail}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${deliveryStateClassNames[state]}`}
                          >
                            {stateLabel}
                          </span>
                          {delivery.externalUrl && (
                            <a
                              href={delivery.externalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold text-brand transition-colors hover:bg-brand-lt"
                            >
                              Open
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}
        </div>
      ) : null}
    </Modal>
  );
}

function InfoCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-[18px] border border-border bg-surface px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted2">
        {label}
      </p>
      <p className="mt-2 text-[15px] font-semibold text-text">{value}</p>
      {detail ? <p className="mt-1 text-sm text-muted">{detail}</p> : null}
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-border bg-surface px-5 py-5">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted2">
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}
