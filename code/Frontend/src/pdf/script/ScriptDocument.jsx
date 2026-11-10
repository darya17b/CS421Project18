import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import logoImage from "../../assets/wsu-com-lockup.png";
import { Bullets, Card, NoteBox } from "./components";
import {
  Part1,
  Part2,
  Part3,
  Part4,
  Part5,
  Part5Continued,
  Part6,
  Part7,
  Part8,
  Part8Continued,
  Part9,
  Part10,
  Part11,
  Part12,
  Part12Continued,
  Part13,
  Part14,
  Part15,
} from "./parts";
import { PAGE_LAYOUT, SCRIPT_PARTS, TOC_GROUPS } from "./layout";
import { COLORS, styles } from "./theme";

const PART_COMPONENTS = {
  1: Part1,
  2: Part2,
  3: Part3,
  4: Part4,
  5: Part5,
  5.2: Part5Continued,
  6: Part6,
  7: Part7,
  8: Part8,
  8.2: Part8Continued,
  9: Part9,
  10: Part10,
  11: Part11,
  12: Part12,
  12.2: Part12Continued,
  13: Part13,
  14: Part14,
  15: Part15,
};

const SCRIPT_NOTE = [
  "Human simulation is a recognized methodology that involves human role players interacting with learners in a wide range of experiential learning and assessment contexts. At the inception of the SP methodology, the human role players portrayed patients and were referred to as standardized or simulated patients (SPs). As the methodology has matured, these human role players may portray an expanded scope of roles (e.g. patients, clients, participants, family members, etc) for various healthcare learners (pharmacists, social/case workers, occupational and physical therapists etc).",
  "It is important to recognize that SP cases have multiple components that reflect the different users of a case, such as SP educators, SPs, learners, raters, and administrators. The development of these materials is optimized when employing a collaborative, multistep process, utilizing a set of best practice guidelines for designing simulations (see INACSL Standard: Simulation Design) as well as guidelines relevant to the professional context (e.g., medicine, law).",
  "Lewis, K. L., Bohnert, C. A., Gammon, W. L., Hölzer, H., Lyman, L., Smith, C., Thompson, T.M., Wallace, A.M., Gliva-McConvey, G. (2017). The Association of Standardized Patient Educators (ASPE) Standards of Best Practice (SOBP). Advances in Simulation, 2(1), 2-8.",
];

// handles cover page
const CoverPage = ({ model }) => (
  <Page size="LETTER" style={styles.page}>
    <Image src={logoImage} style={{ width: 260, height: 260 * (536 / 1503), marginBottom: 12 }} />
    <View style={{ borderTopWidth: 0.75, borderColor: COLORS.rule, marginBottom: 10 }} />
    <View style={[styles.card, { flexGrow: 1, justifyContent: "space-between", marginBottom: 0 }]}>
      <Card inner style={{ marginBottom: 0 }}>
        <Text style={styles.coverTitle}>Virtual Clinical Center</Text>
        <Text style={{ color: COLORS.muted }}>Case Modified: {model.cover.caseModified}</Text>
        <Text style={{ color: COLORS.muted }}>Case: {model.cover.caseLine}</Text>
        {model.cover.caseType ? <Text style={{ color: COLORS.muted }}>Case Type: {model.cover.caseType}</Text> : null}
      </Card>
      <View>
        <View style={{ borderTopWidth: 0.75, borderColor: COLORS.rule, marginBottom: 10 }} />
        <Card inner style={{ marginBottom: 0 }}>
          <Text style={styles.partTitle}>Case Content Warning:</Text>
          <Text>{model.cover.contentWarning || "None"}</Text>
        </Card>
      </View>
    </View>
  </Page>
);

// handles contents page
const ContentsPage = ({ parts }) => (
  <Page size="LETTER" style={styles.page}>
    <Card>
      <Text style={styles.partTitle}>Table of Contents</Text>
      {TOC_GROUPS.map((group) => {
        const titles = parts
          .filter((part) => SCRIPT_PARTS[part].group === group.id && !SCRIPT_PARTS[part].continued)
          .map((part) => SCRIPT_PARTS[part].title);
        if (!titles.length) return null;
        return (
          <View key={group.id} wrap={false}>
            <Text style={styles.subTitle}>{group.title}</Text>
            <View
              style={{
                backgroundColor: COLORS.tocBox,
                borderWidth: 0.75,
                borderColor: COLORS.rule,
                paddingVertical: 12,
                paddingHorizontal: 18,
                marginBottom: 8,
              }}
            >
              <Bullets items={titles} />
            </View>
          </View>
        );
      })}
      <Text style={styles.subTitle}>Standardized Patient Script Note</Text>
      <NoteBox style={{ marginBottom: 0 }}>
        {SCRIPT_NOTE.map((paragraph, index) => (
          <Text key={index} style={{ marginBottom: index < SCRIPT_NOTE.length - 1 ? 8 : 0 }}>
            {paragraph}
          </Text>
        ))}
      </NoteBox>
    </Card>
  </Page>
);

// handles script document
const ScriptDocument = ({ model }) => {
  const isIncluded = (part) => part !== 14 || model.feedback.enabled;
  const pages = PAGE_LAYOUT.map((page) => page.filter(isIncluded)).filter((page) => page.length);
  const parts = pages.flat();

  return (
    <Document title={model.admin.names[0].value} author="Virtual Clinical Center">
      <CoverPage model={model} />
      <ContentsPage parts={parts} />
      {pages.map((page) => (
        <Page key={page.join("-")} size="LETTER" style={styles.page}>
          {page.map((part) => {
            const PartComponent = PART_COMPONENTS[part];
            return <PartComponent key={part} model={model} />;
          })}
        </Page>
      ))}
    </Document>
  );
};

export default ScriptDocument;
