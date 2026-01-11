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
  propertyZipCode?: string;
  propertyCity?: string;
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
    const { propertyAddress, propertyValue, propertyState, propertyZipCode, propertyCity, propertyCounty, calculationType } = body;

    // Build prompt based on calculation type
    const prompt = calculationType === 'propertyTax'
      ? buildPropertyTaxPrompt(propertyAddress, propertyValue, propertyState, propertyZipCode, propertyCity, propertyCounty)
      : buildInsurancePrompt(propertyAddress, propertyValue, propertyState, propertyZipCode, propertyCity);

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
  zipCode?: string,
  city?: string,
  county?: string
): string {
  return `You are a real estate tax estimation expert. Based on this property information:

- Address: ${address}
- Home Value: $${value.toLocaleString()}
- State: ${state}
${zipCode ? `- ZIP Code: ${zipCode}` : ''}
${city ? `- City: ${city}` : ''}
${county ? `- County: ${county}` : ''}

Estimate the annual property tax. Consider:
- Typical property tax rates for this location (state, county, and city if applicable)
- Residential property assessment ratios
- Common homestead exemptions
- Recent tax rate trends
- Use the ZIP code to get more precise local rates if provided

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
  "explanation": "Based on typical 1% property tax rate in this area with local adjustments",
  "confidence": "medium"
}`;
}

function buildInsurancePrompt(
  address: string,
  value: number,
  state: string,
  zipCode?: string,
  city?: string
): string {
  return `You are a homeowners insurance estimation expert. Based on this property:

- Address: ${address}
- Home Value: $${value.toLocaleString()}
- State: ${state}
${zipCode ? `- ZIP Code: ${zipCode}` : ''}
${city ? `- City: ${city}` : ''}

Estimate the annual homeowners insurance premium. Consider:
- Typical insurance rates for this state
- Home replacement cost vs. market value
- Regional risk factors (weather, crime, etc.)
- Average coverage levels
- Use ZIP code for more precise local risk assessment if provided

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
  "explanation": "Based on typical 0.24% of home value for standard coverage in this region",
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
