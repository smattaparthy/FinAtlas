"use client";

import { useState, useCallback } from "react";
import {
  parseCSV,
  autoDetectMapping,
  mapCSVToObjects,
  parseAmount,
  parseDate,
  parseFrequency,
  parseBoolean,
  INCOME_FIELD_PATTERNS,
  EXPENSE_FIELD_PATTERNS,
  ACCOUNT_FIELD_PATTERNS,
  LOAN_FIELD_PATTERNS,
} from "@/lib/csv-parser";

type ImportType = "income" | "expense" | "account" | "loan";

interface ImportField {
  field: string;
  label: string;
  required: boolean;
  parser?: (value: string) => unknown;
}

const IMPORT_CONFIGS: Record<ImportType, { fields: ImportField[]; patterns: { field: string; patterns: string[] }[] }> = {
  income: {
    patterns: INCOME_FIELD_PATTERNS,
    fields: [
      { field: "name", label: "Name", required: true },
      { field: "amount", label: "Amount", required: true, parser: parseAmount },
      { field: "frequency", label: "Frequency", required: false, parser: parseFrequency },
      { field: "startDate", label: "Start Date", required: false, parser: parseDate },
      { field: "endDate", label: "End Date", required: false, parser: parseDate },
    ],
  },
  expense: {
    patterns: EXPENSE_FIELD_PATTERNS,
    fields: [
      { field: "name", label: "Name", required: false },
      { field: "category", label: "Category", required: true },
      { field: "amount", label: "Amount", required: true, parser: parseAmount },
      { field: "frequency", label: "Frequency", required: false, parser: parseFrequency },
      { field: "startDate", label: "Start Date", required: false, parser: parseDate },
      { field: "isEssential", label: "Essential", required: false, parser: parseBoolean },
    ],
  },
  account: {
    patterns: ACCOUNT_FIELD_PATTERNS,
    fields: [
      { field: "name", label: "Name", required: true },
      { field: "type", label: "Type", required: true },
      { field: "balance", label: "Balance", required: true, parser: parseAmount },
      { field: "growthRate", label: "Growth Rate (%)", required: false, parser: parseAmount },
    ],
  },
  loan: {
    patterns: LOAN_FIELD_PATTERNS,
    fields: [
      { field: "name", label: "Name", required: true },
      { field: "type", label: "Type", required: false },
      { field: "principal", label: "Principal", required: true, parser: parseAmount },
      { field: "interestRate", label: "Interest Rate (%)", required: true, parser: parseAmount },
      { field: "termMonths", label: "Term (months)", required: true, parser: parseAmount },
      { field: "monthlyPayment", label: "Monthly Payment", required: false, parser: parseAmount },
      { field: "startDate", label: "Start Date", required: false, parser: parseDate },
      // Mortgage-specific fields
      { field: "propertyAddress", label: "Property Address", required: false },
      { field: "propertyZipCode", label: "ZIP Code", required: false },
      { field: "propertyCity", label: "City", required: false },
      { field: "propertyState", label: "State", required: false },
      { field: "propertyCounty", label: "County", required: false },
      { field: "propertyValue", label: "Property Value", required: false, parser: parseAmount },
      { field: "annualPropertyTax", label: "Annual Property Tax", required: false, parser: parseAmount },
      { field: "annualHomeInsurance", label: "Annual Home Insurance", required: false, parser: parseAmount },
      { field: "monthlyHOAFees", label: "Monthly HOA Fees", required: false, parser: parseAmount },
      { field: "monthlyPMI", label: "Monthly PMI", required: false, parser: parseAmount },
      { field: "insuranceProvider", label: "Insurance Provider", required: false },
      { field: "hoaName", label: "HOA Name", required: false },
    ],
  },
};

interface CSVImportWizardProps {
  type: ImportType;
  scenarioId: string;
  onComplete: (count: number) => void;
  onCancel: () => void;
}

type WizardStep = "upload" | "mapping" | "preview" | "importing" | "done";

export default function CSVImportWizard({
  type,
  scenarioId,
  onComplete,
  onCancel,
}: CSVImportWizardProps) {
  const [step, setStep] = useState<WizardStep>("upload");
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);

  const config = IMPORT_CONFIGS[type];

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const result = parseCSV(text);

        if (result.errors.length > 0) {
          setErrors(result.errors);
        }

        if (result.headers.length > 0) {
          setCsvData({ headers: result.headers, rows: result.rows });

          // Auto-detect column mapping
          const detectedMapping = autoDetectMapping(result.headers, config.patterns);
          setMapping(detectedMapping);
          setStep("mapping");
        }
      };
      reader.readAsText(file);
    },
    [config.patterns]
  );

  const handleMappingChange = (field: string, value: string | null) => {
    setMapping((prev) => ({ ...prev, [field]: value }));
  };

  const handlePreview = () => {
    if (!csvData) return;

    const { data, errors: mapErrors } = mapCSVToObjects(
      csvData.headers,
      csvData.rows,
      mapping
    );

    // Parse values
    const parsed = data.map((row) => {
      const parsedRow: Record<string, unknown> = {};
      for (const field of config.fields) {
        const rawValue = row[field.field as keyof typeof row] as string;
        parsedRow[field.field] = field.parser ? field.parser(rawValue) : rawValue;
      }
      return parsedRow;
    });

    setPreviewData(parsed);
    setErrors(mapErrors);
    setStep("preview");
  };

  const handleImport = async () => {
    setStep("importing");
    setImportProgress(0);

    const endpoint = `/api/${type === "account" ? "accounts" : type + "s"}`;
    let successCount = 0;
    const importErrors: string[] = [];

    for (let i = 0; i < previewData.length; i++) {
      const row = previewData[i];

      // Skip rows with missing required fields
      const missingRequired = config.fields
        .filter((f) => f.required && !row[f.field])
        .map((f) => f.label);

      if (missingRequired.length > 0) {
        importErrors.push(`Row ${i + 1}: Missing required fields: ${missingRequired.join(", ")}`);
        setImportProgress(Math.round(((i + 1) / previewData.length) * 100));
        continue;
      }

      try {
        const payload = {
          ...row,
          scenarioId,
          // Set defaults for optional fields
          frequency: row.frequency || "MONTHLY",
          growthRule: "NONE",
          startDate: row.startDate || new Date().toISOString().split("T")[0],
          // Convert interest rate from percentage to decimal for loans
          ...(type === "loan" && row.interestRate !== undefined && row.interestRate !== null
            ? { interestRate: (row.interestRate as number) / 100 }
            : {}),
        };

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          successCount++;
        } else {
          const data = await res.json();
          importErrors.push(`Row ${i + 1}: ${data.error || "Failed to import"}`);
        }
      } catch (err) {
        importErrors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }

      setImportProgress(Math.round(((i + 1) / previewData.length) * 100));
    }

    setImportedCount(successCount);
    setErrors(importErrors);
    setStep("done");
  };

  const inputClass =
    "w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600 text-zinc-50";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Import {type.charAt(0).toUpperCase() + type.slice(1)}s from CSV</h2>
        <button
          onClick={onCancel}
          className="text-zinc-400 hover:text-zinc-50 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-6">
        {["upload", "mapping", "preview", "done"].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s || ["mapping", "preview", "importing", "done"].indexOf(step) > i
                  ? "bg-zinc-50 text-zinc-950"
                  : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {i + 1}
            </div>
            {i < 3 && <div className="w-12 h-0.5 bg-zinc-800 mx-2" />}
          </div>
        ))}
      </div>

      {/* Step: Upload */}
      {step === "upload" && (
        <div className="space-y-4">
          <p className="text-zinc-400 text-sm">
            Upload a CSV file with your {type} data. The first row should contain column headers.
          </p>

          <div className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer text-zinc-400 hover:text-zinc-50 transition-colors"
            >
              <div className="text-3xl mb-2">📄</div>
              <div className="font-medium">Click to upload CSV</div>
              <div className="text-xs text-zinc-500 mt-1">or drag and drop</div>
            </label>
          </div>

          {errors.length > 0 && (
            <div className="rounded-xl border border-red-900 bg-red-950/50 p-4">
              <div className="text-red-400 text-sm font-medium mb-2">Errors</div>
              <ul className="text-red-400/80 text-xs space-y-1">
                {errors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {errors.length > 5 && <li>...and {errors.length - 5} more</li>}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Step: Mapping */}
      {step === "mapping" && csvData && (
        <div className="space-y-4">
          <p className="text-zinc-400 text-sm">
            Map your CSV columns to the required fields. We&apos;ve auto-detected some mappings for you.
          </p>

          <div className="space-y-3">
            {config.fields.map((field) => (
              <div key={field.field} className="flex items-center gap-4">
                <label className="w-32 text-sm text-zinc-300">
                  {field.label}
                  {field.required && <span className="text-red-400">*</span>}
                </label>
                <select
                  className={inputClass}
                  value={mapping[field.field] || ""}
                  onChange={(e) => handleMappingChange(field.field, e.target.value || null)}
                >
                  <option value="">-- Not mapped --</option>
                  {csvData.headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handlePreview}
              className="px-4 py-2 bg-zinc-50 text-zinc-950 rounded-xl font-medium hover:bg-zinc-200 transition-colors"
            >
              Preview Import
            </button>
            <button
              onClick={() => setStep("upload")}
              className="px-4 py-2 border border-zinc-700 rounded-xl text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* Step: Preview */}
      {step === "preview" && (
        <div className="space-y-4">
          <p className="text-zinc-400 text-sm">
            Review the data before importing. Found {previewData.length} rows.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 px-2 text-zinc-400 font-medium">#</th>
                  {config.fields.map((field) => (
                    <th key={field.field} className="text-left py-2 px-2 text-zinc-400 font-medium">
                      {field.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 10).map((row, i) => (
                  <tr key={i} className="border-b border-zinc-800/50">
                    <td className="py-2 px-2 text-zinc-500">{i + 1}</td>
                    {config.fields.map((field) => (
                      <td key={field.field} className="py-2 px-2">
                        {row[field.field] !== null && row[field.field] !== undefined
                          ? String(row[field.field])
                          : <span className="text-zinc-500">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {previewData.length > 10 && (
            <p className="text-zinc-500 text-xs">Showing first 10 of {previewData.length} rows</p>
          )}

          {errors.length > 0 && (
            <div className="rounded-xl border border-amber-900 bg-amber-950/50 p-4">
              <div className="text-amber-400 text-sm font-medium mb-2">Warnings</div>
              <ul className="text-amber-400/80 text-xs space-y-1">
                {errors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {errors.length > 5 && <li>...and {errors.length - 5} more</li>}
              </ul>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleImport}
              className="px-4 py-2 bg-zinc-50 text-zinc-950 rounded-xl font-medium hover:bg-zinc-200 transition-colors"
            >
              Import {previewData.length} Rows
            </button>
            <button
              onClick={() => setStep("mapping")}
              className="px-4 py-2 border border-zinc-700 rounded-xl text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* Step: Importing */}
      {step === "importing" && (
        <div className="space-y-4 py-8 text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-zinc-400">Importing data...</p>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div
              className="bg-zinc-50 h-2 rounded-full transition-all duration-300"
              style={{ width: `${importProgress}%` }}
            />
          </div>
          <p className="text-zinc-500 text-sm">{importProgress}% complete</p>
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <div className="space-y-4 py-8 text-center">
          <div className="text-4xl mb-4">{errors.length === 0 ? "✅" : "⚠️"}</div>
          <p className="text-xl font-semibold">
            Imported {importedCount} of {previewData.length} items
          </p>

          {errors.length > 0 && (
            <div className="rounded-xl border border-red-900 bg-red-950/50 p-4 text-left">
              <div className="text-red-400 text-sm font-medium mb-2">
                {errors.length} errors occurred
              </div>
              <ul className="text-red-400/80 text-xs space-y-1 max-h-32 overflow-y-auto">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => onComplete(importedCount)}
            className="px-6 py-2 bg-zinc-50 text-zinc-950 rounded-xl font-medium hover:bg-zinc-200 transition-colors mt-4"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
