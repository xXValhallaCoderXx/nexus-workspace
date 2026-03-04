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
  } = {}
) {
  const { page = 1, limit = 20, status } = options;
  const where = { userId, ...(status ? { status } : {}) };

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
