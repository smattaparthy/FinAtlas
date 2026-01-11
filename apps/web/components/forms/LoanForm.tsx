"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

const LoanTypeEnum = z.enum(["MORTGAGE", "AUTO", "STUDENT", "PERSONAL", "HELOC", "OTHER"]);
type LoanType = z.infer<typeof LoanTypeEnum>;

const loanFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: LoanTypeEnum,
  principal: z.number().positive("Principal must be positive"),
  currentBalance: z.number().min(0, "Current balance cannot be negative"),
  interestRate: z.number().min(0, "Interest rate cannot be negative").max(1, "Interest rate cannot exceed 100%"),
  monthlyPayment: z.number().min(0, "Monthly payment cannot be negative").optional(),
  startDate: z.string().min(1, "Start date is required"),
  termMonths: z.number().int().positive("Term must be positive"),
  memberId: z.string().optional().nullable(),

  // Mortgage-specific fields
  propertyAddress: z.string().optional(),
  propertyZipCode: z.string().optional(),
  propertyCity: z.string().optional(),
  propertyState: z.string().optional(),
  propertyCounty: z.string().optional(),
  propertyValue: z.number().positive().optional(),
  annualPropertyTax: z.number().min(0).optional(),
  annualHomeInsurance: z.number().min(0).optional(),
  monthlyHOAFees: z.number().min(0).optional(),
  monthlyPMI: z.number().min(0).optional(),
  pmiRequired: z.boolean().optional(),
  insuranceProvider: z.string().optional(),
  hoaName: z.string().optional(),
});

type LoanFormData = z.infer<typeof loanFormSchema>;

type Member = {
  id: string;
  name: string;
};

type LoanFormProps = {
  scenarioId: string;
  initialData?: Partial<LoanFormData> & { id?: string };
  members?: Member[];
  isEdit?: boolean;
};

const LOAN_TYPES: { value: LoanType; label: string }[] = [
  { value: "MORTGAGE", label: "Mortgage" },
  { value: "AUTO", label: "Auto Loan" },
  { value: "STUDENT", label: "Student Loan" },
  { value: "PERSONAL", label: "Personal Loan" },
  { value: "HELOC", label: "HELOC" },
  { value: "OTHER", label: "Other" },
];

function calculateMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / termMonths;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
         (Math.pow(1 + monthlyRate, termMonths) - 1);
}

function formatDateForInput(date: string | Date | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

export default function LoanForm({ scenarioId, initialData, members = [], isEdit = false }: LoanFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [name, setName] = useState(initialData?.name || "");
  const [type, setType] = useState<LoanType>(initialData?.type || "OTHER");
  const [principal, setPrincipal] = useState(initialData?.principal?.toString() || "");
  const [currentBalance, setCurrentBalance] = useState(initialData?.currentBalance?.toString() || "");
  // Convert from decimal (0.06) to percentage (6) for display
  const [interestRate, setInterestRate] = useState(
    initialData?.interestRate !== undefined ? (initialData.interestRate * 100).toString() : ""
  );
  const [monthlyPayment, setMonthlyPayment] = useState(initialData?.monthlyPayment?.toString() || "");
  const [startDate, setStartDate] = useState(formatDateForInput(initialData?.startDate));
  const [termMonths, setTermMonths] = useState(initialData?.termMonths?.toString() || "");
  const [memberId, setMemberId] = useState(initialData?.memberId || "");

  const [autoCalculate, setAutoCalculate] = useState(!initialData?.monthlyPayment);

  // Mortgage-specific state
  const [propertyAddress, setPropertyAddress] = useState(initialData?.propertyAddress || "");
  const [propertyZipCode, setPropertyZipCode] = useState(initialData?.propertyZipCode || "");
  const [propertyCity, setPropertyCity] = useState(initialData?.propertyCity || "");
  const [propertyState, setPropertyState] = useState(initialData?.propertyState || "");
  const [propertyCounty, setPropertyCounty] = useState(initialData?.propertyCounty || "");
  const [propertyValue, setPropertyValue] = useState(initialData?.propertyValue?.toString() || "");
  const [annualPropertyTax, setAnnualPropertyTax] = useState(initialData?.annualPropertyTax?.toString() || "");
  const [annualHomeInsurance, setAnnualHomeInsurance] = useState(initialData?.annualHomeInsurance?.toString() || "");
  const [monthlyHOAFees, setMonthlyHOAFees] = useState(initialData?.monthlyHOAFees?.toString() || "");
  const [monthlyPMI, setMonthlyPMI] = useState(initialData?.monthlyPMI?.toString() || "");
  const [insuranceProvider, setInsuranceProvider] = useState(initialData?.insuranceProvider || "");
  const [hoaName, setHoaName] = useState(initialData?.hoaName || "");

  // Auto-calculate states for mortgage features
  const [autoCalculatePropertyTax, setAutoCalculatePropertyTax] = useState(!initialData?.annualPropertyTax);
  const [autoCalculateInsurance, setAutoCalculateInsurance] = useState(!initialData?.annualHomeInsurance);
  const [autoCalculatePMI, setAutoCalculatePMI] = useState(true);

  // Loading states for AI calculations
  const [calculatingTax, setCalculatingTax] = useState(false);
  const [calculatingInsurance, setCalculatingInsurance] = useState(false);
  const [taxExplanation, setTaxExplanation] = useState("");
  const [insuranceExplanation, setInsuranceExplanation] = useState("");

  // Auto-calculate monthly payment
  useEffect(() => {
    if (!autoCalculate) return;

    const p = parseFloat(principal);
    const r = parseFloat(interestRate);
    const t = parseInt(termMonths);

    if (p > 0 && r >= 0 && t > 0) {
      const calculated = calculateMonthlyPayment(p, r, t);
      setMonthlyPayment(calculated.toFixed(2));
    }
  }, [principal, interestRate, termMonths, autoCalculate]);

  // Auto-calculate property tax using AI
  useEffect(() => {
    if (!autoCalculatePropertyTax || type !== "MORTGAGE") return;
    if (!propertyAddress || !propertyValue || !propertyState) return;

    const calculateTax = async () => {
      setCalculatingTax(true);
      try {
        const res = await fetch('/api/loans/calculate-mortgage-costs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertyAddress,
            propertyValue: parseFloat(propertyValue),
            propertyState,
            propertyZipCode,
            propertyCity,
            propertyCounty,
            calculationType: 'propertyTax',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setAnnualPropertyTax(data.estimatedCost.toFixed(2));
          setTaxExplanation(data.explanation);
        }
      } catch (err) {
        console.error('Tax calculation failed:', err);
      } finally {
        setCalculatingTax(false);
      }
    };

    const debounce = setTimeout(calculateTax, 1000);
    return () => clearTimeout(debounce);
  }, [propertyAddress, propertyValue, propertyState, propertyZipCode, propertyCity, propertyCounty, autoCalculatePropertyTax, type]);

  // Auto-calculate homeowners insurance using AI
  useEffect(() => {
    if (!autoCalculateInsurance || type !== "MORTGAGE") return;
    if (!propertyAddress || !propertyValue || !propertyState) return;

    const calculateInsurance = async () => {
      setCalculatingInsurance(true);
      try {
        const res = await fetch('/api/loans/calculate-mortgage-costs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertyAddress,
            propertyValue: parseFloat(propertyValue),
            propertyState,
            propertyZipCode,
            propertyCity,
            calculationType: 'insurance',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setAnnualHomeInsurance(data.estimatedCost.toFixed(2));
          setInsuranceExplanation(data.explanation);
        }
      } catch (err) {
        console.error('Insurance calculation failed:', err);
      } finally {
        setCalculatingInsurance(false);
      }
    };

    const debounce = setTimeout(calculateInsurance, 1000);
    return () => clearTimeout(debounce);
  }, [propertyAddress, propertyValue, propertyState, propertyZipCode, propertyCity, autoCalculateInsurance, type]);

  // Auto-calculate PMI
  useEffect(() => {
    if (!autoCalculatePMI || type !== "MORTGAGE") return;

    const p = parseFloat(principal);
    const pv = parseFloat(propertyValue);

    if (p > 0 && pv > 0) {
      const loanToValue = p / pv;
      if (loanToValue > 0.8) {
        // PMI required - typically 0.5-1% of loan amount annually
        const annualPMI = p * 0.005; // 0.5% annually
        setMonthlyPMI((annualPMI / 12).toFixed(2));
      } else {
        setMonthlyPMI("0");
      }
    }
  }, [principal, propertyValue, autoCalculatePMI, type]);

  // Calculate total monthly housing cost
  const calculateTotalHousingCost = () => {
    const payment = parseFloat(monthlyPayment) || 0;
    const tax = (parseFloat(annualPropertyTax) || 0) / 12;
    const insurance = (parseFloat(annualHomeInsurance) || 0) / 12;
    const hoa = parseFloat(monthlyHOAFees) || 0;
    const pmi = parseFloat(monthlyPMI) || 0;
    return payment + tax + insurance + hoa + pmi;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setGlobalError(null);

    const formData: LoanFormData = {
      name,
      type,
      principal: parseFloat(principal) || 0,
      currentBalance: parseFloat(currentBalance) || 0,
      // Convert from percentage (6) to decimal (0.06) for database
      interestRate: (parseFloat(interestRate) || 0) / 100,
      monthlyPayment: parseFloat(monthlyPayment) || undefined,
      startDate,
      termMonths: parseInt(termMonths) || 0,
      memberId: memberId || null,

      // Mortgage-specific fields
      propertyAddress: propertyAddress || undefined,
      propertyZipCode: propertyZipCode || undefined,
      propertyCity: propertyCity || undefined,
      propertyState: propertyState || undefined,
      propertyCounty: propertyCounty || undefined,
      propertyValue: parseFloat(propertyValue) || undefined,
      annualPropertyTax: parseFloat(annualPropertyTax) || undefined,
      annualHomeInsurance: parseFloat(annualHomeInsurance) || undefined,
      monthlyHOAFees: parseFloat(monthlyHOAFees) || undefined,
      monthlyPMI: parseFloat(monthlyPMI) || undefined,
      pmiRequired: (parseFloat(monthlyPMI) || 0) > 0,
      insuranceProvider: insuranceProvider || undefined,
      hoaName: hoaName || undefined,
    };

    const validation = loanFormSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);

    try {
      const url = isEdit && initialData?.id
        ? `/api/loans/${initialData.id}`
        : "/api/loans";

      const method = isEdit ? "PUT" : "POST";

      const body = isEdit
        ? validation.data
        : { ...validation.data, scenarioId };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save loan");
      }

      router.push("/loans");
      router.refresh();
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Failed to save loan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {globalError && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 text-sm">
          {globalError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name */}
        <div className="md:col-span-2">
          <label className="text-sm text-zinc-400">Loan Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Primary Mortgage, Car Loan"
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
          />
          {errors.name && <div className="text-xs text-red-400 mt-1">{errors.name}</div>}
        </div>

        {/* Type */}
        <div>
          <label className="text-sm text-zinc-400">Loan Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as LoanType)}
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
          >
            {LOAN_TYPES.map((lt) => (
              <option key={lt.value} value={lt.value}>
                {lt.label}
              </option>
            ))}
          </select>
          {errors.type && <div className="text-xs text-red-400 mt-1">{errors.type}</div>}
        </div>

        {/* Member */}
        <div>
          <label className="text-sm text-zinc-400">Household Member (optional)</label>
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
          >
            <option value="">No specific member</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Principal */}
        <div>
          <label className="text-sm text-zinc-400">Original Principal ($)</label>
          <input
            type="number"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            placeholder="250000"
            min="0"
            step="0.01"
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
          />
          {errors.principal && <div className="text-xs text-red-400 mt-1">{errors.principal}</div>}
        </div>

        {/* Current Balance */}
        <div>
          <label className="text-sm text-zinc-400">Current Balance ($)</label>
          <input
            type="number"
            value={currentBalance}
            onChange={(e) => setCurrentBalance(e.target.value)}
            placeholder="230000"
            min="0"
            step="0.01"
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
          />
          {errors.currentBalance && <div className="text-xs text-red-400 mt-1">{errors.currentBalance}</div>}
        </div>

        {/* Interest Rate */}
        <div>
          <label className="text-sm text-zinc-400">Annual Interest Rate (%)</label>
          <input
            type="number"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            placeholder="6.5"
            min="0"
            max="100"
            step="0.01"
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
          />
          {errors.interestRate && <div className="text-xs text-red-400 mt-1">{errors.interestRate}</div>}
        </div>

        {/* Term Months */}
        <div>
          <label className="text-sm text-zinc-400">Loan Term (months)</label>
          <input
            type="number"
            value={termMonths}
            onChange={(e) => setTermMonths(e.target.value)}
            placeholder="360"
            min="1"
            step="1"
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
          />
          <div className="text-xs text-zinc-500 mt-1">
            {termMonths && parseInt(termMonths) > 0
              ? `${Math.floor(parseInt(termMonths) / 12)} years, ${parseInt(termMonths) % 12} months`
              : "Common: 360 (30yr), 180 (15yr), 60 (5yr)"}
          </div>
          {errors.termMonths && <div className="text-xs text-red-400 mt-1">{errors.termMonths}</div>}
        </div>

        {/* Start Date */}
        <div>
          <label className="text-sm text-zinc-400">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
          />
          {errors.startDate && <div className="text-xs text-red-400 mt-1">{errors.startDate}</div>}
        </div>

        {/* Monthly Payment */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm text-zinc-400">Monthly Payment ($)</label>
            <label className="flex items-center gap-2 text-xs text-zinc-500">
              <input
                type="checkbox"
                checked={autoCalculate}
                onChange={(e) => setAutoCalculate(e.target.checked)}
                className="rounded border-zinc-700"
              />
              Auto-calculate
            </label>
          </div>
          <input
            type="number"
            value={monthlyPayment}
            onChange={(e) => {
              setMonthlyPayment(e.target.value);
              setAutoCalculate(false);
            }}
            placeholder="1580.17"
            min="0"
            step="0.01"
            disabled={autoCalculate}
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600 disabled:opacity-60 disabled:cursor-not-allowed"
          />
          {errors.monthlyPayment && <div className="text-xs text-red-400 mt-1">{errors.monthlyPayment}</div>}
        </div>
      </div>

      {/* Mortgage-Specific Sections - Only show for MORTGAGE type */}
      {type === "MORTGAGE" && (
        <>
          {/* Property Information Section */}
          <div className="md:col-span-2 mt-6 pt-6 border-t border-zinc-800">
            <h3 className="text-lg font-medium mb-4">Property Information</h3>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm text-zinc-400">Property Address</label>
            <input
              type="text"
              value={propertyAddress}
              onChange={(e) => setPropertyAddress(e.target.value)}
              placeholder="123 Main St, City, State 12345"
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400">City</label>
            <input
              type="text"
              value={propertyCity}
              onChange={(e) => setPropertyCity(e.target.value)}
              placeholder="San Francisco"
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400">State</label>
            <input
              type="text"
              value={propertyState}
              onChange={(e) => setPropertyState(e.target.value)}
              placeholder="CA"
              maxLength={2}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400">ZIP Code</label>
            <input
              type="text"
              value={propertyZipCode}
              onChange={(e) => setPropertyZipCode(e.target.value)}
              placeholder="94102"
              maxLength={10}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400">County (optional)</label>
            <input
              type="text"
              value={propertyCounty}
              onChange={(e) => setPropertyCounty(e.target.value)}
              placeholder="San Francisco"
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400">Property Value ($)</label>
            <input
              type="number"
              value={propertyValue}
              onChange={(e) => setPropertyValue(e.target.value)}
              placeholder="500000"
              min="0"
              step="1000"
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
            />
            {propertyValue && principal && (
              <div className="text-xs text-zinc-500 mt-1">
                Down payment: {(((parseFloat(propertyValue) - parseFloat(principal)) / parseFloat(propertyValue)) * 100).toFixed(1)}%
              </div>
            )}
          </div>

          {/* Property Taxes Section */}
          <div className="md:col-span-2 mt-6 pt-6 border-t border-zinc-800">
            <h3 className="text-lg font-medium mb-4">Property Taxes</h3>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-zinc-400">Annual Property Tax ($)</label>
              <label className="flex items-center gap-2 text-xs text-zinc-500">
                <input
                  type="checkbox"
                  checked={autoCalculatePropertyTax}
                  onChange={(e) => setAutoCalculatePropertyTax(e.target.checked)}
                  className="rounded border-zinc-700"
                />
                AI Calculate
              </label>
            </div>
            <input
              type="number"
              value={annualPropertyTax}
              onChange={(e) => {
                setAnnualPropertyTax(e.target.value);
                setAutoCalculatePropertyTax(false);
              }}
              placeholder="5000"
              min="0"
              step="100"
              disabled={autoCalculatePropertyTax && calculatingTax}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {calculatingTax && (
              <div className="text-xs text-zinc-500 mt-1">Calculating...</div>
            )}
            {taxExplanation && !calculatingTax && (
              <div className="text-xs text-zinc-500 mt-1">{taxExplanation}</div>
            )}
            {annualPropertyTax && (
              <div className="text-xs text-zinc-500 mt-1">
                Monthly: ${(parseFloat(annualPropertyTax) / 12).toFixed(2)}
              </div>
            )}
          </div>

          {/* Homeowners Insurance Section */}
          <div className="md:col-span-2 mt-6 pt-6 border-t border-zinc-800">
            <h3 className="text-lg font-medium mb-4">Homeowners Insurance</h3>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-zinc-400">Annual Premium ($)</label>
              <label className="flex items-center gap-2 text-xs text-zinc-500">
                <input
                  type="checkbox"
                  checked={autoCalculateInsurance}
                  onChange={(e) => setAutoCalculateInsurance(e.target.checked)}
                  className="rounded border-zinc-700"
                />
                AI Estimate
              </label>
            </div>
            <input
              type="number"
              value={annualHomeInsurance}
              onChange={(e) => {
                setAnnualHomeInsurance(e.target.value);
                setAutoCalculateInsurance(false);
              }}
              placeholder="1200"
              min="0"
              step="50"
              disabled={autoCalculateInsurance && calculatingInsurance}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {calculatingInsurance && (
              <div className="text-xs text-zinc-500 mt-1">Calculating...</div>
            )}
            {insuranceExplanation && !calculatingInsurance && (
              <div className="text-xs text-zinc-500 mt-1">{insuranceExplanation}</div>
            )}
            {annualHomeInsurance && (
              <div className="text-xs text-zinc-500 mt-1">
                Monthly: ${(parseFloat(annualHomeInsurance) / 12).toFixed(2)}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm text-zinc-400">Insurance Provider (optional)</label>
            <input
              type="text"
              value={insuranceProvider}
              onChange={(e) => setInsuranceProvider(e.target.value)}
              placeholder="State Farm, Allstate, etc."
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
            />
          </div>

          {/* HOA Fees Section */}
          <div className="md:col-span-2 mt-6 pt-6 border-t border-zinc-800">
            <h3 className="text-lg font-medium mb-4">HOA Fees</h3>
          </div>

          <div>
            <label className="text-sm text-zinc-400">Monthly HOA Fees ($)</label>
            <input
              type="number"
              value={monthlyHOAFees}
              onChange={(e) => setMonthlyHOAFees(e.target.value)}
              placeholder="0"
              min="0"
              step="10"
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400">HOA Name (optional)</label>
            <input
              type="text"
              value={hoaName}
              onChange={(e) => setHoaName(e.target.value)}
              placeholder="Community Association"
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
            />
          </div>

          {/* PMI Section */}
          <div className="md:col-span-2 mt-6 pt-6 border-t border-zinc-800">
            <h3 className="text-lg font-medium mb-4">PMI (Private Mortgage Insurance)</h3>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-zinc-400">Monthly PMI ($)</label>
              <label className="flex items-center gap-2 text-xs text-zinc-500">
                <input
                  type="checkbox"
                  checked={autoCalculatePMI}
                  onChange={(e) => setAutoCalculatePMI(e.target.checked)}
                  className="rounded border-zinc-700"
                />
                Auto-calculate (if down payment &lt; 20%)
              </label>
            </div>
            <input
              type="number"
              value={monthlyPMI}
              onChange={(e) => {
                setMonthlyPMI(e.target.value);
                setAutoCalculatePMI(false);
              }}
              placeholder="0"
              min="0"
              step="10"
              disabled={autoCalculatePMI}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {propertyValue && principal && (parseFloat(principal) / parseFloat(propertyValue) > 0.8) && (
              <div className="text-xs text-amber-400 mt-1">
                PMI required - down payment is less than 20%
              </div>
            )}
          </div>

          {/* Total Monthly Housing Cost */}
          <div className="md:col-span-2 mt-6 pt-6 border-t border-zinc-800">
            <h3 className="text-lg font-medium mb-4">Total Monthly Housing Cost</h3>
          </div>

          <div className="md:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Principal & Interest</span>
                <span>${parseFloat(monthlyPayment || "0").toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Property Tax</span>
                <span>${((parseFloat(annualPropertyTax || "0")) / 12).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Insurance</span>
                <span>${((parseFloat(annualHomeInsurance || "0")) / 12).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">HOA Fees</span>
                <span>${parseFloat(monthlyHOAFees || "0").toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">PMI</span>
                <span>${parseFloat(monthlyPMI || "0").toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-zinc-700 font-semibold text-base">
                <span>TOTAL</span>
                <span>${calculateTotalHousingCost().toFixed(2)}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-4">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2 bg-zinc-50 text-zinc-950 rounded-xl font-medium hover:bg-zinc-200 transition-colors disabled:opacity-60"
        >
          {submitting ? "Saving..." : isEdit ? "Update Loan" : "Create Loan"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 border border-zinc-700 rounded-xl font-medium hover:border-zinc-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
