import { Image, Text, View } from "@react-pdf/renderer";
import bodyMapImage from "../../assets/hpi-diagram.png";
import painScaleImage from "../../assets/wong-baker-faces.png";
import { COLORS, styles } from "./theme";

const BODY_MAP_RATIO = 367 / 395;
const PAIN_SCALE_RATIO = 214 / 655;

// handles card
export const Card = ({ title, children, inner = false, style }) => (
  <View style={[inner ? styles.innerCard : styles.card, style]}>
    {title ? (
      <Text style={inner ? styles.innerTitle : styles.partTitle} minPresenceAhead={40}>
        {title}
      </Text>
    ) : null}
    {children}
  </View>
);

// handles field
export const Field = ({ label, value, emptyText = "None", optional = false }) => {
  const clean = String(value ?? "").trim();
  if (!clean && optional) return null;
  return (
    <View style={styles.field} wrap={false}>
      <Text style={styles.label}>{label}</Text>
      <Text style={clean ? styles.value : styles.emptyValue}>{clean || emptyText}</Text>
    </View>
  );
};

// handles field list
export const FieldList = ({ fields, emptyText, optional }) =>
  fields.map((field) => (
    <Field
      key={field.label}
      label={field.label}
      value={field.value}
      emptyText={emptyText}
      optional={optional ?? field.optional}
    />
  ));

// handles note box
export const NoteBox = ({ title, children, style }) => (
  <View style={[styles.note, style]} wrap={false}>
    {title ? <Text style={styles.subTitle}>{title}</Text> : null}
    {typeof children === "string" ? <Text>{children}</Text> : children}
  </View>
);

// handles bullets
export const Bullets = ({ items }) => (
  <View>
    {items.map((item, index) => (
      <View key={`${index}-${item}`} style={styles.bulletRow} wrap={false}>
        <Text style={styles.bulletDot}>•</Text>
        <Text style={styles.bulletText}>{item}</Text>
      </View>
    ))}
  </View>
);

// handles labeled bullets
export const LabeledBullets = ({ fields }) => (
  <Bullets items={fields.map((field) => `${field.label}: ${field.value}`)} />
);

// handles data table
export const DataTable = ({ caption, columns, rows, minRows = 0 }) => {
  const paddedRows = [...rows];
  while (paddedRows.length < minRows) paddedRows.push({});
  return (
    <View wrap={false}>
      {caption ? <Text style={styles.tableCaption}>{caption}</Text> : null}
      <View style={[styles.table, { borderRightWidth: 0, borderBottomWidth: 0 }]}>
        <View style={styles.tableRow}>
          {columns.map((column) => (
            <Text key={column.key} style={[styles.tableCell, styles.tableHeaderCell, { flex: column.flex || 1 }]}>
              {column.label}
            </Text>
          ))}
        </View>
        {paddedRows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.tableRow}>
            {columns.map((column) => (
              <Text key={column.key} style={[styles.tableCell, { flex: column.flex || 1 }]}>
                {row[column.key] || ""}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

// handles attribute grid
export const AttributeGrid = ({ attributes }) => {
  const levels = [1, 2, 3, 4, 5];
  const rows = [...attributes, { label: "Other", level: 0 }];
  const headerCell = [styles.tableCell, styles.tableHeaderCell];
  return (
    <View style={[styles.table, { borderRightWidth: 0, borderBottomWidth: 0 }]} wrap={false}>
      <View style={styles.tableRow}>
        <Text style={[...headerCell, { flex: 2.6 }]}>Attribute</Text>
        {levels.map((level) => (
          <Text key={level} style={headerCell}>{level}</Text>
        ))}
      </View>
      {rows.map((row) => (
        <View key={row.label} style={styles.tableRow}>
          <Text style={[...headerCell, { flex: 2.6 }]}>{row.label}</Text>
          {levels.map((level) => (
            <Text
              key={level}
              style={[
                styles.tableCell,
                { textAlign: "center", fontWeight: 700 },
                row.level === level ? { backgroundColor: COLORS.highlight } : null,
              ]}
            >
              {row.level === level ? String(level) : ""}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
};

// handles pain scale
export const PainScale = () => {
  const width = 400;
  return (
    <View
      style={{
        borderWidth: 0.75,
        borderColor: COLORS.rule,
        borderRadius: 6,
        padding: 6,
        marginBottom: 10,
        alignItems: "center",
      }}
      wrap={false}
    >
      <Image src={painScaleImage} style={{ width, height: width * PAIN_SCALE_RATIO }} />
    </View>
  );
};

// handles body map
export const BodyMap = ({ markers }) => {
  const width = 270;
  const height = width * BODY_MAP_RATIO;
  const size = 18;
  return (
    <View style={{ flexDirection: "row", gap: 8 }} wrap={false}>
      <View style={{ borderWidth: 0.75, borderColor: COLORS.rule, borderRadius: 6, padding: 6 }}>
        <View style={{ width, height, position: "relative" }}>
          <Image src={bodyMapImage} style={{ width, height }} />
          {markers.map((marker, index) => (
            <View
              key={index}
              style={{
                position: "absolute",
                left: marker.x * width - size / 2,
                top: marker.y * height - size / 2,
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: COLORS.marker,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: 700 }}>{index + 1}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Text>Pictured above: Two-body diagram showing anterior and posterior views.</Text>
        {markers.length ? (
          <Text>
            <Text style={styles.label}>Markers: </Text>
            {markers.length}
          </Text>
        ) : null}
      </View>
    </View>
  );
};
