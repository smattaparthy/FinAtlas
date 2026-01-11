# Mortgage-Specific Features Implementation Plan

**Created**: 2026-01-11
**Status**: Planning Complete - Ready for Implementation
**Priority**: High
**Estimated Effort**: 3-5 days

---

## Executive Summary

Enhance the loan management system with comprehensive mortgage-specific features including AI-powered property tax estimation, homeowners insurance calculation, PMI management, and total monthly housing cost visualization.

### Key Features
1. **Property Taxes Section** - AI-calculated based on property information
2. **Homeowners Insurance** - AI-estimated based on home value and location
3. **HOA Fees** - Manual entry for homeowners association costs
4. **PMI Calculator** - Auto-calculated when down payment < 20%
5. **Total Monthly Housing Cost** - Comprehensive PITI+HOA+PMI display

---

## 1. Database Schema Changes

### Prisma Schema Updates

**File**: `apps/web/prisma/schema.prisma`

```prisma
model Loan {
  id              String   @id @default(cuid())
  name            String
  type            String   // MORTGAGE, AUTO, STUDENT, PERSONAL, HELOC, OTHER
  principal       Float
  currentBalance  Float
  interestRate    Float    // Stored as decimal (0.06 = 6%)
  monthlyPayment  Float?
  startDate       DateTime
  termMonths      Int
  memberId        String?
  scenarioId      String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Mortgage-specific fields (nullable for other loan types)
  propertyAddress       String?
  propertyValue         Float?
  propertyState         String?
  propertyCounty        String?
  annualPropertyTax     Float?
  annualHomeInsurance   Float?
  monthlyHOAFees        Float?
  monthlyPMI            Float?
  pmiRequired           Boolean   @default(false)
  insuranceProvider     String?
  hoaName               String?

  member    Member?   @relation(fields: [memberId], references: [id], onDelete: SetNull)
  scenario  Scenario  @relation(fields: [scenarioId], references: [id], onDelete: Cascade)

  @@index([scenarioId])
  @@index([memberId])
}
```

### Migration Command

```bash
npx prisma migrate dev --name add_mortgage_fields
```

### TypeScript Type Updates

**File**: `apps/web/components/forms/LoanForm.tsx`

```typescript
const loanFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: LoanTypeEnum,
  principal: z.number().positive("Principal must be positive"),
  currentBalance: z.number().min(0, "Current balance cannot be negative"),
  interestRate: z.number().min(0).max(1, "Interest rate cannot exceed 100%"),
  monthlyPayment: z.number().min(0).optional(),
  startDate: z.string().min(1, "Start date is required"),
  termMonths: z.number().int().positive("Term must be positive"),
  memberId: z.string().optional().nullable(),

  // Mortgage-specific fields
  propertyAddress: z.string().optional(),
  propertyValue: z.number().positive().optional(),
  propertyState: z.string().optional(),
  propertyCounty: z.string().optional(),
  annualPropertyTax: z.number().min(0).optional(),
  annualHomeInsurance: z.number().min(0).optional(),
  monthlyHOAFees: z.number().min(0).optional(),
  monthlyPMI: z.number().min(0).optional(),
  pmiRequired: z.boolean().optional(),
  insuranceProvider: z.string().optional(),
  hoaName: z.string().optional(),
});
```

---

## 2. AI Calculation API Endpoint

### New API Route

**File**: `apps/web/app/api/loans/calculate-mortgage-costs/route.ts`

```typescript
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type CalculationType = 'propertyTax' | 'insurance';

interface CalculationRequest {
  propertyAddress: string;
  propertyValue: number;
  propertyState: string;
  propertyCounty?: string;
  calculationType: CalculationType;
}

interface CalculationResponse {
  estimatedCost: number;
  rate?: number;
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
}

export async function POST(req: NextRequest) {
  try {
    const body: CalculationRequest = await req.json();
    const { propertyAddress, propertyValue, propertyState, propertyCounty, calculationType } = body;

    // Build prompt based on calculation type
    const prompt = calculationType === 'propertyTax'
      ? buildPropertyTaxPrompt(propertyAddress, propertyValue, propertyState, propertyCounty)
      : buildInsurancePrompt(propertyAddress, propertyValue, propertyState);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: prompt,
      }],
    });

    const textContent = message.content[0].type === 'text' ? message.content[0].text : '';
    const result = parseAIEstimate(textContent, calculationType);

    return Response.json(result);
  } catch (error) {
    console.error('Mortgage cost calculation error:', error);
    return Response.json(
      { error: 'Failed to calculate mortgage costs' },
      { status: 500 }
    );
  }
}

function buildPropertyTaxPrompt(
  address: string,
  value: number,
  state: string,
  county?: string
): string {
  return `You are a real estate tax estimation expert. Based on this property information:

- Address: ${address}
- Home Value: $${value.toLocaleString()}
- State: ${state}
${county ? `- County: ${county}` : ''}

Estimate the annual property tax. Consider:
- Typical property tax rates for this location (state and county)
- Residential property assessment ratios
- Common homestead exemptions
- Recent tax rate trends

Return ONLY a valid JSON object with this exact structure:
{
  "annualTax": <number>,
  "rate": <percentage as decimal, e.g., 0.02 for 2%>,
  "explanation": "<brief explanation of calculation>",
  "confidence": "<high|medium|low>"
}

Example format:
{
  "annualTax": 5000,
  "rate": 0.01,
  "explanation": "Based on typical 1% property tax rate in this area",
  "confidence": "medium"
}`;
}

function buildInsurancePrompt(
  address: string,
  value: number,
  state: string
): string {
  return `You are a homeowners insurance estimation expert. Based on this property:

- Address: ${address}
- Home Value: $${value.toLocaleString()}
- State: ${state}

Estimate the annual homeowners insurance premium. Consider:
- Typical insurance rates for this state
- Home replacement cost vs. market value
- Regional risk factors (weather, crime, etc.)
- Average coverage levels

Return ONLY a valid JSON object with this exact structure:
{
  "annualCost": <number>,
  "rate": <percentage as decimal, e.g., 0.003 for 0.3%>,
  "explanation": "<brief explanation of calculation>",
  "confidence": "<high|medium|low>"
}

Example format:
{
  "annualCost": 1200,
  "rate": 0.0024,
  "explanation": "Based on typical 0.24% of home value for standard coverage",
  "confidence": "medium"
}`;
}

function parseAIEstimate(text: string, type: CalculationType): CalculationResponse {
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
    const parsed = JSON.parse(jsonText);

    if (type === 'propertyTax') {
      return {
        estimatedCost: parsed.annualTax,
        rate: parsed.rate,
        explanation: parsed.explanation,
        confidence: parsed.confidence || 'medium',
      };
    } else {
      return {
        estimatedCost: parsed.annualCost,
        rate: parsed.rate,
        explanation: parsed.explanation,
        confidence: parsed.confidence || 'medium',
      };
    }
  } catch (error) {
    console.error('Failed to parse AI estimate:', error);
    throw new Error('Invalid AI response format');
  }
}
```

---

## 3. Form Component Updates

### Enhanced LoanForm Component

**File**: `apps/web/components/forms/LoanForm.tsx`

Key additions to existing component:

```typescript
// State for mortgage-specific fields
const [propertyAddress, setPropertyAddress] = useState(initialData?.propertyAddress || "");
const [propertyValue, setPropertyValue] = useState(initialData?.propertyValue?.toString() || "");
const [propertyState, setPropertyState] = useState(initialData?.propertyState || "");
const [propertyCounty, setPropertyCounty] = useState(initialData?.propertyCounty || "");
const [annualPropertyTax, setAnnualPropertyTax] = useState(initialData?.annualPropertyTax?.toString() || "");
const [annualHomeInsurance, setAnnualHomeInsurance] = useState(initialData?.annualHomeInsurance?.toString() || "");
const [monthlyHOAFees, setMonthlyHOAFees] = useState(initialData?.monthlyHOAFees?.toString() || "");
const [monthlyPMI, setMonthlyPMI] = useState(initialData?.monthlyPMI?.toString() || "");
const [insuranceProvider, setInsuranceProvider] = useState(initialData?.insuranceProvider || "");
const [hoaName, setHoaName] = useState(initialData?.hoaName || "");

// Auto-calculate states
const [autoCalculatePropertyTax, setAutoCalculatePropertyTax] = useState(!initialData?.annualPropertyTax);
const [autoCalculateInsurance, setAutoCalculateInsurance] = useState(!initialData?.annualHomeInsurance);
const [autoCalculatePMI, setAutoCalculatePMI] = useState(true);

// Loading states
const [calculatingTax, setCalculatingTax] = useState(false);
const [calculatingInsurance, setCalculatingInsurance] = useState(false);
const [taxExplanation, setTaxExplanation] = useState("");
const [insuranceExplanation, setInsuranceExplanation] = useState("");

// Auto-calculate property tax
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
}, [propertyAddress, propertyValue, propertyState, propertyCounty, autoCalculatePropertyTax, type]);

// Auto-calculate homeowners insurance
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
}, [propertyAddress, propertyValue, propertyState, autoCalculateInsurance, type]);

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
```

### JSX Addition (after existing form fields)

```tsx
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

    <div>
      <label className="text-sm text-zinc-400">State</label>
      <input
        type="text"
        value={propertyState}
        onChange={(e) => setPropertyState(e.target.value)}
        placeholder="CA"
        className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
      />
    </div>

    <div>
      <label className="text-sm text-zinc-400">County (optional)</label>
      <input
        type="text"
        value={propertyCounty}
        onChange={(e) => setPropertyCounty(e.target.value)}
        placeholder="Los Angeles"
        className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-600"
      />
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
```

---

## 4. Loan Detail Page Updates

**File**: `apps/web/app/(app)/loans/[id]/page.tsx`

Add mortgage-specific information display:

```tsx
{/* After existing loan details, add mortgage section if type is MORTGAGE */}
{loan.type === "MORTGAGE" && loan.propertyAddress && (
  <>
    {/* Property Information */}
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
      <h2 className="font-semibold mb-4">Property Information</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="col-span-2">
          <div className="text-xs text-zinc-400">Property Address</div>
          <div className="font-medium">{loan.propertyAddress}</div>
        </div>
        {loan.propertyValue && (
          <div>
            <div className="text-xs text-zinc-400">Property Value</div>
            <div className="font-medium">{formatCurrency(loan.propertyValue)}</div>
          </div>
        )}
        {loan.propertyState && (
          <div>
            <div className="text-xs text-zinc-400">Location</div>
            <div className="font-medium">
              {loan.propertyCounty ? `${loan.propertyCounty}, ` : ""}{loan.propertyState}
            </div>
          </div>
        )}
        {loan.propertyValue && loan.principal && (
          <div>
            <div className="text-xs text-zinc-400">Down Payment</div>
            <div className="font-medium">
              {formatCurrency(loan.propertyValue - loan.principal)}
              <span className="text-xs text-zinc-500 ml-1">
                ({(((loan.propertyValue - loan.principal) / loan.propertyValue) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Monthly Housing Costs Breakdown */}
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
      <h2 className="font-semibold mb-4">Monthly Housing Costs</h2>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-zinc-400">Principal & Interest</span>
          <span className="font-medium">{formatCurrency(loan.monthlyPayment)}</span>
        </div>
        {loan.annualPropertyTax && (
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Property Tax</span>
            <span className="font-medium">{formatCurrency(loan.annualPropertyTax / 12)}</span>
          </div>
        )}
        {loan.annualHomeInsurance && (
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Homeowners Insurance</span>
            <span className="font-medium">{formatCurrency(loan.annualHomeInsurance / 12)}</span>
          </div>
        )}
        {loan.monthlyHOAFees && loan.monthlyHOAFees > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">HOA Fees</span>
            <span className="font-medium">{formatCurrency(loan.monthlyHOAFees)}</span>
          </div>
        )}
        {loan.monthlyPMI && loan.monthlyPMI > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">PMI</span>
            <span className="font-medium">{formatCurrency(loan.monthlyPMI)}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-3 border-t border-zinc-800">
          <span className="font-semibold text-lg">Total Monthly Cost</span>
          <span className="font-semibold text-lg">
            {formatCurrency(
              loan.monthlyPayment +
              (loan.annualPropertyTax || 0) / 12 +
              (loan.annualHomeInsurance || 0) / 12 +
              (loan.monthlyHOAFees || 0) +
              (loan.monthlyPMI || 0)
            )}
          </span>
        </div>
      </div>
    </div>
  </>
)}
```

Update TypeScript type to include new fields:

```typescript
type Loan = {
  id: string;
  name: string;
  type: string;
  principal: number;
  currentBalance: number;
  interestRate: number;
  monthlyPayment: number;
  startDate: string;
  termMonths: number;
  member: { id: string; name: string } | null;

  // Mortgage-specific fields
  propertyAddress?: string;
  propertyValue?: number;
  propertyState?: string;
  propertyCounty?: string;
  annualPropertyTax?: number;
  annualHomeInsurance?: number;
  monthlyHOAFees?: number;
  monthlyPMI?: number;
  insuranceProvider?: string;
  hoaName?: string;
};
```

---

## 5. CSV Import Support

**File**: `apps/web/lib/csv-parser.ts`

Add mortgage field patterns:

```typescript
export const LOAN_FIELD_PATTERNS = [
  { field: "name", patterns: ["name", "loan name", "description"] },
  { field: "type", patterns: ["type", "loan type", "category"] },
  { field: "principal", patterns: ["principal", "loan amount", "original amount", "amount"] },
  { field: "interestRate", patterns: ["interest", "rate", "apr", "interest rate"] },
  { field: "termMonths", patterns: ["term", "months", "duration", "length"] },
  { field: "monthlyPayment", patterns: ["payment", "monthly payment", "monthly"] },
  { field: "startDate", patterns: ["start", "date", "start date", "originated"] },

  // Mortgage-specific patterns
  { field: "propertyAddress", patterns: ["address", "property address", "location"] },
  { field: "propertyValue", patterns: ["property value", "home value", "value"] },
  { field: "propertyState", patterns: ["state", "property state"] },
  { field: "propertyCounty", patterns: ["county", "property county"] },
  { field: "annualPropertyTax", patterns: ["property tax", "taxes", "annual tax"] },
  { field: "annualHomeInsurance", patterns: ["insurance", "home insurance", "homeowners insurance"] },
  { field: "monthlyHOAFees", patterns: ["hoa", "hoa fees", "association fees"] },
  { field: "monthlyPMI", patterns: ["pmi", "mortgage insurance"] },
];
```

**File**: `apps/web/components/import/CSVImportWizard.tsx`

Update import configuration to include mortgage fields:

```typescript
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
    { field: "propertyValue", label: "Property Value", required: false, parser: parseAmount },
    { field: "propertyState", label: "State", required: false },
    { field: "propertyCounty", label: "County", required: false },
    { field: "annualPropertyTax", label: "Annual Property Tax", required: false, parser: parseAmount },
    { field: "annualHomeInsurance", label: "Annual Insurance", required: false, parser: parseAmount },
    { field: "monthlyHOAFees", label: "Monthly HOA", required: false, parser: parseAmount },
    { field: "monthlyPMI", label: "Monthly PMI", required: false, parser: parseAmount },
  ],
},
```

---

## 6. API Route Updates

**File**: `apps/web/app/api/loans/route.ts`

Ensure POST handler accepts new mortgage fields:

```typescript
// The handler should already work with Prisma schema auto-mapping
// Just ensure the request body validation allows optional fields

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      scenarioId,
      name,
      type,
      principal,
      currentBalance,
      interestRate,
      monthlyPayment,
      startDate,
      termMonths,
      memberId,
      // Mortgage-specific fields
      propertyAddress,
      propertyValue,
      propertyState,
      propertyCounty,
      annualPropertyTax,
      annualHomeInsurance,
      monthlyHOAFees,
      monthlyPMI,
      insuranceProvider,
      hoaName,
    } = body;

    // Create loan with all fields
    const loan = await prisma.loan.create({
      data: {
        scenarioId,
        name,
        type: type || "OTHER",
        principal,
        currentBalance: currentBalance ?? principal,
        interestRate,
        monthlyPayment,
        startDate: new Date(startDate),
        termMonths,
        memberId: memberId || null,
        // Mortgage fields
        propertyAddress,
        propertyValue,
        propertyState,
        propertyCounty,
        annualPropertyTax,
        annualHomeInsurance,
        monthlyHOAFees,
        monthlyPMI,
        pmiRequired: monthlyPMI ? monthlyPMI > 0 : false,
        insuranceProvider,
        hoaName,
      },
    });

    return Response.json({ loan }, { status: 201 });
  } catch (error) {
    console.error("Loan creation error:", error);
    return Response.json({ error: "Failed to create loan" }, { status: 500 });
  }
}
```

**File**: `apps/web/app/api/loans/[id]/route.ts`

Update PUT handler similarly to accept mortgage fields.

---

## 7. Environment Variables

Add to `.env` file:

```bash
# Anthropic API for AI mortgage calculations
ANTHROPIC_API_KEY=your_api_key_here
```

---

## 8. Testing Strategy

### Unit Tests
- [ ] Test property tax calculation API endpoint
- [ ] Test insurance estimation API endpoint
- [ ] Test PMI auto-calculation logic
- [ ] Test total housing cost calculation

### Integration Tests
- [ ] Test full mortgage loan creation flow
- [ ] Test mortgage loan editing flow
- [ ] Test CSV import with mortgage fields
- [ ] Test AI calculation error handling

### Manual Testing Scenarios

**Scenario 1: Create New Mortgage**
1. Navigate to Loans → Add Loan
2. Select type: MORTGAGE
3. Enter basic loan info (name, principal, rate, term)
4. Enter property info (address, value, state)
5. Enable AI Calculate for property tax
6. Verify auto-calculation triggers
7. Check total monthly housing cost accuracy
8. Save and verify detail page display

**Scenario 2: Edit Existing Mortgage**
1. Open existing mortgage loan
2. Click Edit
3. Modify property value
4. Verify PMI recalculates
5. Update insurance provider
6. Save and verify changes persist

**Scenario 3: CSV Import**
1. Create CSV with mortgage data
2. Import via CSV wizard
3. Verify all mortgage fields map correctly
4. Check AI calculations trigger for imported data

---

## 9. Implementation Phases

### Phase 1: Foundation (Day 1)
- [ ] Update Prisma schema
- [ ] Run migration
- [ ] Update TypeScript types
- [ ] Update form validation schema
- [ ] Test database changes

### Phase 2: AI API (Day 1-2)
- [ ] Create mortgage cost calculation API endpoint
- [ ] Implement property tax prompt
- [ ] Implement insurance prompt
- [ ] Add response parsing
- [ ] Test API with mock data
- [ ] Add error handling

### Phase 3: Form Updates (Day 2-3)
- [ ] Add state variables for all mortgage fields
- [ ] Implement property tax auto-calculate
- [ ] Implement insurance auto-calculate
- [ ] Implement PMI auto-calculate
- [ ] Add total housing cost display
- [ ] Add conditional rendering for MORTGAGE type
- [ ] Test form interactions

### Phase 4: Display Pages (Day 3-4)
- [ ] Update loan detail page
- [ ] Add mortgage information section
- [ ] Add housing costs breakdown
- [ ] Update loan list page if needed
- [ ] Test all display scenarios

### Phase 5: CSV Import (Day 4)
- [ ] Update field patterns
- [ ] Update import configuration
- [ ] Test CSV import flow
- [ ] Handle edge cases

### Phase 6: Testing & Polish (Day 5)
- [ ] Manual testing all scenarios
- [ ] Fix bugs
- [ ] UI/UX refinements
- [ ] Documentation updates
- [ ] Code review

---

## 10. Known Limitations & Future Enhancements

### Current Limitations
- AI estimates may not be accurate for all locations
- No real-time property tax lookup API integration
- Insurance estimates are general, not quote-level accurate
- PMI calculation uses simplified formula (actual varies by lender)

### Future Enhancements
- **Real API Integration**: Zillow, Redfin for property data
- **Insurance Quotes**: Integration with insurance providers
- **Escrow Account**: Track escrow balance and payments
- **Refinance Calculator**: Compare current vs new loan terms
- **Assessment History**: Track property value changes over time
- **Multi-Property**: Support multiple properties per household
- **Tax Deduction**: Calculate mortgage interest tax deduction
- **Prepayment Analysis**: Impact of extra payments on total cost

---

## 11. Success Criteria

✅ **Feature Complete**:
- [ ] All mortgage-specific fields available in form
- [ ] AI calculations working for property tax and insurance
- [ ] PMI auto-calculation functional
- [ ] Total housing cost displays correctly
- [ ] All data persists to database
- [ ] Detail page shows mortgage information

✅ **Quality Standards**:
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] Responsive on mobile/tablet/desktop
- [ ] Accessible (keyboard navigation, labels)
- [ ] Loading states for AI calculations
- [ ] Error handling for failed API calls

✅ **User Experience**:
- [ ] Intuitive form layout
- [ ] Clear labels and help text
- [ ] Auto-calculate checkboxes work as expected
- [ ] Manual override always available
- [ ] Calculations update in real-time
- [ ] Total cost is prominent and accurate

---

## 12. Dependencies

### Required Packages
```json
{
  "@anthropic-ai/sdk": "^0.30.0",  // Already installed
  "@prisma/client": "^5.x",        // Already installed
  "zod": "^3.x"                    // Already installed
}
```

### Environment Requirements
- Node.js 18+
- PostgreSQL/SQLite database
- Anthropic API key

---

## 13. Rollback Plan

If issues arise during implementation:

1. **Database Rollback**:
   ```bash
   npx prisma migrate reset
   npx prisma migrate deploy --to <previous_migration>
   ```

2. **Feature Flag**: Consider adding feature flag to disable mortgage features:
   ```typescript
   const ENABLE_MORTGAGE_FEATURES = process.env.ENABLE_MORTGAGE_FEATURES === 'true';
   ```

3. **Git Revert**: Maintain clean commits per phase for easy rollback

---

## 14. Documentation Updates

After implementation:
- [ ] Update README with mortgage features
- [ ] Add API documentation for mortgage cost endpoint
- [ ] Create user guide for mortgage loan creation
- [ ] Document AI estimation accuracy and limitations
- [ ] Add CSV import template with mortgage fields

---

## Contact & Questions

For implementation questions or clarifications, refer to:
- Prisma schema: `/apps/web/prisma/schema.prisma`
- Existing loan form: `/apps/web/components/forms/LoanForm.tsx`
- Anthropic API docs: https://docs.anthropic.com/
- This plan document: `/claudedocs/mortgage-features-plan.md`

---

**Plan Status**: ✅ Complete - Ready for Implementation
**Last Updated**: 2026-01-11
**Estimated Completion**: 3-5 days
