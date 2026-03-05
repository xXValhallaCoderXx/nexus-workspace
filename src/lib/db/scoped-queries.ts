import { prisma } from "./prisma";
import { Prisma } from "@/generated/prisma/client";
import type { JobStatus } from "@/generated/prisma/enums";

export async function getUserConfig(userId: string) {
  return prisma.userConfig.findUnique({ where: { userId } });
}

export async function upsertUserConfig(
  userId: string,
  data: {
    meetingSummariesEnabled?: boolean;
    slackDmEnabled?: boolean;
    encryptedOpenRouterKey?: string | null;
    encryptedSlackWebhookUrl?: string | null;
    slackUserId?: string | null;
    customSystemPrompt?: string | null;
    drivePageToken?: string | null;
    dismissedConnectorNudge?: boolean;
  }
) {
  return prisma.userConfig.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

// ── Connector Config ────────────────────────

export async function getUserConnectorConfigs(userId: string) {
  return prisma.userConnectorConfig.findMany({ where: { userId } });
}

export async function getUserConnectorConfig(
  userId: string,
  connectorId: string
) {
  return prisma.userConnectorConfig.findUnique({
    where: { userId_connectorId: { userId, connectorId } },
  });
}

export async function upsertConnectorConfig(
  userId: string,
  connectorId: string,
  data: {
    enabled?: boolean;
    configJson?: Record<string, unknown> | null;
    oauthTokens?: string | null;
    status?: "CONNECTED" | "DISCONNECTED" | "EXPIRED";
  }
) {
  const configJson =
    data.configJson === null
      ? Prisma.JsonNull
      : data.configJson === undefined
        ? undefined
        : (data.configJson as Prisma.InputJsonValue);

  const prismaData = {
    ...data,
    configJson,
  };

  return prisma.userConnectorConfig.upsert({
    where: { userId_connectorId: { userId, connectorId } },
    create: { userId, connectorId, ...prismaData },
    update: prismaData,
  });
}

export async function deleteConnectorConfig(
  userId: string,
  connectorId: string
) {
  return prisma.userConnectorConfig.deleteMany({
    where: { userId, connectorId },
  });
}

export async function getEnabledConnectorConfigs(userId: string) {
  return prisma.userConnectorConfig.findMany({
    where: { userId, enabled: true, status: "CONNECTED" },
  });
}

// ── Delivery Log ────────────────────────────

export async function createDeliveryLog(data: {
  summaryId: string;
  connectorId: string;
  status?: "PENDING" | "DELIVERED" | "FAILED";
  errorMessage?: string;
  deliveredAt?: Date;
}) {
  return prisma.deliveryLog.create({
    data: {
      summaryId: data.summaryId,
      connectorId: data.connectorId,
      status: data.status ?? "PENDING",
      errorMessage: data.errorMessage,
      deliveredAt: data.deliveredAt,
    },
  });
}

export async function updateDeliveryLog(
  id: string,
  data: {
    status?: "PENDING" | "DELIVERED" | "FAILED";
    errorMessage?: string | null;
    deliveredAt?: Date;
    retryCount?: { increment: number };
  }
) {
  return prisma.deliveryLog.update({
    where: { id },
    data: {
      status: data.status,
      errorMessage: data.errorMessage,
      deliveredAt: data.deliveredAt,
      ...(data.retryCount ? { retryCount: data.retryCount } : {}),
    },
  });
}

export async function getDeliveryLogsForSummary(summaryId: string) {
  return prisma.deliveryLog.findMany({
    where: { summaryId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getFailedDeliveryLogs(summaryId: string) {
  return prisma.deliveryLog.findMany({
    where: { summaryId, status: "FAILED" },
  });
}

export async function getUserPushChannels(userId: string) {
  return prisma.pushChannel.findMany({ where: { userId } });
}

export async function getUserJobHistory(
  userId: string,
  options: {
    page?: number;
    limit?: number;
    status?: JobStatus;
    search?: string;
  } = {}
) {
  const { page = 1, limit = 20, status, search } = options;
  const where = {
    userId,
    ...(status ? { status } : {}),
    ...(search
      ? { sourceFileName: { contains: search, mode: "insensitive" as const } }
      : {}),
  };

  const [jobs, total] = await Promise.all([
    prisma.jobHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.jobHistory.count({ where }),
  ]);

  return { jobs, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getJobStatusByFileIds(
  userId: string,
  fileIds: string[]
) {
  if (fileIds.length === 0) return [];
  return prisma.jobHistory.findMany({
    where: { userId, sourceFileId: { in: fileIds } },
    orderBy: { createdAt: "desc" },
    select: { sourceFileId: true, status: true, id: true },
  });
}

export async function getFailedJobsByUser(userId: string) {
  return prisma.failedJob.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

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

export async function getDashboardStats(userId: string) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const [meetingsThisWeek, summariesReady, processing] = await Promise.all([
    prisma.jobHistory.count({
      where: { userId, createdAt: { gte: weekStart } },
    }),
    prisma.jobHistory.count({
      where: { userId, status: "COMPLETED", createdAt: { gte: weekStart } },
    }),
    prisma.jobHistory.count({
      where: { userId, status: "PROCESSING" },
    }),
  ]);

  return { meetingsThisWeek, summariesReady, processing };
}

export async function getRecentMeetings(userId: string, limit = 5) {
  return prisma.jobHistory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getProcessingJobCount(userId: string) {
  return prisma.jobHistory.count({
    where: { userId, status: "PROCESSING" },
  });
}

export async function getJobById(jobId: string, userId: string) {
  return prisma.jobHistory.findFirst({
    where: { id: jobId, userId },
    include: { deliveryLogs: true },
  });
}

export async function getJobStatusCounts(userId: string) {
  const [total, completed, processing, failed] = await Promise.all([
    prisma.jobHistory.count({ where: { userId } }),
    prisma.jobHistory.count({ where: { userId, status: "COMPLETED" } }),
    prisma.jobHistory.count({ where: { userId, status: "PROCESSING" } }),
    prisma.jobHistory.count({ where: { userId, status: "FAILED" } }),
  ]);
  return { total, completed, processing, failed };
}
