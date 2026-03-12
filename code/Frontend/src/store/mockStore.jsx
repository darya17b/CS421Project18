import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "mockScripts";
const REQUESTS_STORAGE_KEY = "mockRequests";

const defaultItems = [];

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
  const [requests, setRequests] = useState(() => {
    try {
      const raw = localStorage.getItem(REQUESTS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {

    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requests));
    } catch {

    }
  }, [requests]);

  const api = useMemo(() => ({
    items,
    requests,
    getRequestById: (id) => requests.find((r) => r.id === id),
    refreshRequests: async () => requests,
    createRequest: async (payload) => {
      const req = { id: `REQ-${Date.now()}`, ...payload };
      setRequests((prev) => [req, ...prev]);
      return req;
    },
    updateRequest: async (id, payload) => {
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...payload } : r)));
      return { id, ...payload };
    },
    deleteRequest: async (id) => {
      setRequests((prev) => prev.filter((r) => r.id !== id));
      return true;
    },
    deleteItem: async (id) => {
      setItems((prev) => prev.filter((it) => it.id !== id));
      return true;
    },
    updateItem: async (id, fields, note = "Updated") => {
      setItems((prev) => prev.map((it) => {
        if (it.id !== id) return it;
        const restVersions = Array.isArray(it.versions)
          ? it.versions.filter((v) => v.version !== "current")
          : [];
        return {
          ...it,
          title: fields?.admin?.reson_for_visit || it.title,
          patient: fields?.patient?.name || it.patient,
          department: fields?.admin?.case_letter || fields?.admin?.class || it.department,
          summary: fields?.admin?.summory_of_story || it.summary,
          versions: [{ version: "current", notes: note, fields }, ...restVersions],
        };
      }));
      return true;
    },
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
      try { localStorage.removeItem(REQUESTS_STORAGE_KEY); } catch {}
      setItems(JSON.parse(JSON.stringify(defaultItems)));
      setRequests([]);
    },
  }), [items, requests]);

  return (
    <MockStoreContext.Provider value={api}>{children}</MockStoreContext.Provider>
  );
};

export const useMockStore = () => {
  const ctx = useContext(MockStoreContext);
  if (!ctx) throw new Error("useMockStore must be used within MockStoreProvider");
  return ctx;
};
