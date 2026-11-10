import { Text, View } from "@react-pdf/renderer";
import {
  AttributeGrid,
  BodyMap,
  Bullets,
  Card,
  DataTable,
  Field,
  FieldList,
  LabeledBullets,
  NoteBox,
  PainScale,
} from "./components";
import { SCRIPT_PARTS } from "./layout";
import { COLORS, styles } from "./theme";

const SP_OBJECTIVES = [
  "To appropriately and accurately reveal the facts about the role being portrayed.",
  "To modulate performance based on Learner needs including varying emotional response and cues.",
  "To improvise additional information in a manner that is consistent with the overall tone of the case.",
  "Play a character that allows for learners to be evaluated fairly based on how they performed in this encounter.",
];

const GENDER_NOTE =
  "If blank, gender is not a factor in the case and any pronouns/gender presentation are acceptable. "
  + "Please make the character's sex assigned at birth easily available to the learner. (eg. If the learner asks "
  + "\"What are your pronouns?\" a great answer would be \"I was assigned male at birth but prefer She/Her.\")";

// handles part card
const PartCard = ({ part, children }) => <Card title={SCRIPT_PARTS[part].title}>{children}</Card>;

// handles part 1 script details
export const Part1 = ({ model }) => {
  const d = model.details;
  return (
    <PartCard part={1}>
      <Field label="Reason for Visit" value={d.reasonForVisit} />
      <Field label="Chief Concern" value={d.chiefConcern} />
      <Field label="Diagnosis" value={d.diagnosis} />
      <Field label="ICD-10 Code" value={d.icd10} />
      <Field label="SP age group" value={d.spAgeGroup} />
      <Field label="Event Format" value={d.eventFormat} />
      <Field label="Learner Level & Discipline" value={d.learnerLevel} />
      <Field label="Authors" value={d.authors} />
      <Field label="Summary of patient story" value={d.summary} />
      <Field label="Case factors associated with social determinants of health" value={d.caseFactors} />
      <Field label="Instructions for additional staff" value={d.staffInstructions} emptyText="N/A" />
      <Card inner style={{ marginTop: 8, marginBottom: 0 }}>
        <Text>Vitals: See Part 3 – Door Note & Learner Instruction</Text>
      </Card>
    </PartCard>
  );
};

// handles part 2 review of systems
export const Part2 = ({ model }) => (
  <PartCard part={2}>
    <NoteBox>Note: If a system is not present below then all findings should be considered normal.</NoteBox>
    <FieldList fields={model.ros} />
  </PartCard>
);

// handles part 3 door note
export const Part3 = ({ model }) => {
  const n = model.doorNote;
  return (
    <PartCard part={3}>
      <Field label="Patient Name" value={n.patientName} />
      <Field label="Date of Birth YYYY-MM-DD" value={n.dob} emptyText="Not provided" />
      <Field label="Reason for Visit" value={n.reasonForVisit} />
      {n.vitalsIncluded ? (
        <>
          <Field label="Heart rate" value={n.heartRate} emptyText="Not provided" />
          <Field label="Blood Pressure" value={n.bloodPressure} emptyText="Not provided" />
          <Field label="Respiratory rate" value={n.respiratoryRate} emptyText="Not provided" />
          <Field label="Oxygen Saturation" value={n.oxygenSaturation} emptyText="Not provided" />
          <Field label="Temperature" value={n.temperature} emptyText="Not provided" />
        </>
      ) : (
        <Field label="Vital Signs" value="Not included on door note" />
      )}
      <Field label="Context" value={n.context} optional />
      <Field label="Task" value={n.task} optional />
      <Field label="Patient Encounter Duration" value={n.duration} emptyText="Not provided" />
    </PartCard>
  );
};

// handles part 4 vcc items
export const Part4 = ({ model }) => (
  <PartCard part={4}>
    <Card title="Items to Include" inner>
      <Text>None / Not Used</Text>
    </Card>
    <Card title="EHR Release Timing" inner>
      <Text>None / Not Used</Text>
    </Card>
    <Card inner style={{ marginBottom: 0 }}>
      <Field label="SP Demographics & Recruitment Guidelines" value={model.vccItems.demographics} emptyText="Unknown" />
      <Field label="Special Supplies & Props Needed" value={model.vccItems.supplies} />
    </Card>
  </PartCard>
);

// handles part 5 character portrayal
export const Part5 = ({ model }) => {
  const p = model.portrayal;
  return (
    <PartCard part={5}>
      <NoteBox title="SP Objectives for a simulated patient encounter.">
        <Bullets items={SP_OBJECTIVES} />
      </NoteBox>
      <Text style={styles.subTitle}>Character Info</Text>
      <Field label="Name" value={p.name} />
      <Field label="Date Of Birth" value={p.dob} emptyText="Not provided" />
      <Field label="Opening Statement" value={p.openingStatement} />
      <FieldList fields={p.disclosure} optional />
    </PartCard>
  );
};

// handles part 5.2 character attributes
export const Part5Continued = ({ model }) => (
  <PartCard part={5.2}>
    <Text style={styles.subTitle}>Character Attributes</Text>
    <AttributeGrid attributes={model.portrayal.attributes} />
  </PartCard>
);

// handles part 6 gender identity
export const Part6 = ({ model }) => (
  <PartCard part={6}>
    <NoteBox>{GENDER_NOTE}</NoteBox>
    <FieldList fields={model.gender} optional />
  </PartCard>
);

// handles part 7 presentation
export const Part7 = ({ model }) => (
  <Card title={`${SCRIPT_PARTS[7].title} (e.g. body language, non-verbal communication, verbal characteristics)`}>
    <Card inner>
      <FieldList fields={model.behaviors.fields} />
    </Card>
    {model.behaviors.note ? (
      <Card inner style={{ marginBottom: 0 }}>
        <Text>{model.behaviors.note}</Text>
      </Card>
    ) : null}
  </Card>
);

// handles part 8 hpi
export const Part8 = ({ model }) => (
  <PartCard part={8}>
    <Field label="Chief Concern" value={model.hpi.chiefConcern} />
    <FieldList fields={model.hpi.fields} />
  </PartCard>
);

// handles part 8.2 pain and body map
export const Part8Continued = ({ model }) => (
  <PartCard part={8.2}>
    <Text style={styles.subTitle}>Current Pain: {model.hpi.pain} out of 10</Text>
    <PainScale />
    <Field label="Pain Notes" value={model.hpi.painNotes} />
    <Text style={styles.subTitle}>Body Map</Text>
    <BodyMap markers={model.hpi.markers} />
  </PartCard>
);

// handles part 9 past medical history
export const Part9 = ({ model }) => (
  <PartCard part={9}>
    <Card title="General Past Medical History" inner>
      {model.pmh.some((field) => field.value) ? (
        <FieldList fields={model.pmh} optional />
      ) : (
        <Text style={styles.emptyValue}>None reported</Text>
      )}
    </Card>
    <Card title="Obstetric/Gynecologic (if applicable)" inner style={{ marginBottom: 0 }}>
      <FieldList fields={model.obstetric} optional />
    </Card>
  </PartCard>
);

// handles part 10 medications and allergies
export const Part10 = ({ model }) => (
  <PartCard part={10}>
    <DataTable
      caption="Current Medications"
      columns={[
        { key: "generic", label: "Generic name", flex: 1.6 },
        { key: "brand", label: "Brand" },
        { key: "dose", label: "Dose" },
        { key: "route", label: "Route" },
        { key: "frequency", label: "Frequency", flex: 1.2 },
        { key: "reason", label: "Reason", flex: 1.2 },
      ]}
      rows={model.medications}
      minRows={1}
    />
    {model.nonPrescriptionMedications.length ? (
      <View style={styles.field}>
        <Text style={styles.label}>Non-prescription Medications</Text>
        <Bullets items={model.nonPrescriptionMedications} />
      </View>
    ) : null}
    {model.allergies.length ? (
      <DataTable
        caption="Allergies"
        columns={[
          { key: "allergen", label: "Allergen" },
          { key: "reaction", label: "Reaction" },
          { key: "severity", label: "Severity" },
          { key: "notes", label: "Notes", flex: 1.5 },
        ]}
        rows={model.allergies}
      />
    ) : (
      <Text>No allergies recorded.</Text>
    )}
  </PartCard>
);

// handles part 11 family history
export const Part11 = ({ model }) => (
  <PartCard part={11}>
    <Field label="General Family Info" value={model.family.general} optional />
    <Text style={styles.subTitle}>Family Conditions</Text>
    <DataTable
      caption="Family Conditions"
      columns={[
        { key: "relation", label: "Relation", flex: 1.4 },
        { key: "age", label: "Age" },
        { key: "notes", label: "Notes", flex: 1.4 },
      ]}
      rows={model.family.rows}
      minRows={1}
    />
  </PartCard>
);

// handles part 12 social history
export const Part12 = ({ model }) => {
  const s = model.social;
  return (
    <PartCard part={12}>
      <Card title="Personal Background" inner>
        <Text>{s.personalBackground || "None"}</Text>
      </Card>
      <Card title="Nutritional & Exercise History" inner>
        <Text>{s.nutritionExercise || "None"}</Text>
      </Card>
      <Card title="Military, Community, Educational & Employment" inner style={{ marginBottom: 0 }}>
        <LabeledBullets fields={s.employment} />
      </Card>
    </PartCard>
  );
};

// handles part 12.2 social history continued
export const Part12Continued = ({ model }) => {
  const s = model.social;
  return (
    <PartCard part={12.2}>
      <Card inner>
        <Field label="Safety Measures" value={s.safetyMeasures} />
      </Card>
      <Card inner>
        <Field label="Significant Life Stressors" value={s.lifeStressors} />
      </Card>
      <Text style={styles.subTitle}>Substance Use</Text>
      {s.substanceUse.length ? <Bullets items={s.substanceUse} /> : <Text>None reported</Text>}
      <Text style={[styles.subTitle, { marginTop: 8 }]}>Social Support</Text>
      <LabeledBullets fields={s.support} />
      <Text style={[styles.subTitle, { marginTop: 8 }]}>Sexual History</Text>
      <LabeledBullets fields={s.sexualHistory} />
      {s.sexualHistoryOther ? <Bullets items={[`Other details: ${s.sexualHistoryOther}`]} /> : null}
    </PartCard>
  );
};

// handles part 13 other sp notes
export const Part13 = ({ model }) => {
  const o = model.otherNotes;
  const prompts = o.prompts.filter((prompt) => prompt.items.length);
  const hasContent = o.spNotes || o.physicalExam || o.additionalInstructions || prompts.length;
  return (
    <PartCard part={13}>
      {o.spNotes ? <Text style={styles.field}>{o.spNotes}</Text> : null}
      {o.physicalExam ? <Text style={styles.field}>PE: {o.physicalExam}</Text> : null}
      <Field label="Additional Instructions" value={o.additionalInstructions} optional />
      {prompts.map((prompt) => (
        <View key={prompt.label} style={styles.field}>
          <Text style={styles.label}>{prompt.label}</Text>
          <Bullets items={prompt.items.map((item) => `“${item.replace(/^"+|"+$/g, "")}”`)} />
        </View>
      ))}
      {!hasContent ? <Text>No special patient notes.</Text> : null}
    </PartCard>
  );
};

// handles part 14 sp feedback
export const Part14 = ({ model }) => (
  <PartCard part={14}>
    <Field label="Custom Feedback Notes" value={model.feedback.notes} />
  </PartCard>
);

// handles part 15 admin notes
export const Part15 = ({ model }) => (
  <View style={[styles.card, { flexGrow: 1 }]}>
    <Text style={styles.partTitle}>Part 15 – Admin notes</Text>
    {model.admin.names.filter((entry) => entry.value).map((entry) => (
      <View key={entry.label} style={{ marginBottom: 2 }} wrap={false}>
        <Text>{entry.label}</Text>
        <Text style={{ paddingLeft: 24 }}>{entry.value}</Text>
      </View>
    ))}
    <View
      style={{
        flexGrow: 1,
        minHeight: 200,
        marginTop: 8,
        borderWidth: 0.75,
        borderColor: COLORS.rule,
        borderRadius: 6,
        padding: 14,
      }}
    >
      <Text style={styles.innerTitle}>Write-in Notes:</Text>
      {model.admin.writeInNotes ? <Text>{model.admin.writeInNotes}</Text> : null}
    </View>
  </View>
);
