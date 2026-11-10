import { Font, StyleSheet } from "@react-pdf/renderer";
import carlitoRegular from "@fontsource/carlito/files/carlito-latin-400-normal.woff";
import carlitoItalic from "@fontsource/carlito/files/carlito-latin-400-italic.woff";
import carlitoBold from "@fontsource/carlito/files/carlito-latin-700-normal.woff";
import carlitoBoldItalic from "@fontsource/carlito/files/carlito-latin-700-italic.woff";

// Carlito is metrically compatible with Calibri, which the reference scripts use.
Font.register({
  family: "Carlito",
  fonts: [
    { src: carlitoRegular },
    { src: carlitoItalic, fontStyle: "italic" },
    { src: carlitoBold, fontWeight: 700 },
    { src: carlitoBoldItalic, fontWeight: 700, fontStyle: "italic" },
  ],
});
// Keep words whole instead of hyphenating them across lines.
Font.registerHyphenationCallback((word) => [word]);

export const COLORS = {
  text: "#111111",
  muted: "#4b5563",
  border: "#e5e7eb",
  rule: "#cbd5e1",
  tableBorder: "#94a3b8",
  tableHeader: "#eff3f8",
  tocBox: "#f6f8fb",
  noteBg: "#fefbea",
  noteBorder: "#f6dc7a",
  highlight: "#f7aab8",
  marker: "#dc2626",
};

export const styles = StyleSheet.create({
  page: {
    fontFamily: "Carlito",
    fontSize: 11,
    color: COLORS.text,
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 48,
    lineHeight: 1.15,
  },
  card: {
    borderWidth: 0.75,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  innerCard: {
    borderWidth: 0.75,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
  },
  // Larger text sets its own lineHeight; the inherited one is resolved against the 11pt body size.
  coverTitle: { fontSize: 20, fontWeight: 700, lineHeight: 1.2, marginBottom: 2 },
  partTitle: { fontSize: 16, fontWeight: 700, lineHeight: 1.2, marginBottom: 8 },
  subTitle: { fontSize: 13, fontWeight: 700, lineHeight: 1.2, marginBottom: 3, marginTop: 2 },
  innerTitle: { fontSize: 13, fontWeight: 700, lineHeight: 1.2, marginBottom: 6 },
  field: { marginBottom: 3 },
  label: { fontWeight: 700 },
  value: {},
  emptyValue: { color: COLORS.muted },
  note: {
    backgroundColor: COLORS.noteBg,
    borderWidth: 0.75,
    borderColor: COLORS.noteBorder,
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  bulletRow: { flexDirection: "row", marginBottom: 1.5 },
  bulletDot: { width: 12, textAlign: "center" },
  bulletText: { flex: 1 },
  table: { borderWidth: 0.75, borderColor: COLORS.tableBorder, marginBottom: 10 },
  tableCaption: { textAlign: "center", marginBottom: 2 },
  tableRow: { flexDirection: "row" },
  tableCell: {
    flex: 1,
    borderRightWidth: 0.75,
    borderBottomWidth: 0.75,
    borderColor: COLORS.tableBorder,
    paddingVertical: 6,
    paddingHorizontal: 6,
    minHeight: 18,
  },
  tableHeaderCell: { backgroundColor: COLORS.tableHeader, fontWeight: 700, textAlign: "center" },
});
