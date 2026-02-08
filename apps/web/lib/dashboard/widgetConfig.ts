export type WidgetConfig = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  order: number;
};

type WidgetDefault = {
  id: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
  defaultOrder: number;
};

const STORAGE_KEY = "finatlas_dashboard_config";

export const AVAILABLE_WIDGETS: WidgetDefault[] = [
  {
    id: "summary-cards",
    name: "Summary Cards",
    description: "Income, expenses, net worth overview",
    defaultEnabled: true,
    defaultOrder: 0,
  },
  {
    id: "health-score",
    name: "Health Score",
    description: "Financial health gauge",
    defaultEnabled: true,
    defaultOrder: 1,
  },
  {
    id: "projection-chart",
    name: "Projection Chart",
    description: "Net worth projection over time",
    defaultEnabled: true,
    defaultOrder: 2,
  },
  {
    id: "quick-actions",
    name: "Quick Actions",
    description: "Shortcuts to common tasks",
    defaultEnabled: true,
    defaultOrder: 3,
  },
  {
    id: "goal-progress",
    name: "Goal Progress",
    description: "Track progress toward financial goals",
    defaultEnabled: true,
    defaultOrder: 4,
  },
  {
    id: "cash-flow-mini",
    name: "Cash Flow Summary",
    description: "Monthly income vs expenses snapshot",
    defaultEnabled: true,
    defaultOrder: 5,
  },
  {
    id: "recent-insights",
    name: "Recent Insights",
    description: "AI-generated financial insights",
    defaultEnabled: false,
    defaultOrder: 6,
  },
];

function getDefaults(): WidgetConfig[] {
  return AVAILABLE_WIDGETS.map((w) => ({
    id: w.id,
    name: w.name,
    description: w.description,
    enabled: w.defaultEnabled,
    order: w.defaultOrder,
  }));
}

export function getConfig(): WidgetConfig[] {
  if (typeof window === "undefined") {
    return getDefaults();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return getDefaults();
    }

    const parsed: WidgetConfig[] = JSON.parse(stored);
    const defaults = getDefaults();

    // Merge: preserve user preferences for known widgets, add any new widgets
    const storedMap = new Map(parsed.map((w) => [w.id, w]));
    const merged: WidgetConfig[] = [];

    // First, include all stored widgets that still exist in AVAILABLE_WIDGETS
    const availableIds = new Set(AVAILABLE_WIDGETS.map((w) => w.id));
    for (const stored of parsed) {
      if (availableIds.has(stored.id)) {
        // Find the default to get updated name/description
        const defaultWidget = defaults.find((d) => d.id === stored.id);
        merged.push({
          ...stored,
          name: defaultWidget?.name ?? stored.name,
          description: defaultWidget?.description ?? stored.description,
        });
      }
    }

    // Then, add any new widgets that weren't in the stored config
    const maxOrder = merged.length > 0
      ? Math.max(...merged.map((w) => w.order))
      : -1;
    let nextOrder = maxOrder + 1;

    for (const defaultWidget of defaults) {
      if (!storedMap.has(defaultWidget.id)) {
        merged.push({
          ...defaultWidget,
          order: nextOrder++,
        });
      }
    }

    return merged.sort((a, b) => a.order - b.order);
  } catch {
    return getDefaults();
  }
}

export function saveConfig(config: WidgetConfig[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

export function resetConfig(): WidgetConfig[] {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Silently fail
    }
  }
  return getDefaults();
}

export function isWidgetEnabled(config: WidgetConfig[], id: string): boolean {
  const widget = config.find((w) => w.id === id);
  return widget?.enabled ?? false;
}
