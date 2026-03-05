import { getRedis } from "./client";

const DEDUP_TTL_SECONDS = 300; // 5 minutes

export async function isDuplicate(
  resourceId: string,
  changeToken: string
): Promise<boolean> {
  const redis = getRedis();
  const key = `dedup:${resourceId}:${changeToken}`;
  const result = await redis.set(key, "1", { nx: true, ex: DEDUP_TTL_SECONDS });
  // result is "OK" if key was set (first occurrence), null if already existed (duplicate)
  return result === null;
}
