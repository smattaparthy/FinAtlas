/**
 * CSV Parser utility for importing financial data.
 */

interface CSVParseResult {
  headers: string[];
  rows: string[][];
  errors: string[];
}

const MAX_CSV_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Parse CSV text into structured data.
 */
export function parseCSV(text: string): CSVParseResult {
  if (text.length > MAX_CSV_SIZE) {
    return { headers: [], rows: [], errors: ["File exceeds maximum size of 10MB"] };
  }

  const errors: string[] = [];
  const lines = text.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length === 0) {
    return { headers: [], rows: [], errors: ["Empty CSV file"] };
  }

  // Parse headers
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    try {
      const row = parseCSVLine(lines[i]);
      if (row.length !== headers.length) {
        errors.push(`Row ${i + 1}: Expected ${headers.length} columns, got ${row.length}`);
        // Pad or truncate to match header count
        while (row.length < headers.length) row.push("");
        if (row.length > headers.length) row.length = headers.length;
      }
      rows.push(row);
    } catch {
      errors.push(`Row ${i + 1}: Failed to parse`);
    }
  }

  return { headers, rows, errors };
}

/**
 * Parse a single CSV line, handling quoted values.
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          // End of quoted section
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Convert parsed CSV to objects using column mapping.
 */
export function mapCSVToObjects<T extends Record<string, unknown>>(
  headers: string[],
  rows: string[][],
  mapping: Record<keyof T, string | null>
): { data: Partial<T>[]; errors: string[] } {
  const errors: string[] = [];
  const data: Partial<T>[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const obj: Partial<T> = {};

    for (const [targetField, sourceColumn] of Object.entries(mapping)) {
      if (!sourceColumn) continue;

      const columnIndex = headers.indexOf(sourceColumn);
      if (columnIndex === -1) {
        errors.push(`Row ${i + 1}: Column "${sourceColumn}" not found`);
        continue;
      }

      const value = row[columnIndex];
      (obj as Record<string, unknown>)[targetField] = value;
    }

    data.push(obj);
  }

  return { data, errors };
}

/**
 * Attempt to auto-detect column mappings based on common patterns.
 */
export function autoDetectMapping(
  headers: string[],
  targetFields: { field: string; patterns: string[] }[]
): Record<string, string | null> {
  const mapping: Record<string, string | null> = {};
  const normalizedHeaders = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

  for (const { field, patterns } of targetFields) {
    let matched: string | null = null;

    for (const pattern of patterns) {
      const normalizedPattern = pattern.toLowerCase().replace(/[^a-z0-9]/g, "");

      // Check for exact match
      const exactIndex = normalizedHeaders.indexOf(normalizedPattern);
      if (exactIndex !== -1) {
        matched = headers[exactIndex];
        break;
      }

      // Check for partial match
      const partialIndex = normalizedHeaders.findIndex(
        (h) => h.includes(normalizedPattern) || normalizedPattern.includes(h)
      );
      if (partialIndex !== -1) {
        matched = headers[partialIndex];
        break;
      }
    }

    mapping[field] = matched;
  }

  return mapping;
}

/**
 * Common field patterns for auto-detection.
 */
export const INCOME_FIELD_PATTERNS = [
  { field: "name", patterns: ["name", "source", "description", "income source", "title"] },
  { field: "amount", patterns: ["amount", "value", "salary", "gross", "net", "income"] },
  { field: "frequency", patterns: ["frequency", "period", "pay period", "schedule"] },
  { field: "startDate", patterns: ["start date", "startdate", "start", "begin", "effective date"] },
  { field: "endDate", patterns: ["end date", "enddate", "end", "termination"] },
];

export const EXPENSE_FIELD_PATTERNS = [
  { field: "name", patterns: ["name", "description", "merchant", "payee", "expense"] },
  { field: "category", patterns: ["category", "type", "class", "group"] },
  { field: "amount", patterns: ["amount", "value", "cost", "price", "total"] },
  { field: "frequency", patterns: ["frequency", "period", "schedule", "recurrence"] },
  { field: "startDate", patterns: ["start date", "startdate", "date", "effective"] },
  { field: "isEssential", patterns: ["essential", "required", "necessary", "fixed"] },
];

export const ACCOUNT_FIELD_PATTERNS = [
  { field: "name", patterns: ["name", "account name", "account", "title"] },
  { field: "type", patterns: ["type", "account type", "category"] },
  { field: "balance", patterns: ["balance", "value", "amount", "total"] },
  { field: "growthRate", patterns: ["growth", "return", "yield", "rate"] },
];

export const LOAN_FIELD_PATTERNS = [
  { field: "name", patterns: ["name", "loan name", "description", "title"] },
  { field: "type", patterns: ["type", "loan type", "category"] },
  { field: "principal", patterns: ["principal", "amount", "original", "balance"] },
  { field: "interestRate", patterns: ["interest", "rate", "apr", "apy"] },
  { field: "termMonths", patterns: ["term", "months", "duration", "period"] },
  { field: "monthlyPayment", patterns: ["payment", "monthly", "installment"] },
  { field: "startDate", patterns: ["start", "date", "origination", "begin"] },
  // Mortgage-specific fields
  { field: "propertyAddress", patterns: ["property address", "address", "property location", "home address"] },
  { field: "propertyZipCode", patterns: ["zip", "zipcode", "zip code", "postal", "postal code"] },
  { field: "propertyCity", patterns: ["city", "property city", "municipality"] },
  { field: "propertyState", patterns: ["state", "property state", "province"] },
  { field: "propertyCounty", patterns: ["county", "property county", "district"] },
  { field: "propertyValue", patterns: ["property value", "home value", "appraised value", "market value", "purchase price"] },
  { field: "annualPropertyTax", patterns: ["property tax", "annual tax", "real estate tax", "taxes"] },
  { field: "annualHomeInsurance", patterns: ["home insurance", "homeowners insurance", "property insurance", "insurance"] },
  { field: "monthlyHOAFees", patterns: ["hoa", "hoa fees", "association fees", "condo fees", "homeowners association"] },
  { field: "monthlyPMI", patterns: ["pmi", "mortgage insurance", "private mortgage insurance"] },
  { field: "insuranceProvider", patterns: ["insurance provider", "insurance company", "insurer"] },
  { field: "hoaName", patterns: ["hoa name", "association name", "hoa"] },
];

/**
 * Parse common value formats.
 */
export function parseAmount(value: string): number | null {
  if (!value) return null;
  // Remove currency symbols, commas, spaces
  const cleaned = value.replace(/[$£€,\s]/g, "").replace(/^\((.+)\)$/, "-$1");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export function parseDate(value: string): string | null {
  if (!value) return null;

  // Try common date formats
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // MM/DD/YYYY
    /^(\d{2})-(\d{2})-(\d{4})$/, // MM-DD-YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/, // M/D/YY or M/D/YYYY
  ];

  for (const format of formats) {
    const match = value.match(format);
    if (match) {
      let year: number, month: number, day: number;

      if (format === formats[0]) {
        [, year, month, day] = match.map(Number) as [never, number, number, number];
      } else if (format === formats[1] || format === formats[2]) {
        [, month, day, year] = match.map(Number) as [never, number, number, number];
      } else {
        const parts = match.map(Number) as number[];
        month = parts[1];
        day = parts[2];
        year = parts[3];
        if (year < 100) year += 2000;
      }

      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0];
      }
    }
  }

  return null;
}

export function parseFrequency(value: string): string | null {
  if (!value) return null;
  const lower = value.toLowerCase();

  if (lower.includes("month")) return "MONTHLY";
  if (lower.includes("biweek") || lower.includes("bi-week") || lower.includes("every 2 week"))
    return "BIWEEKLY";
  if (lower.includes("week")) return "WEEKLY";
  if (lower.includes("annual") || lower.includes("year")) return "ANNUAL";
  if (lower.includes("one") && lower.includes("time")) return "ONE_TIME";

  return null;
}

export function parseBoolean(value: string): boolean | null {
  if (!value) return null;
  const lower = value.toLowerCase();

  if (["yes", "true", "1", "y"].includes(lower)) return true;
  if (["no", "false", "0", "n"].includes(lower)) return false;

  return null;
}
