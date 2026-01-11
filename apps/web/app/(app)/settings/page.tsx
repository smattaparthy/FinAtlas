import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { AnthropicKeyManager } from "@/components/settings/AnthropicKeyManager";
import { HouseholdManager } from "@/components/settings/HouseholdManager";

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

      {/* Preferences Section (placeholder) */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-lg font-medium">Preferences</h2>
          <p className="text-sm text-zinc-400 mt-1">Customize your experience</p>
        </div>
        <div className="p-6">
          <div className="text-zinc-500 text-sm">
            <p>Preference settings coming soon...</p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-zinc-600">
              <li>Currency format preferences</li>
              <li>Date format preferences</li>
              <li>Notification settings</li>
              <li>Theme customization</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-red-900/50 bg-red-950/20 overflow-hidden">
        <div className="p-6 border-b border-red-900/50">
          <h2 className="text-lg font-medium text-red-400">Danger Zone</h2>
          <p className="text-sm text-red-400/70 mt-1">Irreversible actions</p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-zinc-100">Delete Account</p>
                <p className="text-sm text-zinc-500 mt-1">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <button
                disabled
                className="px-4 py-2 rounded-lg bg-red-900/30 text-red-400 text-sm font-medium opacity-50 cursor-not-allowed"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
