import { Receiver } from "@upstash/qstash";

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

export async function verifyQStashSignature(
  request: Request
): Promise<boolean> {
  const body = await request.text();
  const signature = request.headers.get("upstash-signature");

  if (!signature) return false;

  try {
    await receiver.verify({ body, signature });
    return true;
  } catch {
    return false;
  }
}

export async function requireQStashSignature(
  request: Request
): Promise<string> {
  const body = await request.clone().text();
  const signature = request.headers.get("upstash-signature");

  if (!signature) {
    throw new Error("Missing QStash signature");
  }

  await receiver.verify({ body, signature });
  return body;
}
