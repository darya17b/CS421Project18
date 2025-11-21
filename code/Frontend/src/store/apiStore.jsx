import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { api } from '../api/client';

const ApiStoreContext = createContext(null);

function mapDocToItem(doc) {
  if (!doc || typeof doc !== 'object') return null;

  const id = doc.id || doc._id || doc?.admin?.id || `DOC-${Math.random().toString(36).slice(2, 8)}`;
  const title = doc?.admin?.reson_for_visit || doc?.title || 'Untitled';
  const patientName = (doc?.patient && (doc.patient.name || doc.patient.patient_name)) || doc?.patient_name || 'Unknown';
  const department = doc?.admin?.class || doc?.department || 'General';
  const createdAt = doc?.createdAt || doc?.admin?.event_dates || new Date().toISOString().slice(0, 10);
  const summary = doc?.admin?.summory_of_story || doc?.summary || '';
  const artifacts = Array.isArray(doc?.artifacts) ? doc.artifacts : [];

  const versions = Array.isArray(doc?.versions) && doc.versions.length && doc.versions[0]?.fields
    ? doc.versions
    : [{ version: 'v1', notes: doc?.notes || 'Initial', fields: doc }];

  return {
    id,
    title,
    patient: patientName,
    department,
    createdAt,
    summary,
    artifacts,
    versions,
  };
}

export const ApiStoreProvider = ({ children }) => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const docs = await (api.listDocuments ? api.listDocuments() : api.listScripts());
        const mapped = (Array.isArray(docs) ? docs : []).map(mapDocToItem).filter(Boolean);
        if (!cancelled) setItems(mapped);
      } catch (err) {
        console.warn('Failed to load documents', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const apiValue = useMemo(() => ({
    items,
    addItem: async (payload) => {
      try {
        const created = await api.createDocument(payload);
        const mapped = mapDocToItem(created);
        if (mapped) {
          setItems((prev) => [mapped, ...prev]);
        } else {
          // fallback: refetch all docs if mapping failed
          const docs = await api.listDocuments();
          const remapped = (Array.isArray(docs) ? docs : []).map(mapDocToItem).filter(Boolean);
          setItems(remapped);
        }
        return mapped;
      } catch (err) {
        console.warn("Failed to create document", err);
        throw err;
      }
    },
    getById: (id) => items.find((it) => it.id === id),
    // helper in case call from pages later
    fetchById: async (id) => {
      try {
        const doc = api.getDocument ? await api.getDocument(id) : await api.getScript(id);
        if (!doc) return null;
        const mapped = mapDocToItem(doc);
        setItems((prev) => (prev.some((it) => it.id === mapped.id)
          ? prev.map((it) => (it.id === mapped.id ? mapped : it))
          : [mapped, ...prev]));
        return mapped;
      } catch (err) {
        console.warn('Failed to fetch document by id', err);
        return null;
      }
    },
    //no local flagging
    toggleProposed: () => { console.warn('toggleProposed disabled: backend propose endpoint required'); },
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
      setItems([]);
    },
  }), [items]);

  return (
    <ApiStoreContext.Provider value={apiValue}>{children}</ApiStoreContext.Provider>
  );
};

export const useApiStore = () => {
  const ctx = useContext(ApiStoreContext);
  if (!ctx) throw new Error('useApiStore must be used within ApiStoreProvider');
  return ctx;
};
