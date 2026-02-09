/**
 * Test script for insights generation
 * Run with: npx tsx scripts/test-insights.ts
 */

import { generateInsights } from "../lib/insights/insightEngine";

// Mock data for testing
const mockScenarioId = "test-scenario-123";
const mockUserId = "test-user-456";

async function testInsights() {
  console.log("Testing Insights Generation...\n");

  try {
    const insights = await generateInsights(mockScenarioId, mockUserId);

    console.log(`Generated ${insights.length} insights:\n`);

    insights.forEach((insight, idx) => {
      console.log(`${idx + 1}. [${insight.severity}] ${insight.title}`);
      console.log(`   Type: ${insight.type}`);
      console.log(`   Message: ${insight.message}`);
      if (insight.data) {
        console.log(`   Data: ${JSON.stringify(insight.data)}`);
      }
      console.log();
    });

    console.log("✓ Insights generation completed successfully");
  } catch (error) {
    console.error("✗ Error generating insights:", error);
    process.exit(1);
  }
}

testInsights();
