import { NextResponse } from "next/server";
import { getSession } from "./get-session";

export async function withAuth<T>(
  handler: (userId: string) => Promise<T>
): Promise<NextResponse> {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await handler(session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
