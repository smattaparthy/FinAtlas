import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import AssistantClient from "@/components/assistant/AssistantClient";

export default async function AssistantPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Get user's baseline scenario
  const households = await prisma.household.findMany({
    where: { ownerUserId: user.id },
    include: {
      scenarios: {
        where: { isBaseline: true },
        take: 1,
      },
    },
  });

  if (households.length === 0 || !households[0].scenarios[0]) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-zinc-300">No baseline scenario found</h2>
          <p className="text-zinc-500 mt-2">Create a household and scenario to use the assistant.</p>
        </div>
      </div>
    );
  }

  const scenarioId = households[0].scenarios[0].id;

  return <AssistantClient scenarioId={scenarioId} />;
}
