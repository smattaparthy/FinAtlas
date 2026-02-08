export type CategorizationRule = {
  id: string;
  pattern: string;
  matchType: "contains" | "startsWith" | "exact";
  category: string;
};

export const DEFAULT_RULES: CategorizationRule[] = [
  { id: "rule-1", pattern: "rent", matchType: "contains", category: "Housing" },
  { id: "rule-2", pattern: "mortgage", matchType: "contains", category: "Housing" },
  { id: "rule-3", pattern: "grocery", matchType: "contains", category: "Food" },
  { id: "rule-4", pattern: "restaurant", matchType: "contains", category: "Food" },
  { id: "rule-5", pattern: "uber", matchType: "contains", category: "Transportation" },
  { id: "rule-6", pattern: "lyft", matchType: "contains", category: "Transportation" },
  { id: "rule-7", pattern: "gas", matchType: "contains", category: "Transportation" },
  { id: "rule-8", pattern: "electric", matchType: "contains", category: "Utilities" },
  { id: "rule-9", pattern: "water", matchType: "contains", category: "Utilities" },
  { id: "rule-10", pattern: "internet", matchType: "contains", category: "Utilities" },
  { id: "rule-11", pattern: "phone", matchType: "contains", category: "Utilities" },
  { id: "rule-12", pattern: "insurance", matchType: "contains", category: "Insurance" },
  { id: "rule-13", pattern: "netflix", matchType: "contains", category: "Entertainment" },
  { id: "rule-14", pattern: "spotify", matchType: "contains", category: "Entertainment" },
  { id: "rule-15", pattern: "gym", matchType: "contains", category: "Health" },
  { id: "rule-16", pattern: "doctor", matchType: "contains", category: "Health" },
  { id: "rule-17", pattern: "pharmacy", matchType: "contains", category: "Health" },
  { id: "rule-18", pattern: "amazon", matchType: "contains", category: "Shopping" },
  { id: "rule-19", pattern: "clothing", matchType: "contains", category: "Shopping" },
  { id: "rule-20", pattern: "daycare", matchType: "contains", category: "Childcare" },
  { id: "rule-21", pattern: "tuition", matchType: "contains", category: "Education" },
  { id: "rule-22", pattern: "subscription", matchType: "contains", category: "Subscriptions" },
  { id: "rule-23", pattern: "pet", matchType: "contains", category: "Pets" },
  { id: "rule-24", pattern: "travel", matchType: "contains", category: "Travel" },
  { id: "rule-25", pattern: "donation", matchType: "contains", category: "Charity" },
  { id: "rule-26", pattern: "hoa", matchType: "contains", category: "Housing" },
  { id: "rule-27", pattern: "cable", matchType: "contains", category: "Utilities" },
  { id: "rule-28", pattern: "streaming", matchType: "contains", category: "Entertainment" },
];
