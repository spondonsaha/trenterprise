import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { COMPANY_NAME } from "@/lib/constants";

const navy = "#1E3A8A";
const slate = "#64748B";
const ink = "#0F172A";
const border = "#E2E8F0";
const soft = "#F8FAFC";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    color: ink,
    paddingTop: 30,
    paddingHorizontal: 30,
    paddingBottom: 62,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: navy,
    paddingBottom: 10,
    marginBottom: 14,
  },
  brandName: { fontSize: 16, fontFamily: "Helvetica-Bold", color: navy, marginBottom: 2 },
  brandMeta: { fontSize: 7.5, color: slate, lineHeight: 1.4 },
  reportTitle: { fontSize: 16, fontFamily: "Helvetica-Bold", color: navy, textAlign: "right" },
  reportSub: { fontSize: 8, color: slate, textAlign: "right", marginTop: 3 },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  summaryCard: {
    borderWidth: 1,
    borderColor: border,
    backgroundColor: soft,
    borderRadius: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 110,
  },
  summaryLabel: { fontSize: 6.5, color: slate, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 },
  summaryValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: navy },
  table: { borderWidth: 1, borderColor: border, borderRadius: 2, overflow: "hidden" },
  head: { flexDirection: "row", backgroundColor: navy, paddingVertical: 5, paddingHorizontal: 5 },
  th: { color: "#FFFFFF", fontSize: 6.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.4 },
  row: { flexDirection: "row", paddingVertical: 4.5, paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: border },
  rowAlt: { backgroundColor: soft },
  cell: { fontSize: 7.5 },
  empty: { padding: 18, textAlign: "center", color: slate, fontSize: 9 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    borderTopWidth: 1,
    borderTopColor: border,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7, color: slate },
  footerBrand: { fontSize: 7, fontFamily: "Helvetica-Bold", color: navy },
});

export type ReportPdfData = {
  title: string;
  subtitle: string;
  generatedLabel: string;
  columns: { label: string; width: number; align?: "left" | "right" | "center" }[];
  rows: string[][];
  summary: { label: string; value: string }[];
  company: { address: string | null; phone: string | null; email: string | null };
};

export function ReportPdf({ data }: { data: ReportPdfData }) {
  const landscape = data.columns.length > 5;

  return (
    <Document title={`${COMPANY_NAME} ${data.title}`} author={COMPANY_NAME}>
      <Page size="A4" orientation={landscape ? "landscape" : "portrait"} style={styles.page} wrap>
        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>{COMPANY_NAME}</Text>
            <Text style={styles.brandMeta}>Printer consumables, ink, toner &amp; cartridges</Text>
            {data.company.address ? <Text style={styles.brandMeta}>{data.company.address}</Text> : null}
            <Text style={styles.brandMeta}>
              {[data.company.phone, data.company.email].filter(Boolean).join("  |  ")}
            </Text>
          </View>
          <View>
            <Text style={styles.reportTitle}>{data.title}</Text>
            <Text style={styles.reportSub}>{data.subtitle}</Text>
            <Text style={styles.reportSub}>Generated {data.generatedLabel}</Text>
          </View>
        </View>

        {data.summary.length > 0 ? (
          <View style={styles.summaryRow}>
            {data.summary.map((item) => (
              <View key={item.label} style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>{item.label}</Text>
                <Text style={styles.summaryValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.table}>
          <View style={styles.head} fixed>
            {data.columns.map((column) => (
              <Text
                key={column.label}
                style={[
                  styles.th,
                  {
                    width: `${column.width}%`,
                    textAlign: column.align ?? "left",
                  },
                ]}
              >
                {column.label}
              </Text>
            ))}
          </View>
          {data.rows.length === 0 ? (
            <Text style={styles.empty}>No records found for the selected period.</Text>
          ) : (
            data.rows.map((row, rowIndex) => (
              <View
                key={rowIndex}
                style={[styles.row, rowIndex % 2 === 1 ? styles.rowAlt : {}]}
                wrap={false}
              >
                {data.columns.map((column, columnIndex) => (
                  <Text
                    key={`${rowIndex}-${column.label}`}
                    style={[
                      styles.cell,
                      {
                        width: `${column.width}%`,
                        textAlign: column.align ?? "left",
                      },
                    ]}
                  >
                    {row[columnIndex] ?? ""}
                  </Text>
                ))}
              </View>
            ))
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerBrand}>{COMPANY_NAME}</Text>
          <Text style={styles.footerText}>{data.generatedLabel}</Text>
        </View>
      </Page>
    </Document>
  );
}
