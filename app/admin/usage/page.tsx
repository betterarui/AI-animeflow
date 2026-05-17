import { redirect } from "next/navigation";
import { AdminUsageClient } from "@/components/admin-usage-client";
import { requireAdmin } from "@/lib/auth";

export default async function AdminUsagePage() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/login");
    }
    redirect("/dashboard");
  }

  return <AdminUsageClient />;
}
