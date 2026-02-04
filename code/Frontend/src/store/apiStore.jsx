import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

import { api } from '../api/client';
import { normalizeScript } from '../utils/normalize';

const ApiStoreContext = createContext(null);

function mapDocToItem(doc) {
  if (!doc || typeof doc !== 'object') return null;
  const normalized = normalizeScript(doc);

  const id = normalized.id || normalized._id || normalized?.admin?.id || `DOC-${Math.random().toString(36).slice(2, 8)}`;
  const title = normalized?.admin?.reson_for_visit || normalized?.title || 'Untitled';
  const patientName = (normalized?.patient && (normalized.patient.name || normalized.patient.patient_name)) || normalized?.patient_name || 'Unknown';
  const department = normalized?.admin?.class || normalized?.department || 'General';
  const createdAt = normalized?.createdAt || normalized?.admin?.event_dates || new Date().toISOString().slice(0, 10);
  const summary = normalized?.admin?.summory_of_story || normalized?.summary || '';
  const artifacts = Array.isArray(normalized?.artifacts) ? normalized.artifacts : [];

  const baseVersion = { version: 'current', notes: normalized?.notes || 'Current', fields: normalized };
  const versionList = Array.isArray(normalized?.versions) && normalized.versions.length && normalized.versions[0]?.fields
    ? normalized.versions.map((v, idx) => ({
        version: v.version || `v${v.version_number || idx + 1}`,
        notes: v.notes || v.change_note || '',
        fields: normalizeScript(v.fields || v.document || v),
        createdAt: v.created_at || v.createdAt || '',
      }))
    : [];

  const versions = [baseVersion, ...versionList];

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

function mapRequestToItem(req) {
  if (!req || typeof req !== 'object') return null;
  const id = req.id || req._id || `REQ-${Math.random().toString(36).slice(2, 8)}`;
  const draft = req.draft_script && typeof req.draft_script === 'object' ? req.draft_script : null;
  const draftReasonForVisit = draft?.admin?.reson_for_visit || draft?.patient?.visit_reason || '';
  const reasonForVisit = req.reason_for_visit || req.reson_for_visit || draftReasonForVisit || req.chief_concern || '';
  const title = reasonForVisit || req.chief_concern || req.diagnosis || req.summary_patient_story || 'Script Request';
  const patient = req.patient_demog || draft?.patient?.name || reasonForVisit || req.case_setting || 'Unknown';
  const department = req.class || req.simulation_modal || 'General';
  const createdAt = req.created_at || req.createdAt || req.event || new Date().toISOString().slice(0, 10);
  const summary = req.summary_patient_story || req.pert_aspects_patient_case || '';

  return {
    id,
    title,
    patient,
    department,
    createdAt,
    summary,
    status: req.status || 'Pending',
    note: req.note || '',
    approvedScriptId: req.approved_script_id || '',
    raw: req,
  };
}

export const ApiStoreProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [requestsLoaded, setRequestsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const docs = await (api.listDocuments ? api.listDocuments() : api.listScripts());
        const mappedDocs = (Array.isArray(docs) ? docs : []).map(mapDocToItem).filter(Boolean);
        if (!cancelled) setItems(mappedDocs);
      } catch (err) {
        console.warn('Failed to load documents', err);
      }

      try {
        if (api.listScriptRequests) {
          const reqs = await api.listScriptRequests();
          const mappedReqs = (Array.isArray(reqs) ? reqs : reqs ? [reqs] : []).map(mapRequestToItem).filter(Boolean);
          if (!cancelled) setRequests(mappedReqs);
        }
      } catch (err) {
        console.warn('Failed to load script requests', err);
      } finally {
        if (!cancelled) setRequestsLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const refreshRequests = useCallback(async () => {
    if (!api.listScriptRequests) return [];
    const reqs = await api.listScriptRequests();
    const mapped = (Array.isArray(reqs) ? reqs : reqs ? [reqs] : []).map(mapRequestToItem).filter(Boolean);
    setRequests(mapped);
    return mapped;
  }, []);

  const createRequest = useCallback(async (payload) => {
    if (!api.createScriptRequest) return null;
    const created = await api.createScriptRequest(payload);
    const mapped = mapRequestToItem(created);
    if (mapped) setRequests((prev) => [mapped, ...prev]);
    return mapped;
  }, []);

  const updateRequest = useCallback(async (id, payload) => {
    if (!api.updateScriptRequest) return null;
    const updated = await api.updateScriptRequest(id, payload);
    const mapped = mapRequestToItem(updated);
    if (mapped) {
      setRequests((prev) => prev.map((it) => (it.id === mapped.id ? mapped : it)));
    }
    return mapped;
  }, []);

  const deleteRequest = useCallback(async (id) => {
    if (!api.deleteScriptRequest) return false;
    await api.deleteScriptRequest(id);
    setRequests((prev) => prev.filter((it) => it.id !== id));
    return true;
  }, []);

  const apiValue = useMemo(() => ({
    items,
    requests,
    getRequestById: (id) => requests.find((r) => r.id === id),
    requestsLoaded,
    refreshDocuments: async () => {
      const docs = await api.listDocuments();
      const mapped = (Array.isArray(docs) ? docs : []).map(mapDocToItem).filter(Boolean);
      setItems(mapped);
      return mapped;
    },
    addItem: async (payload) => {
      try {
        const created = await api.createDocument(payload);
        const mapped = mapDocToItem(created);
        if (mapped) {
          setItems((prev) => [mapped, ...prev]);
        } else {
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
    //in case call from pages later
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
    //script request helpers
    refreshRequests,
    createRequest,
    updateRequest,
    deleteRequest,
    
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
      setRequests([]);
    },
  }), [items, requests, refreshRequests, createRequest, updateRequest, deleteRequest, requestsLoaded]);

  return (
    <ApiStoreContext.Provider value={apiValue}>{children}</ApiStoreContext.Provider>
  );
};

export const useApiStore = () => {
  const ctx = useContext(ApiStoreContext);
  if (!ctx) throw new Error('useApiStore must be used within ApiStoreProvider');
  return ctx;
};
