import { getSession } from "@/lib/auth/get-session";
import { getUserConfig } from "@/lib/db/scoped-queries";
import { AiEngineContent } from "./ai-engine-content";

export default async function AiEnginePage() {
  const session = await getSession();
  const userId = session!.user.id;

  const config = await getUserConfig(userId);

  return (
    <AiEngineContent
      hasCustomKey={!!config?.encryptedOpenRouterKey}
      customSystemPrompt={config?.customSystemPrompt ?? null}
    />
  );
}
