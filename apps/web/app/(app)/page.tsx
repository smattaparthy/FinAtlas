import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  // Get user name from database
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true },
  });

  const displayName = dbUser?.name || dbUser?.email?.split("@")[0] || "there";

  return <DashboardClient userName={displayName} />;
}
