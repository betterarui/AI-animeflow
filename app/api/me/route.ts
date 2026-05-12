import { getCurrentUser, publicUser } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/http";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  return ok({ user: publicUser(user) });
}
