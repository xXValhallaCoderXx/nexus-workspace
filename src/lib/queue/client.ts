import { Client } from "@upstash/qstash";

let _qstash: Client | undefined;

export function getQStash(): Client {
  if (!_qstash) {
    if (!process.env.QSTASH_TOKEN) {
      throw new Error("QSTASH_TOKEN environment variable is not set");
    }
    _qstash = new Client({
      token: process.env.QSTASH_TOKEN,
    });
  }
  return _qstash;
}
