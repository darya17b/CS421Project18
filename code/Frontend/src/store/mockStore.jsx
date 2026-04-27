import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "mockScripts";
const REQUESTS_STORAGE_KEY = "mockRequests";

const defaultItems = [];

const MockStoreContext = createContext(null);

// handles mock store provider
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
    // handles get request by id
    getRequestById: (id) => requests.find((r) => r.id === id),
    // handles refresh requests
    refreshRequests: async () => requests,
    // handles create request
    createRequest: async (payload) => {
      const req = { id: `REQ-${Date.now()}`, ...payload };
      setRequests((prev) => [req, ...prev]);
      return req;
    },
    // handles update request
    updateRequest: async (id, payload) => {
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...payload } : r)));
      return { id, ...payload };
    },
    // handles delete request
    deleteRequest: async (id) => {
      setRequests((prev) => prev.filter((r) => r.id !== id));
      return true;
    },
    // handles delete item
    deleteItem: async (id) => {
      setItems((prev) => prev.filter((it) => it.id !== id));
      return true;
    },
    // handles update item
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
    // handles add item
    addItem: async (item) => {
      const nextItem = {
        id: item?.id || `DOC-${Date.now()}`,
        ...(item || {}),
      };
      setItems((prev) => [nextItem, ...prev]);
      return nextItem;
    },
    // handles get by id
    getById: (id) => items.find((it) => it.id === id),
    // handles flag proposed
    flagProposed: (id) => {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, proposed: true } : it)));
    },
    // handles toggle proposed
    toggleProposed: (id) => {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, proposed: !it.proposed } : it)));
    },
  
    // handles clone for propose edits
    cloneForProposeEdits: (id) => {
      const existing = items.find((it) => it.id === id);
      if (!existing) return null;
     
      return { id: `${existing.id}-PROPOSED`, draftOf: existing.id };
    },
    // handles clear draft notices
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
    // handles clear drafts
    clearDrafts: () => {
      setItems((prev) => prev.filter((it) => !it.draftOf));
    },
    // handles clear proposed flags
    clearProposedFlags: () => {
      setItems((prev) => prev.map((it) => {
        if (it && Object.prototype.hasOwnProperty.call(it, 'proposed')) {
          const { proposed, ...rest } = it;
          return rest;
        }
        return it;
      }));
    },
    // handles reset data
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

// handles use mock store
export const useMockStore = () => {
  const ctx = useContext(MockStoreContext);
  if (!ctx) throw new Error("useMockStore must be used within MockStoreProvider");
  return ctx;
};
