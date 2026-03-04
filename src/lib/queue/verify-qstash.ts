import { Receiver } from "@upstash/qstash";

let _receiver: Receiver | undefined;

function getReceiver(): Receiver {
  if (!_receiver) {
    if (!process.env.QSTASH_CURRENT_SIGNING_KEY) {
      throw new Error("QSTASH_CURRENT_SIGNING_KEY environment variable is not set");
    }
    if (!process.env.QSTASH_NEXT_SIGNING_KEY) {
      throw new Error("QSTASH_NEXT_SIGNING_KEY environment variable is not set");
    }
    _receiver = new Receiver({
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
    });
  }
  return _receiver;
}

export async function verifyQStashSignature(
  request: Request
): Promise<boolean> {
  const body = await request.text();
  const signature = request.headers.get("upstash-signature");

  if (!signature) return false;

  try {
    await getReceiver().verify({ body, signature });
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

  await getReceiver().verify({ body, signature });
  return body;
}
