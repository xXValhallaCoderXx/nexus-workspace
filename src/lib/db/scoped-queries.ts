import { prisma } from "./prisma";
import type { JobStatus } from "@/generated/prisma/enums";

export async function getUserConfig(userId: string) {
  return prisma.userConfig.findUnique({ where: { userId } });
}

export async function upsertUserConfig(
  userId: string,
  data: {
    meetingSummariesEnabled?: boolean;
    selectedDestination?: string;
    encryptedOpenRouterKey?: string | null;
    encryptedSlackWebhookUrl?: string | null;
    drivePageToken?: string | null;
  }
) {
  return prisma.userConfig.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
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

export async function getJobStatusCounts(userId: string) {
  const [total, completed, processing, failed] = await Promise.all([
    prisma.jobHistory.count({ where: { userId } }),
    prisma.jobHistory.count({ where: { userId, status: "COMPLETED" } }),
    prisma.jobHistory.count({ where: { userId, status: "PROCESSING" } }),
    prisma.jobHistory.count({ where: { userId, status: "FAILED" } }),
  ]);
  return { total, completed, processing, failed };
}
