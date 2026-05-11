import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image as PDFImage,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 40,
    color: "#222",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  businessName: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  businessInfo: {
    fontSize: 9,
    color: "#666",
    lineHeight: 1.6,
  },
  invoiceTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
    marginBottom: 8,
  },
  invoiceMeta: {
    fontSize: 9,
    textAlign: "right",
    lineHeight: 1.8,
    color: "#444",
  },
  billTo: {
    marginBottom: 24,
  },
  billToLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    color: "#aaa",
    letterSpacing: 1,
    marginBottom: 6,
  },
  billToName: {
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  pianoSection: {
    marginBottom: 18,
  },
  pianoSectionHeader: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#f4f4f4",
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottom: "1px solid #1a1a1a",
    paddingBottom: 4,
    marginBottom: 2,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #eee",
    paddingTop: 5,
    paddingBottom: 5,
    paddingHorizontal: 4,
  },
  colDesc: { flex: 3 },
  colQty: { flex: 1, textAlign: "center" },
  colPrice: { flex: 1, textAlign: "right" },
  colTotal: { flex: 1, textAlign: "right" },
  totalsSection: {
    alignItems: "flex-end",
    marginTop: 16,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 200,
    paddingVertical: 3,
    fontSize: 10,
  },
  totalsDivider: {
    borderBottom: "2px solid #1a1a1a",
    width: 200,
    marginVertical: 4,
  },
  totalsBold: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  footer: {
    marginTop: 30,
    paddingTop: 12,
    borderTop: "1px solid #eee",
    fontSize: 9,
    color: "#888",
  },
  notes: {
    marginTop: 16,
    fontSize: 9,
    color: "#666",
  },
});

type LineItem = {
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  piano_id: string | null;
  pianos?: {
    make: string | null;
    model: string | null;
    type: string | null;
  } | null;
};

type Props = {
  invoice: {
    invoice_number: number;
    invoice_date: string;
    due_date: string;
    status: string;
    notes: string | null;
    payment_method: string | null;
    paid_date: string | null;
    clients: {
      first_name: string;
      last_name: string | null;
      company_name: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
      zip: string | null;
      phone: string | null;
    };
  };
  lineItems: LineItem[];
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
    timeZone: "America/Detroit"
  });
}

function pianoLabel(p: NonNullable<LineItem["pianos"]>): string {
  return [p.make, p.model].filter(Boolean).join(" ") || p.type || "Unnamed Piano";
}

// Group line items by piano. Items without a piano (legacy data) end up in a single "Other" group.
type Group = { key: string; label: string | null; items: LineItem[] };

function groupByPiano(items: LineItem[]): Group[] {
  const groups = new Map<string, Group>();
  for (const item of items) {
    const key = item.piano_id ?? "__no_piano__";
    const label = item.piano_id && item.pianos ? pianoLabel(item.pianos) : null;
    if (!groups.has(key)) {
      groups.set(key, { key, label, items: [] });
    }
    groups.get(key)!.items.push(item);
  }
  return Array.from(groups.values());
}

export default function InvoicePDF({ invoice, lineItems }: Props) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.line_total, 0);
  const isPaid = invoice.status === "Paid";
  const client = invoice.clients;
  const clientName = client.company_name || [client.first_name, client.last_name].filter(Boolean).join(" ");
  const groups = groupByPiano(lineItems);

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.businessName}>David Cossey - Piano Tuner</Text>
            <Text style={styles.businessInfo}>7690 Oxford Ct.</Text>
            <Text style={styles.businessInfo}>Ypsilanti, MI 48197</Text>
            <Text style={styles.businessInfo}>(734) 812-8096</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceMeta}>Invoice #: {invoice.invoice_number}</Text>
            <Text style={styles.invoiceMeta}>Invoice Date: {formatDate(invoice.invoice_date)}</Text>
            <Text style={styles.invoiceMeta}>Due Date: {formatDate(invoice.due_date)}</Text>
          </View>
        </View>

        {/* Bill To */}
        <View style={styles.billTo}>
          <Text style={styles.billToLabel}>Bill To</Text>
          <Text style={styles.billToName}>{clientName}</Text>
          {client.address && <Text>{client.address}</Text>}
          <Text>{[client.city, client.state, client.zip].filter(Boolean).join(", ")}</Text>
          {client.phone && <Text>{client.phone}</Text>}
        </View>

        {/* Line Items, grouped by piano */}
        {groups.map((g) => (
          <View key={g.key} style={styles.pianoSection}>
            {g.label && (
              <Text style={styles.pianoSectionHeader}>{g.label}</Text>
            )}
            <View style={styles.tableHeader}>
              <Text style={styles.colDesc}>Description</Text>
              <Text style={styles.colQty}>Qty</Text>
              <Text style={styles.colPrice}>Unit Price</Text>
              <Text style={styles.colTotal}>Total</Text>
            </View>
            {g.items.map((item, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.colDesc}>{item.description}</Text>
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colPrice}>${item.unit_price.toFixed(2)}</Text>
                <Text style={styles.colTotal}>${item.line_total.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsRow}>
            <Text>Subtotal</Text>
            <Text>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Total</Text>
            <Text>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Paid</Text>
            <Text>${isPaid ? subtotal.toFixed(2) : "0.00"}</Text>
          </View>
          <View style={styles.totalsDivider} />
          <View style={styles.totalsRow}>
            <Text style={styles.totalsBold}>Amount Due</Text>
            <Text style={styles.totalsBold}>${isPaid ? "0.00" : subtotal.toFixed(2)}</Text>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <Text style={styles.notes}>{invoice.notes}</Text>
        )}

        {/* Footer */}
        <View style={[styles.footer, { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 40 }]}>
          <View>
            <Text>Thank you for your business!</Text>
            <Text style={{ marginTop: 4 }}>Payment forms accepted:</Text>
            <Text style={{ marginTop: 2 }}>Venmo - @davetunespianos</Text>
            <Text>Cash or Check</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <PDFImage src="https://piano-tuner-app.vercel.app/Venmo_QR_Code.jpg" style={{ width: 140, height: 100 }} />
            <Text style={{ marginTop: 4, fontSize: 8 }}>Scan to pay via Venmo</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
}