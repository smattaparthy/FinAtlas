import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { AnthropicKeyManager } from "@/components/settings/AnthropicKeyManager";
import { HouseholdManager } from "@/components/settings/HouseholdManager";
import { PreferencesSection } from "@/components/settings/PreferencesSection";
import { DeleteAccountSection } from "@/components/settings/DeleteAccountSection";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  // Get user data
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      email: true,
      createdAt: true,
    },
  });

  // Get household data
  const households = await prisma.household.findMany({
    where: { ownerUserId: user.id },
    include: {
      scenarios: {
        select: {
          id: true,
          name: true,
          isBaseline: true,
        },
      },
      members: {
        select: {
          id: true,
          name: true,
          roleTag: true,
        },
      },
      _count: {
        select: {
          members: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-zinc-400 mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile Section */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-lg font-medium">Profile Information</h2>
          <p className="text-sm text-zinc-400 mt-1">Your account details</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm text-zinc-400">Name</label>
            <p className="text-zinc-100 mt-1">{dbUser?.name || "Not set"}</p>
          </div>
          <div>
            <label className="text-sm text-zinc-400">Email</label>
            <p className="text-zinc-100 mt-1">{dbUser?.email}</p>
          </div>
          <div>
            <label className="text-sm text-zinc-400">Member since</label>
            <p className="text-zinc-100 mt-1">
              {dbUser?.createdAt.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Anthropic API Key */}
      <AnthropicKeyManager />

      {/* Household Information */}
      <HouseholdManager
        initialHouseholds={households.map((h) => ({
          id: h.id,
          name: h.name,
          createdAt: h.createdAt.toISOString(),
          updatedAt: h.updatedAt.toISOString(),
          scenarios: h.scenarios,
          members: h.members,
          _count: h._count,
        }))}
      />

      {/* Preferences */}
      <PreferencesSection />

      {/* Danger Zone */}
      <DeleteAccountSection />
    </div>
  );
}
