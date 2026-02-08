import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { colors, fontSize } from "@/lib/pdf/styles";

interface PdfReportProps {
  dashboard: {
    totalIncome: number;
    totalExpenses: number;
    netSavings: number;
    totalAssets: number;
    totalDebt: number;
    netWorth: number;
  };
  healthScore: {
    overall: number;
    components: Array<{ name: string; score: number; description: string }>;
    insights: Array<{ type: string; title: string; description: string }>;
  };
  goals: Array<{
    name: string;
    type: string;
    targetAmount: number;
    targetDate: string | null;
    priority: number;
  }>;
  projection: Array<{ year: number; netWorth: number }>;
  scenarioName: string;
  generatedDate: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.headerBg,
    padding: 20,
    marginBottom: 20,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: fontSize["2xl"],
    color: colors.headerText,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 10,
    marginTop: 20,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 4,
    padding: 12,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  value: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: "bold",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.headerBg,
    padding: 6,
    borderRadius: 2,
  },
  tableHeaderText: {
    fontSize: fontSize.xs,
    color: colors.headerText,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    padding: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  tableCell: {
    fontSize: fontSize.xs,
    color: colors.text,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  scoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreLarge: {
    fontSize: fontSize["3xl"],
    fontWeight: "bold",
  },
});

export function PdfReportDocument(props: PdfReportProps) {
  const {
    dashboard,
    healthScore,
    goals,
    projection,
    scenarioName,
    generatedDate,
  } = props;

  const formatCurrency = (n: number) => {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
  };

  const scoreColor =
    healthScore.overall >= 81
      ? colors.emerald
      : healthScore.overall >= 61
        ? colors.blue
        : healthScore.overall >= 41
          ? colors.amber
          : colors.red;

  const getComponentColor = (score: number) =>
    score >= 80
      ? colors.emerald
      : score >= 60
        ? colors.blue
        : score >= 40
          ? colors.amber
          : colors.red;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>FinAtlas Financial Report</Text>
          <Text style={styles.headerSubtitle}>
            Scenario: {scenarioName} | Generated: {generatedDate}
          </Text>
        </View>

        {/* Health Score */}
        <Text style={styles.sectionTitle}>Financial Health Score</Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <View
            style={[styles.scoreCircle, { backgroundColor: scoreColor }]}
          >
            <Text style={[styles.scoreLarge, { color: "#ffffff" }]}>
              {healthScore.overall}
            </Text>
          </View>
          <Text
            style={{
              marginLeft: 12,
              fontSize: fontSize.sm,
              color: colors.textMuted,
            }}
          >
            out of 100
          </Text>
        </View>

        {/* Component scores */}
        {healthScore.components.map((comp, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.label}>{comp.name}</Text>
            <Text
              style={[styles.value, { color: getComponentColor(comp.score) }]}
            >
              {comp.score}/100
            </Text>
          </View>
        ))}

        {/* Key Metrics */}
        <Text style={styles.sectionTitle}>Key Financial Metrics</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {[
            { label: "Net Worth", value: dashboard.netWorth },
            { label: "Total Assets", value: dashboard.totalAssets },
            { label: "Total Debt", value: dashboard.totalDebt },
            { label: "Annual Income", value: dashboard.totalIncome },
            { label: "Annual Expenses", value: dashboard.totalExpenses },
            { label: "Net Savings", value: dashboard.netSavings },
          ].map((metric, i) => (
            <View key={i} style={[styles.card, { width: "48%" }]}>
              <Text style={styles.label}>{metric.label}</Text>
              <Text style={styles.value}>{formatCurrency(metric.value)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>Generated by FinAtlas</Text>
      </Page>

      {/* Page 2: Goals + Projections */}
      <Page size="A4" style={styles.page}>
        {/* Goals Table */}
        <Text style={styles.sectionTitle}>Financial Goals</Text>
        {goals.length > 0 ? (
          <>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { width: "30%" }]}>
                Goal
              </Text>
              <Text style={[styles.tableHeaderText, { width: "20%" }]}>
                Type
              </Text>
              <Text
                style={[
                  styles.tableHeaderText,
                  { width: "25%", textAlign: "right" },
                ]}
              >
                Target
              </Text>
              <Text
                style={[
                  styles.tableHeaderText,
                  { width: "25%", textAlign: "right" },
                ]}
              >
                Date
              </Text>
            </View>
            {goals.map((goal, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: "30%" }]}>
                  {goal.name}
                </Text>
                <Text style={[styles.tableCell, { width: "20%" }]}>
                  {goal.type.replace(/_/g, " ")}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    { width: "25%", textAlign: "right" },
                  ]}
                >
                  {formatCurrency(goal.targetAmount)}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    { width: "25%", textAlign: "right" },
                  ]}
                >
                  {goal.targetDate
                    ? new Date(goal.targetDate).toLocaleDateString()
                    : "\u2014"}
                </Text>
              </View>
            ))}
          </>
        ) : (
          <Text style={styles.label}>No goals set</Text>
        )}

        {/* Projection Table */}
        <Text style={styles.sectionTitle}>Net Worth Projection</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { width: "50%" }]}>Year</Text>
          <Text
            style={[
              styles.tableHeaderText,
              { width: "50%", textAlign: "right" },
            ]}
          >
            Projected Net Worth
          </Text>
        </View>
        {projection.map((row, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: "50%" }]}>
              {row.year}
            </Text>
            <Text
              style={[
                styles.tableCell,
                { width: "50%", textAlign: "right" },
              ]}
            >
              {formatCurrency(row.netWorth)}
            </Text>
          </View>
        ))}

        {/* Insights */}
        {healthScore.insights.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Key Insights</Text>
            {healthScore.insights.map((insight, i) => (
              <View
                key={i}
                style={[
                  styles.card,
                  {
                    borderLeftWidth: 3,
                    borderLeftColor:
                      insight.type === "positive"
                        ? colors.emerald
                        : insight.type === "warning"
                          ? colors.amber
                          : colors.blue,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.label,
                    { fontWeight: "bold", color: colors.text },
                  ]}
                >
                  {insight.title}
                </Text>
                <Text style={[styles.label, { marginTop: 2 }]}>
                  {insight.description}
                </Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.footer}>Generated by FinAtlas</Text>
      </Page>
    </Document>
  );
}
