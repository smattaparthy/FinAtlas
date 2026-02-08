"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useScenario } from "@/contexts/ScenarioContext";

interface Command {
  id: string;
  name: string;
  shortcut?: string;
  section: string;
  icon: React.ReactNode;
  action: () => void;
}

interface SearchResult {
  id: string;
  type: "income" | "expense" | "account" | "loan" | "goal";
  name: string;
  subtitle: string;
  href: string;
}

interface RecentSearch {
  term: string;
  timestamp: number;
}

const RECENT_SEARCHES_KEY = "finatlas_recent_searches";
const MAX_RECENT_SEARCHES = 5;

function getRecentSearches(): RecentSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as RecentSearch[];
    return parsed.slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

function saveRecentSearch(term: string) {
  if (typeof window === "undefined") return;
  try {
    const existing = getRecentSearches();
    const filtered = existing.filter((r) => r.term !== term);
    const updated = [{ term, timestamp: Date.now() }, ...filtered].slice(
      0,
      MAX_RECENT_SEARCHES
    );
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
}

const ENTITY_TYPE_LABELS: Record<SearchResult["type"], string> = {
  income: "Income",
  expense: "Expenses",
  account: "Accounts",
  loan: "Loans",
  goal: "Goals",
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { selectedScenarioId } = useScenario();

  const commands: Command[] = [
    // Navigation
    {
      id: "nav-dashboard",
      name: "Go to Dashboard",
      shortcut: "G D",
      section: "Navigation",
      icon: <HomeIcon />,
      action: () => router.push("/"),
    },
    {
      id: "nav-incomes",
      name: "Go to Incomes",
      shortcut: "G I",
      section: "Navigation",
      icon: <IncomeIcon />,
      action: () => router.push("/incomes"),
    },
    {
      id: "nav-expenses",
      name: "Go to Expenses",
      shortcut: "G E",
      section: "Navigation",
      icon: <ExpenseIcon />,
      action: () => router.push("/expenses"),
    },
    {
      id: "nav-investments",
      name: "Go to Investments",
      shortcut: "G V",
      section: "Navigation",
      icon: <InvestIcon />,
      action: () => router.push("/investments"),
    },
    {
      id: "nav-loans",
      name: "Go to Loans",
      shortcut: "G L",
      section: "Navigation",
      icon: <LoanIcon />,
      action: () => router.push("/loans"),
    },
    {
      id: "nav-goals",
      name: "Go to Goals",
      shortcut: "G G",
      section: "Navigation",
      icon: <GoalIcon />,
      action: () => router.push("/goals"),
    },
    // Actions
    {
      id: "add-income",
      name: "Add New Income",
      section: "Actions",
      icon: <PlusIcon />,
      action: () => router.push("/incomes/new"),
    },
    {
      id: "add-expense",
      name: "Add New Expense",
      section: "Actions",
      icon: <PlusIcon />,
      action: () => router.push("/expenses/new"),
    },
    {
      id: "add-account",
      name: "Add Investment Account",
      section: "Actions",
      icon: <PlusIcon />,
      action: () => router.push("/investments/new"),
    },
    {
      id: "add-loan",
      name: "Add New Loan",
      section: "Actions",
      icon: <PlusIcon />,
      action: () => router.push("/loans/new"),
    },
    {
      id: "add-goal",
      name: "Add New Goal",
      section: "Actions",
      icon: <PlusIcon />,
      action: () => router.push("/goals/new"),
    },
  ];

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(search.toLowerCase()) ||
      cmd.section.toLowerCase().includes(search.toLowerCase())
  );

  const sections = [...new Set(filteredCommands.map((cmd) => cmd.section))];

  // Group search results by type
  const searchResultsByType = searchResults.reduce(
    (acc, result) => {
      if (!acc[result.type]) acc[result.type] = [];
      acc[result.type].push(result);
      return acc;
    },
    {} as Record<string, SearchResult[]>
  );

  const searchResultTypes = Object.keys(searchResultsByType) as Array<
    SearchResult["type"]
  >;

  // Build a flat navigable list: commands first, then search results
  const flatNavigableItems: Array<
    | { kind: "command"; command: Command }
    | { kind: "result"; result: SearchResult }
  > = [
    ...filteredCommands.map((cmd) => ({
      kind: "command" as const,
      command: cmd,
    })),
    ...searchResults.map((result) => ({
      kind: "result" as const,
      result,
    })),
  ];

  const totalItems = flatNavigableItems.length;

  // Debounce search input
  useEffect(() => {
    if (search.length < 2) {
      setDebouncedSearch("");
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Fetch search results when debounced search changes
  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 2 || !selectedScenarioId) {
      setSearchResults([]);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);

    fetch(
      `/api/search?q=${encodeURIComponent(debouncedSearch)}&scenarioId=${encodeURIComponent(selectedScenarioId)}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setSearchResults(data.results || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSearchResults([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSearchLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, selectedScenarioId]);

  // Load recent searches when palette opens
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches());
    }
  }, [open]);

  // Reset selected index when search or results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [search, searchResults]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector(
      '[data-selected="true"]'
    ) as HTMLElement | null;
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleSelectItem = useCallback(
    (index: number) => {
      const item = flatNavigableItems[index];
      if (!item) return;

      if (item.kind === "command") {
        item.command.action();
      } else {
        saveRecentSearch(search);
        router.push(item.result.href);
      }
      setOpen(false);
    },
    [flatNavigableItems, search, router]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Open palette with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        setSearch("");
        setSelectedIndex(0);
        setSearchResults([]);
        setDebouncedSearch("");
        return;
      }

      if (!open) return;

      // Close with Escape
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }

      // Navigate with arrow keys
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : prev));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        return;
      }

      // Execute with Enter
      if (e.key === "Enter") {
        e.preventDefault();
        handleSelectItem(selectedIndex);
        return;
      }
    },
    [open, totalItems, selectedIndex, handleSelectItem]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  // Track the running global index for rendering
  let globalIndex = 0;

  const showRecentSearches = search.length === 0 && recentSearches.length > 0;
  const showNoResults =
    search.length >= 2 &&
    !searchLoading &&
    searchResults.length === 0 &&
    filteredCommands.length === 0;
  const showSearchNoResults =
    search.length >= 2 &&
    !searchLoading &&
    searchResults.length === 0 &&
    filteredCommands.length > 0;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="absolute left-1/2 top-[20%] -translate-x-1/2 w-full max-w-lg">
        <div className="rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
            <SearchIcon className="w-5 h-5 text-zinc-500" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search commands and entities..."
              className="flex-1 bg-transparent text-zinc-50 placeholder-zinc-500 outline-none text-sm"
            />
            {searchLoading && (
              <SpinnerIcon className="w-4 h-4 text-zinc-500 animate-spin" />
            )}
            <kbd className="px-2 py-0.5 text-xs text-zinc-500 bg-zinc-800 rounded">
              ESC
            </kbd>
          </div>

          {/* Commands and results list */}
          <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
            {/* Recent searches (when input is empty) */}
            {showRecentSearches && (
              <div>
                <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-3 py-1">
                  Recent Searches
                </div>
                {recentSearches.map((recent) => (
                  <button
                    key={recent.timestamp}
                    onClick={() => setSearch(recent.term)}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                  >
                    <span className="text-zinc-500">
                      <ClockIcon />
                    </span>
                    <span className="flex-1 text-sm">{recent.term}</span>
                  </button>
                ))}
                <div className="border-b border-zinc-800 my-1" />
              </div>
            )}

            {/* No results at all */}
            {showNoResults && (
              <div className="px-4 py-8 text-center text-sm text-zinc-500">
                No results found
              </div>
            )}

            {/* Navigation/Action commands */}
            {filteredCommands.length > 0 &&
              sections.map((section) => (
                <div key={section}>
                  <div className="px-4 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    {section}
                  </div>
                  {filteredCommands
                    .filter((cmd) => cmd.section === section)
                    .map((cmd) => {
                      const currentIndex = globalIndex++;
                      const isSelected = currentIndex === selectedIndex;

                      return (
                        <button
                          key={cmd.id}
                          data-selected={isSelected}
                          onClick={() => {
                            cmd.action();
                            setOpen(false);
                          }}
                          onMouseEnter={() => setSelectedIndex(currentIndex)}
                          className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                            isSelected
                              ? "bg-zinc-800 text-zinc-50"
                              : "text-zinc-300 hover:bg-zinc-800/50"
                          }`}
                        >
                          <span className="text-zinc-500">{cmd.icon}</span>
                          <span className="flex-1 text-sm">{cmd.name}</span>
                          {cmd.shortcut && (
                            <kbd className="px-2 py-0.5 text-xs text-zinc-500 bg-zinc-800 rounded">
                              {cmd.shortcut}
                            </kbd>
                          )}
                        </button>
                      );
                    })}
                </div>
              ))}

            {/* Search results grouped by entity type */}
            {searchResults.length > 0 && (
              <>
                {filteredCommands.length > 0 && (
                  <div className="border-b border-zinc-800 my-1" />
                )}
                {searchResultTypes.map((type) => (
                  <div key={type}>
                    <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-3 py-1">
                      {ENTITY_TYPE_LABELS[type]}
                    </div>
                    {searchResultsByType[type].map((result) => {
                      const currentIndex = globalIndex++;
                      const isSelected = currentIndex === selectedIndex;

                      return (
                        <button
                          key={result.id}
                          data-selected={isSelected}
                          onClick={() => {
                            saveRecentSearch(search);
                            router.push(result.href);
                            setOpen(false);
                          }}
                          onMouseEnter={() => setSelectedIndex(currentIndex)}
                          className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                            isSelected
                              ? "bg-zinc-800 text-zinc-50"
                              : "text-zinc-300 hover:bg-zinc-800/50"
                          }`}
                        >
                          <span className="text-zinc-500">
                            <EntityTypeIcon type={result.type} />
                          </span>
                          <span className="flex-1 text-sm min-w-0">
                            <span className="block truncate">
                              {result.name}
                            </span>
                            <span className="block text-xs text-zinc-500 truncate">
                              {result.subtitle}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </>
            )}

            {/* Search returned no entity results but commands matched */}
            {showSearchNoResults && (
              <>
                <div className="border-b border-zinc-800 my-1" />
                <div className="px-4 py-4 text-center text-sm text-zinc-500">
                  No matching entities found
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 px-4 py-2 border-t border-zinc-800 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">&uarr;</kbd>
              <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">&darr;</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">&crarr;</kbd>
              to select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">esc</kbd>
              to close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Entity type icon selector
function EntityTypeIcon({ type }: { type: SearchResult["type"] }) {
  switch (type) {
    case "income":
      return <DollarCircleIcon />;
    case "expense":
      return <ReceiptIcon />;
    case "account":
      return <BankIcon />;
    case "loan":
      return <CreditCardIcon />;
    case "goal":
      return <FlagIcon />;
  }
}

// Icons
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  );
}

function IncomeIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
      />
    </svg>
  );
}

function ExpenseIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
      />
    </svg>
  );
}

function InvestIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6"
      />
    </svg>
  );
}

function LoanIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"
      />
    </svg>
  );
}

function GoalIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.5v15m7.5-7.5h-15"
      />
    </svg>
  );
}

// Entity search result icons (16x16)
function DollarCircleIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5s-2 .5-2 1.5 1 1.5 2 1.5 2 .5 2 1.5-1 1.5-2 1.5-2-.5-2.5-1.5M12 7v1m0 8v1"
      />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

function BankIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"
      />
    </svg>
  );
}

function CreditCardIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
      />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5"
      />
    </svg>
  );
}
