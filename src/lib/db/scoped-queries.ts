import { prisma } from "./prisma";
import { Prisma, type PendingNotification } from "@/generated/prisma/client";
import type {
  RunStatus,
  SourceProvider,
  DestinationProvider,
  ConnectionStatus,
  EventStatus,
  DeliveryStatus,
} from "@/generated/prisma/enums";

// ── User Config ────────────────────────────

export async function getUserConfig(userId: string) {
  return prisma.userConfig.findUnique({ where: { userId } });
}

export async function upsertUserConfig(
  userId: string,
  data: {
    meetingSummariesEnabled?: boolean;
    encryptedOpenRouterKey?: string | null;
    customSystemPrompt?: string | null;
    dismissedConnectorNudge?: boolean;
  }
) {
  return prisma.userConfig.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

// ── Source Connection ────────────────────────

export async function getSourceConnection(
  userId: string,
  provider: SourceProvider
) {
  return prisma.sourceConnection.findUnique({
    where: { userId_provider: { userId, provider } },
  });
}

export async function upsertSourceConnection(
  userId: string,
  provider: SourceProvider,
  data: {
    status?: ConnectionStatus;
    configJson?: Record<string, unknown> | null;
    externalAccountId?: string | null;
    displayName?: string | null;
    lastValidatedAt?: Date;
  }
) {
  const configJson =
    data.configJson === null
      ? Prisma.JsonNull
      : data.configJson === undefined
        ? undefined
        : (data.configJson as Prisma.InputJsonValue);

  return prisma.sourceConnection.upsert({
    where: { userId_provider: { userId, provider } },
    create: { userId, provider, ...data, configJson },
    update: { ...data, configJson },
  });
}

// ── Destination Connection ────────────────────

export async function getDestinationConnection(
  userId: string,
  provider: DestinationProvider
) {
  return prisma.destinationConnection.findUnique({
    where: { userId_provider: { userId, provider } },
  });
}

export async function getDestinationConnections(userId: string) {
  return prisma.destinationConnection.findMany({ where: { userId } });
}

export async function getEnabledDestinationConnections(userId: string) {
  return prisma.destinationConnection.findMany({
    where: { userId, enabled: true, status: "CONNECTED" },
  });
}

export async function upsertDestinationConnection(
  userId: string,
  provider: DestinationProvider,
  data: {
    status?: ConnectionStatus;
    enabled?: boolean;
    configJson?: Record<string, unknown> | null;
    oauthTokensEncrypted?: string | null;
    externalAccountId?: string | null;
    displayName?: string | null;
    lastValidatedAt?: Date;
  }
) {
  const configJson =
    data.configJson === null
      ? Prisma.JsonNull
      : data.configJson === undefined
        ? undefined
        : (data.configJson as Prisma.InputJsonValue);

  return prisma.destinationConnection.upsert({
    where: { userId_provider: { userId, provider } },
    create: { userId, provider, ...data, configJson },
    update: { ...data, configJson },
  });
}

export async function deleteDestinationConnection(
  userId: string,
  provider: DestinationProvider
) {
  return prisma.destinationConnection.deleteMany({
    where: { userId, provider },
  });
}

// ── Source Event ────────────────────────────

export async function createSourceEvent(data: {
  userId: string;
  sourceConnectionId: string;
  provider: SourceProvider;
  eventType: string;
  externalEventId?: string;
  dedupeKey?: string;
  rawPayload?: Prisma.InputJsonValue;
  normalizedMetadata?: Prisma.InputJsonValue;
  status?: EventStatus;
}) {
  return prisma.sourceEvent.create({ data });
}

export async function updateSourceEvent(
  id: string,
  data: {
    status?: EventStatus;
    processedAt?: Date;
    errorMessage?: string | null;
    normalizedMetadata?: Prisma.InputJsonValue;
  }
) {
  return prisma.sourceEvent.update({ where: { id }, data });
}

export async function findSourceEventByDedupeKey(dedupeKey: string) {
  return prisma.sourceEvent.findFirst({
    where: { dedupeKey },
    orderBy: { receivedAt: "desc" },
  });
}

// ── Source Item ────────────────────────────

export async function upsertSourceItem(data: {
  userId: string;
  sourceConnectionId: string;
  provider: SourceProvider;
  itemType: string;
  externalItemId: string;
  title?: string;
  sourceUrl?: string;
  metadata?: Prisma.InputJsonValue;
  occurredAt?: Date;
}) {
  return prisma.sourceItem.upsert({
    where: {
      sourceConnectionId_externalItemId: {
        sourceConnectionId: data.sourceConnectionId,
        externalItemId: data.externalItemId,
      },
    },
    create: data,
    update: {
      title: data.title,
      sourceUrl: data.sourceUrl,
      metadata: data.metadata,
      occurredAt: data.occurredAt,
    },
  });
}

// ── Workflow Run ────────────────────────────

export async function createWorkflowRun(data: {
  userId: string;
  workflowType: "MEETING_SUMMARY" | "ARTIFACT_REDELIVERY" | "SCHEDULED_DIGEST" | "OTHER";
  triggerType?: string;
  sourceEventId?: string;
  inputRefJson?: Prisma.InputJsonValue;
  status?: RunStatus;
  startedAt?: Date;
}) {
  return prisma.workflowRun.create({ data });
}

export async function updateWorkflowRun(
  id: string,
  data: {
    status?: RunStatus;
    startedAt?: Date;
    completedAt?: Date;
    modelUsed?: string;
    errorMessage?: string | null;
    metricsJson?: Prisma.InputJsonValue;
    attemptCount?: { increment: number };
  }
) {
  return prisma.workflowRun.update({ where: { id }, data });
}

export async function findPendingWorkflowRun(
  userId: string,
  fileId: string
) {
  return prisma.workflowRun.findFirst({
    where: {
      userId,
      workflowType: "MEETING_SUMMARY",
      status: { in: ["PENDING", "PROCESSING"] },
      inputRefJson: { path: ["fileId"], equals: fileId },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getWorkflowRunHistory(
  userId: string,
  options: {
    page?: number;
    limit?: number;
    status?: RunStatus;
    search?: string;
  } = {}
) {
  const { page = 1, limit = 20, status, search } = options;

  const where: Prisma.WorkflowRunWhereInput = {
    userId,
    ...(status ? { status } : {}),
  };

  // Search by artifact title if search term is provided
  if (search) {
    where.artifacts = {
      some: {
        title: { contains: search, mode: "insensitive" },
      },
    };
  }

  const [runs, total] = await Promise.all([
    prisma.workflowRun.findMany({
      where,
      include: {
        artifacts: {
          take: 1,
          select: { id: true, title: true, payloadJson: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.workflowRun.count({ where }),
  ]);

  return { runs, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getWorkflowRunById(runId: string, userId: string) {
  return prisma.workflowRun.findFirst({
    where: { id: runId, userId },
    include: {
      artifacts: {
        include: {
          deliveries: true,
        },
      },
    },
  });
}

export async function getWorkflowRunStatusByFileIds(
  userId: string,
  fileIds: string[]
) {
  if (fileIds.length === 0) return [];
  return prisma.workflowRun.findMany({
    where: {
      userId,
      workflowType: "MEETING_SUMMARY",
      OR: fileIds.map((fid) => ({
        inputRefJson: { path: ["fileId"], equals: fid },
      })),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, inputRefJson: true },
  });
}

export async function getDashboardStats(userId: string) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const [meetingsThisWeek, summariesReady, processing] = await Promise.all([
    prisma.workflowRun.count({
      where: { userId, createdAt: { gte: weekStart } },
    }),
    prisma.workflowRun.count({
      where: { userId, status: "COMPLETED", createdAt: { gte: weekStart } },
    }),
    prisma.workflowRun.count({
      where: { userId, status: "PROCESSING" },
    }),
  ]);

  return { meetingsThisWeek, summariesReady, processing };
}

export async function getRecentWorkflowRuns(userId: string, limit = 5) {
  return prisma.workflowRun.findMany({
    where: { userId },
    include: {
      artifacts: {
        take: 1,
        select: { id: true, title: true, payloadJson: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getProcessingRunCount(userId: string) {
  return prisma.workflowRun.count({
    where: { userId, status: "PROCESSING" },
  });
}

// ── Artifact ────────────────────────────

export async function createArtifact(data: {
  userId: string;
  artifactType: "MEETING_SUMMARY" | "DIGEST" | "TASK_BRIEF" | "OTHER";
  workflowRunId: string;
  title?: string;
  summaryText?: string;
  payloadJson?: Prisma.InputJsonValue;
  sourceRefsJson?: Prisma.InputJsonValue;
}) {
  return prisma.artifact.create({ data });
}

export async function getArtifactById(artifactId: string, userId: string) {
  return prisma.artifact.findFirst({
    where: { id: artifactId, userId },
    include: { deliveries: true },
  });
}

// ── Artifact Delivery ────────────────────

export async function createArtifactDelivery(data: {
  artifactId: string;
  destinationConnectionId?: string | null;
  provider: DestinationProvider;
  status?: DeliveryStatus;
  errorMessage?: string;
  deliveredAt?: Date;
}) {
  return prisma.artifactDelivery.create({ data });
}

export async function updateArtifactDelivery(
  id: string,
  data: {
    status?: DeliveryStatus;
    errorMessage?: string | null;
    externalId?: string | null;
    externalUrl?: string | null;
    deliveredAt?: Date;
    retryCount?: { increment: number };
  }
) {
  return prisma.artifactDelivery.update({ where: { id }, data });
}

export async function getArtifactDeliveryById(id: string) {
  return prisma.artifactDelivery.findFirst({
    where: { id },
    include: {
      artifact: {
        select: {
          id: true,
          userId: true,
          payloadJson: true,
          title: true,
          artifactType: true,
          summaryText: true,
          sourceRefsJson: true,
          workflowRun: {
            select: { inputRefJson: true, modelUsed: true },
          },
        },
      },
    },
  });
}

// ── Push Channels ────────────────────────

export async function getUserPushChannels(userId: string) {
  return prisma.pushChannel.findMany({ where: { userId } });
}

// ── Channel Renewal Errors ────────────────

export async function getUserChannelRenewalErrors(
  userId: string,
  unacknowledgedOnly = true
) {
  return prisma.channelRenewalError.findMany({
    where: {
      userId,
      ...(unacknowledgedOnly ? { acknowledged: false } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function acknowledgeChannelRenewalError(
  id: string,
  userId: string
) {
  return prisma.channelRenewalError.updateMany({
    where: { id, userId },
    data: { acknowledged: true },
  });
}

// ── Destination Auth Helper ────────────────

export async function getDestinationTokens(
  userId: string,
  provider: DestinationProvider
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
} | null> {
  const conn = await getDestinationConnection(userId, provider);
  if (!conn?.oauthTokensEncrypted) return null;

  const { decrypt } = await import("@/lib/crypto/encryption");
  try {
    return JSON.parse(decrypt(conn.oauthTokensEncrypted));
  } catch {
    return null;
  }
}

export async function destinationFetch(
  userId: string,
  provider: DestinationProvider,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const tokens = await getDestinationTokens(userId, provider);
  if (!tokens) {
    throw new Error(`No tokens found for destination ${provider}`);
  }

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokens.access_token}`,
      ...options.headers,
    },
  });
}

// ── Pending Notification ────────────────────

export async function createPendingNotification(data: {
  userId: string;
  connectorId: string;
  externalMessageId: string;
  authorName: string;
  content: string;
  metadata?: Prisma.InputJsonValue;
}) {
  const metadata =
    data.metadata === undefined
      ? undefined
      : (data.metadata as Prisma.InputJsonValue);

  return prisma.pendingNotification.upsert({
    where: {
      userId_connectorId_externalMessageId: {
        userId: data.userId,
        connectorId: data.connectorId,
        externalMessageId: data.externalMessageId,
      },
    },
    create: { ...data, metadata },
    update: {},
  });
}

export async function getPendingNotificationsByUser(userId: string) {
  return prisma.pendingNotification.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getPendingNotificationsGroupedByUser() {
  const all = await prisma.pendingNotification.findMany({
    orderBy: [{ userId: "asc" }, { createdAt: "asc" }],
  });

  const grouped = new Map<string, PendingNotification[]>();
  for (const n of all) {
    const list = grouped.get(n.userId);
    if (list) {
      list.push(n);
    } else {
      grouped.set(n.userId, [n]);
    }
  }
  return grouped;
}

export async function deletePendingNotifications(ids: string[]) {
  return prisma.pendingNotification.deleteMany({
    where: { id: { in: ids } },
  });
}

export async function getPendingNotificationCount(userId: string) {
  return prisma.pendingNotification.count({
    where: { userId },
  });
}
