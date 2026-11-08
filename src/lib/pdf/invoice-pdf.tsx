import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { COMPANY_NAME } from "@/lib/constants";

const navy = "#1E3A8A";
const teal = "#0D9488";
const slate = "#64748B";
const ink = "#0F172A";
const border = "#E2E8F0";
const soft = "#F8FAFC";
const danger = "#DC2626";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: ink,
    paddingTop: 36,
    paddingHorizontal: 40,
    paddingBottom: 86,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: navy,
    paddingBottom: 14,
    marginBottom: 18,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, maxWidth: "66%" },
  logo: { width: 58, height: 40, objectFit: "contain", marginRight: 10 },
  brandName: { fontSize: 18, fontFamily: "Helvetica-Bold", color: navy, marginBottom: 3 },
  brandMeta: { fontSize: 8, color: slate, lineHeight: 1.4 },
  docTitle: { fontSize: 22, fontFamily: "Helvetica-Bold", color: navy, textAlign: "right" },
  docNumber: { fontSize: 10, color: slate, textAlign: "right", marginTop: 4 },
  statusRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 6 },
  statusPill: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 8,
    color: navy,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  cancelledPill: { backgroundColor: "#FEF2F2", borderColor: "#FECACA", color: danger },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18, gap: 24 },
  metaBlock: { width: "52%" },
  metaRight: { width: "42%", alignItems: "flex-end" },
  label: { fontSize: 7.5, color: slate, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  customerName: { fontSize: 12.5, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  metaText: { fontSize: 9, color: slate, lineHeight: 1.5 },
  metaLine: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 3, width: "100%" },
  metaKey: { width: 75, fontSize: 8.5, color: slate, textAlign: "right", paddingRight: 10 },
  metaValue: { width: 110, fontSize: 8.5, fontFamily: "Helvetica-Bold", textAlign: "right" },
  table: { borderWidth: 1, borderColor: border, borderRadius: 3, overflow: "hidden", marginBottom: 14 },
  tableHead: { flexDirection: "row", backgroundColor: navy, paddingVertical: 7, paddingHorizontal: 8 },
  th: { color: "#FFFFFF", fontSize: 7.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: border },
  tableRowAlt: { backgroundColor: soft },
  colIndex: { width: "6%" },
  colDesc: { width: "44%" },
  colUnit: { width: "10%", textAlign: "center" },
  colQty: { width: "10%", textAlign: "right" },
  colRate: { width: "15%", textAlign: "right" },
  colAmount: { width: "15%", textAlign: "right" },
  cell: { fontSize: 9 },
  cellMuted: { fontSize: 9, color: slate },
  totalsWrap: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 16 },
  totalsBox: { width: "52%" },
  totalLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3.5 },
  totalLabel: { fontSize: 9, color: slate },
  totalValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  grandLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 10,
    borderTopWidth: 2,
    borderTopColor: navy,
    backgroundColor: "#EFF6FF",
  },
  grandLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: navy, textTransform: "uppercase" },
  grandValue: { fontSize: 14, fontFamily: "Helvetica-Bold", color: navy },
  quickBox: {
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    borderRadius: 4,
    padding: 16,
    marginBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quickLabel: { fontSize: 9, color: navy, textTransform: "uppercase", letterSpacing: 0.8 },
  quickValue: { fontSize: 20, fontFamily: "Helvetica-Bold", color: navy },
  notesRow: { flexDirection: "row", gap: 24, marginBottom: 8 },
  notesBlock: { width: "50%" },
  notesTitle: { fontSize: 7.5, color: slate, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
  notesText: { fontSize: 8.5, color: "#334155", lineHeight: 1.5 },
  thankYou: { textAlign: "center", fontSize: 9.5, color: teal, fontFamily: "Helvetica-Bold", marginTop: 18 },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: border,
    paddingTop: 8,
  },
  footerTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  footerBrand: { fontSize: 8, fontFamily: "Helvetica-Bold", color: navy },
  footerMeta: { fontSize: 7.5, color: slate },
  footerNote: { fontSize: 7, color: slate, textAlign: "center", marginTop: 2 },
});

export type InvoicePdfData = {
  invoiceNumber: string;
  dateLabel: string;
  dueDateLabel: string | null;
  statusLabel: string;
  cancelled: boolean;
  isQuick: boolean;
  company: {
    address: string | null;
    phone: string | null;
    email: string | null;
    logoUrl: string | null;
    currency: string;
    footerNote: string | null;
  };
  customer: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  items: {
    description: string;
    unitLabel: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
  }[];
  subtotal: string;
  discountAmount: string;
  discountLabel: string;
  taxAmount: string;
  taxLabel: string;
  shipping: string;
  total: string;
  paidAmount: string;
  dueAmount: string;
  hasDiscount: boolean;
  hasTax: boolean;
  hasShipping: boolean;
  hasPaid: boolean;
  hasDue: boolean;
  notes: string | null;
  terms: string | null;
};

function amount(data: InvoicePdfData, value: string) {
  return `${data.company.currency} ${value}`;
}

export function InvoicePdf({ data }: { data: InvoicePdfData }) {
  const hasItems = data.items.length > 0;
  const { hasDiscount, hasTax, hasShipping, hasPaid, hasDue } = data;

  return (
    <Document title={`${COMPANY_NAME} Invoice ${data.invoiceNumber}`} author={COMPANY_NAME}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- React-PDF images are not DOM images */}
            {data.company.logoUrl ? <Image src={data.company.logoUrl} style={styles.logo} /> : null}
            <View>
              <Text style={styles.brandName}>{COMPANY_NAME}</Text>
              <Text style={styles.brandMeta}>Printer consumables, ink, toner &amp; cartridges</Text>
              {data.company.address ? <Text style={styles.brandMeta}>{data.company.address}</Text> : null}
              <Text style={styles.brandMeta}>
                {[data.company.phone, data.company.email].filter(Boolean).join("  |  ")}
              </Text>
            </View>
          </View>
          <View>
            <Text style={styles.docTitle}>INVOICE</Text>
            <Text style={styles.docNumber}>{data.invoiceNumber}</Text>
            <View style={styles.statusRow}>
              <Text style={[styles.statusPill, data.cancelled ? styles.cancelledPill : {}]}>
                {data.statusLabel}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.label}>Bill To</Text>
            <Text style={styles.customerName}>{data.customer.name}</Text>
            {data.customer.phone ? <Text style={styles.metaText}>{data.customer.phone}</Text> : null}
            {data.customer.email ? <Text style={styles.metaText}>{data.customer.email}</Text> : null}
            {data.customer.address ? <Text style={styles.metaText}>{data.customer.address}</Text> : null}
          </View>
          <View style={styles.metaRight}>
            <View style={styles.metaLine}>
              <Text style={styles.metaKey}>Invoice No.</Text>
              <Text style={styles.metaValue}>{data.invoiceNumber}</Text>
            </View>
            <View style={styles.metaLine}>
              <Text style={styles.metaKey}>Invoice Date</Text>
              <Text style={styles.metaValue}>{data.dateLabel}</Text>
            </View>
            {data.dueDateLabel ? (
              <View style={styles.metaLine}>
                <Text style={styles.metaKey}>Due Date</Text>
                <Text style={styles.metaValue}>{data.dueDateLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {data.isQuick ? (
          <View style={styles.quickBox}>
            <Text style={styles.quickLabel}>Total Price</Text>
            <Text style={styles.quickValue}>{amount(data, data.total)}</Text>
          </View>
        ) : null}

        {hasItems ? (
          <View style={styles.table}>
            <View style={styles.tableHead}>
              <Text style={[styles.th, styles.colIndex]}>#</Text>
              <Text style={[styles.th, styles.colDesc]}>Description</Text>
              <Text style={[styles.th, styles.colUnit]}>Unit</Text>
              <Text style={[styles.th, styles.colQty]}>Qty</Text>
              <Text style={[styles.th, styles.colRate]}>Unit Price</Text>
              <Text style={[styles.th, styles.colAmount]}>Amount</Text>
            </View>
            {data.items.map((item, index) => (
              <View
                key={`${item.description}-${index}`}
                style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
                wrap={false}
              >
                <Text style={[styles.cellMuted, styles.colIndex]}>{index + 1}</Text>
                <Text style={[styles.cell, styles.colDesc]}>{item.description}</Text>
                <Text style={[styles.cellMuted, styles.colUnit]}>{item.unitLabel}</Text>
                <Text style={[styles.cellMuted, styles.colQty]}>{item.quantity}</Text>
                <Text style={[styles.cellMuted, styles.colRate]}>{amount(data, item.unitPrice)}</Text>
                <Text style={[styles.cell, styles.colAmount]}>{amount(data, item.lineTotal)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.totalsWrap}>
          <View style={styles.totalsBox}>
            {hasItems ? (
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{amount(data, data.subtotal)}</Text>
              </View>
            ) : null}
            {hasDiscount ? (
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>{data.discountLabel}</Text>
                <Text style={styles.totalValue}>- {amount(data, data.discountAmount)}</Text>
              </View>
            ) : null}
            {hasTax ? (
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>{data.taxLabel}</Text>
                <Text style={styles.totalValue}>{amount(data, data.taxAmount)}</Text>
              </View>
            ) : null}
            {hasShipping ? (
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>Shipping</Text>
                <Text style={styles.totalValue}>{amount(data, data.shipping)}</Text>
              </View>
            ) : null}
            <View style={styles.grandLine}>
              <Text style={styles.grandLabel}>Total</Text>
              <Text style={styles.grandValue}>{amount(data, data.total)}</Text>
            </View>
            {hasPaid ? (
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>Paid</Text>
                <Text style={[styles.totalValue, { color: teal }]}>{amount(data, data.paidAmount)}</Text>
              </View>
            ) : null}
            {hasDue ? (
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>Amount Due</Text>
                <Text style={[styles.totalValue, { color: danger }]}>{amount(data, data.dueAmount)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {data.notes || data.terms ? (
          <View style={styles.notesRow}>
            {data.notes ? (
              <View style={styles.notesBlock}>
                <Text style={styles.notesTitle}>Notes</Text>
                <Text style={styles.notesText}>{data.notes}</Text>
              </View>
            ) : null}
            {data.terms ? (
              <View style={styles.notesBlock}>
                <Text style={styles.notesTitle}>Terms &amp; Conditions</Text>
                <Text style={styles.notesText}>{data.terms}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.thankYou}>Thank you for your business.</Text>

        <View style={styles.footer} fixed>
          <View style={styles.footerTop}>
            <Text style={styles.footerBrand}>{COMPANY_NAME}</Text>
            <Text style={styles.footerMeta}>
              {[data.company.phone, data.company.email].filter(Boolean).join("  |  ")}
            </Text>
          </View>
          <Text style={styles.footerNote}>
            {data.company.footerNote || `${COMPANY_NAME} - Printer colours, ink, toner and cartridges.`}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
