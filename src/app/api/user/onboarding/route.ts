import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { getSession } from "@/lib/auth/get-session";
import { getUserConfig, upsertUserConfig } from "@/lib/db/scoped-queries";
import {
  enumStepToRoute,
  routeStepToEnum,
  type OnboardingRouteStep,
} from "@/lib/onboarding/state";

const updateOnboardingSchema = z.object({
  step: z.enum(["connect", "configure"]).optional(),
  completed: z.boolean().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await getUserConfig(session.user.id);

  return NextResponse.json({
    step: enumStepToRoute(config?.onboardingStep),
    completed: !!config?.onboardingCompletedAt,
  });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateOnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const data = parsed.data;
  if (data.step === undefined && data.completed === undefined) {
    return NextResponse.json(
      { error: "Nothing to update" },
      { status: 400 }
    );
  }

  const configData: {
    onboardingStep?: ReturnType<typeof routeStepToEnum>;
    onboardingCompletedAt?: Date | null;
  } = {};

  if (data.step) {
    configData.onboardingStep = routeStepToEnum(
      data.step as OnboardingRouteStep
    );
  }

  if (data.completed !== undefined) {
    configData.onboardingCompletedAt = data.completed ? new Date() : null;
  }

  await upsertUserConfig(session.user.id, configData);

  return NextResponse.json({ success: true });
}
