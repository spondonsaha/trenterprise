import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { COMPANY_NAME } from "@/lib/constants";

const navy = "#1E3A8A";
const teal = "#0D9488";
const slate = "#64748B";
const ink = "#0F172A";
const border = "#E2E8F0";
const danger = "#DC2626";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: ink,
    paddingTop: 40,
    paddingHorizontal: 48,
    paddingBottom: 88,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: navy,
    paddingBottom: 16,
    marginBottom: 24,
  },
  brandRow: { flexDirection: "row", alignItems: "center", maxWidth: "65%" },
  logo: { width: 56, height: 40, objectFit: "contain", marginRight: 10 },
  brandName: { fontSize: 19, fontFamily: "Helvetica-Bold", color: navy, marginBottom: 3 },
  brandMeta: { fontSize: 8, color: slate, lineHeight: 1.45 },
  docTitle: { fontSize: 20, fontFamily: "Helvetica-Bold", color: navy, textAlign: "right" },
  docNumber: { fontSize: 9.5, color: slate, textAlign: "right", marginTop: 4 },
  voidPill: {
    marginTop: 8,
    alignSelf: "flex-end",
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    color: danger,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24, gap: 24 },
  metaBlock: { width: "58%" },
  metaRight: { width: "38%", alignItems: "flex-end" },
  label: { fontSize: 7.5, color: slate, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  customerName: { fontSize: 13, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  metaText: { fontSize: 9, color: slate, lineHeight: 1.5 },
  metaLine: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 4, width: "100%" },
  metaKey: { width: 72, fontSize: 8.5, color: slate, textAlign: "right", paddingRight: 10 },
  metaValue: { width: 120, fontSize: 8.5, fontFamily: "Helvetica-Bold", textAlign: "right" },
  amountBox: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 4,
    paddingVertical: 20,
    paddingHorizontal: 18,
    marginBottom: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountLabel: { fontSize: 9, color: navy, textTransform: "uppercase", letterSpacing: 0.8 },
  amountValue: { fontSize: 24, fontFamily: "Helvetica-Bold", color: navy },
  detailsBox: { borderWidth: 1, borderColor: border, borderRadius: 3, overflow: "hidden", marginBottom: 20 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: border },
  detailRowLast: { borderBottomWidth: 0 },
  detailLabel: { fontSize: 9, color: slate },
  detailValue: { fontSize: 9, fontFamily: "Helvetica-Bold", maxWidth: "65%", textAlign: "right" },
  noteBox: { backgroundColor: "#F8FAFC", borderLeftWidth: 3, borderLeftColor: teal, padding: 10, marginBottom: 18 },
  noteLabel: { fontSize: 7.5, color: slate, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
  noteText: { fontSize: 9, color: "#334155", lineHeight: 1.5 },
  thankYou: { textAlign: "center", fontSize: 10, color: teal, fontFamily: "Helvetica-Bold", marginTop: 24 },
  signature: { marginTop: 46, flexDirection: "row", justifyContent: "flex-end" },
  signatureLine: { width: 180, borderTopWidth: 1, borderTopColor: "#94A3B8", paddingTop: 5, alignItems: "center" },
  signatureText: { fontSize: 8, color: slate },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: border,
    paddingTop: 8,
  },
  footerTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  footerBrand: { fontSize: 8, fontFamily: "Helvetica-Bold", color: navy },
  footerMeta: { fontSize: 7.5, color: slate },
  footerNote: { fontSize: 7, color: slate, textAlign: "center", marginTop: 2 },
});

export type ReceiptPdfData = {
  receiptNumber: string;
  dateLabel: string;
  voided: boolean;
  company: {
    address: string | null;
    phone: string | null;
    email: string | null;
    logoUrl: string | null;
    currency: string;
  };
  customerName: string;
  invoiceNumber: string;
  amount: string;
  methodLabel: string;
  reference: string | null;
  receivedBy: string;
  note: string | null;
};

export function ReceiptPdf({ data }: { data: ReceiptPdfData }) {
  const rows: { label: string; value: string }[] = [
    { label: "Payment Method", value: data.methodLabel },
    { label: "Invoice", value: data.invoiceNumber },
    { label: "Received By", value: data.receivedBy },
  ];
  if (data.reference) rows.push({ label: "Reference", value: data.reference });
  if (data.note) rows.push({ label: "Note", value: data.note });

  return (
    <Document title={`${COMPANY_NAME} Receipt ${data.receiptNumber}`} author={COMPANY_NAME}>
      <Page size="A4" style={styles.page}>
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
            <Text style={styles.docTitle}>PAYMENT RECEIPT</Text>
            <Text style={styles.docNumber}>{data.receiptNumber}</Text>
            {data.voided ? <Text style={styles.voidPill}>VOID</Text> : null}
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.label}>Received With Thanks From</Text>
            <Text style={styles.customerName}>{data.customerName}</Text>
            <Text style={styles.metaText}>Payment against invoice {data.invoiceNumber}</Text>
          </View>
          <View style={styles.metaRight}>
            <View style={styles.metaLine}>
              <Text style={styles.metaKey}>Receipt No.</Text>
              <Text style={styles.metaValue}>{data.receiptNumber}</Text>
            </View>
            <View style={styles.metaLine}>
              <Text style={styles.metaKey}>Date</Text>
              <Text style={styles.metaValue}>{data.dateLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Amount Received</Text>
          <Text style={styles.amountValue}>
            {data.company.currency} {data.amount}
          </Text>
        </View>

        <View style={styles.detailsBox}>
          {rows.map((row, index) => (
            <View
              key={row.label}
              style={[styles.detailRow, index === rows.length - 1 ? styles.detailRowLast : {}]}
            >
              <Text style={styles.detailLabel}>{row.label}</Text>
              <Text style={styles.detailValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        {data.reference ? (
          <View style={styles.noteBox}>
            <Text style={styles.noteLabel}>Payment Reference</Text>
            <Text style={styles.noteText}>{data.reference}</Text>
          </View>
        ) : null}

        <Text style={styles.thankYou}>Thank you for your payment.</Text>

        <View style={styles.signature}>
          <View style={styles.signatureLine}>
            <Text style={styles.signatureText}>Authorized Signature</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <View style={styles.footerTop}>
            <Text style={styles.footerBrand}>{COMPANY_NAME}</Text>
            <Text style={styles.footerMeta}>
              {[data.company.phone, data.company.email].filter(Boolean).join("  |  ")}
            </Text>
          </View>
          <Text style={styles.footerNote}>
            {COMPANY_NAME} - This receipt is computer generated and valid without a manual signature.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
