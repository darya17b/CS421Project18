import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "mockScripts";

const defaultItems = [
  {
    id: "SCR-001",
    title: "Chest Pain Evaluation",
    patient: "John Doe",
    department: "Cardiology",
    createdAt: "2024-09-12",
    summary: "Standardized patient presenting intermittent chest pain.",
    artifacts: ["Door Note.pdf", "Patient Photo.jpg"],
    versions: [
      { version: "v1", notes: "Initial draft", fields: { bp: "130/85", hr: "88" } },
      { version: "v2", notes: "Updated vitals", fields: { bp: "128/82", hr: "84" } },
    ],
  },
  {
    id: "SCR-002",
    title: "Diabetes Follow-up",
    patient: "Maria Lopez",
    department: "Endocrinology",
    createdAt: "2024-10-01",
    summary: "A1C review and medication adherence.",
    artifacts: ["Lab Results.pdf"],
    versions: [{ version: "v1", notes: "Initial", fields: { a1c: "8.1%" } }],
  },
  {
    id: "SCR-003",
    title: "Pediatric Fever",
    patient: "Sammy Park",
    department: "Pediatrics",
    createdAt: "2024-08-22",
    summary: "Fever with mild dehydration.",
    artifacts: ["Parent Instructions.pdf"],
    versions: [{ version: "v1", notes: "Initial", fields: { temp: "38.6 C" } }],
  },
  {
    id: "SCR-004",
    title: "Migraine Assessment",
    patient: "Alicia Keys",
    department: "Neurology",
    createdAt: "2024-07-15",
    summary: "Recurring migraines with aura.",
    artifacts: ["Imaging Placeholder.png"],
    versions: [{ version: "v1", notes: "Initial", fields: { freq: "2/week" } }],
  },
  {
    id: "SCR-005",
    title: "Knee Pain",
    patient: "Mike Chen",
    department: "Orthopedics",
    createdAt: "2024-09-30",
    summary: "Post-sports injury evaluation.",
    artifacts: ["X-ray Placeholder.png"],
    versions: [{ version: "v1", notes: "Initial", fields: { rom: "Limited" } }],
  },
  {
    id: "SCR-006",
    title: "Anxiety Check-in",
    patient: "Riley Quinn",
    department: "Psychiatry",
    createdAt: "2024-09-05",
    summary: "GAD-7 review and coping strategies.",
    artifacts: ["Questionnaire.pdf"],
    versions: [{ version: "v1", notes: "Initial", fields: { gad7: 12 } }],
  },
];

const MockStoreContext = createContext(null);

export const MockStoreProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : defaultItems;
    } catch {
      return defaultItems;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore storage errors
    }
  }, [items]);

  const api = useMemo(() => ({
    items,
    addItem: (item) => setItems((prev) => [item, ...prev]),
    getById: (id) => items.find((it) => it.id === id),
    flagProposed: (id) => {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, proposed: true } : it)));
    },
    toggleProposed: (id) => {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, proposed: !it.proposed } : it)));
    },
  
    cloneForProposeEdits: (id) => {
      const existing = items.find((it) => it.id === id);
      if (!existing) return null;
     
      return { id: `${existing.id}-PROPOSED`, draftOf: existing.id };
    },
    clearDraftNotices: () => {
      setItems((prev) =>
        prev.map((it) => {
          if (it && Object.prototype.hasOwnProperty.call(it, 'draftOf')) {
            const { draftOf, ...rest } = it;
            return rest;
          }
          return it;
        })
      );
    },
    clearDrafts: () => {
      setItems((prev) => prev.filter((it) => !it.draftOf));
    },
    clearProposedFlags: () => {
      setItems((prev) => prev.map((it) => {
        if (it && Object.prototype.hasOwnProperty.call(it, 'proposed')) {
          const { proposed, ...rest } = it;
          return rest;
        }
        return it;
      }));
    },
    resetData: () => {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      setItems(JSON.parse(JSON.stringify(defaultItems)));
    },
  }), [items]);

  return (
    <MockStoreContext.Provider value={api}>{children}</MockStoreContext.Provider>
  );
};

export const useMockStore = () => {
  const ctx = useContext(MockStoreContext);
  if (!ctx) throw new Error("useMockStore must be used within MockStoreProvider");
  return ctx;
};
