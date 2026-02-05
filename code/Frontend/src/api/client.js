// Use environment variable or default to relative path
// For development with separate frontend server: VITE_API_URL=http://localhost:8080/api
// For production build served by Go: VITE_API_URL=/api (or leave empty)
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const getToken = () => {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
};

async function request(path, { method = 'GET', body, headers } = {}) {
  const url = `${API_BASE}${path}`;
  console.log(`[API] ${method} ${url}`); // Debug logging

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const res = await fetch(url, {
    method,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...headers,
    },
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[API Error] ${method} ${url} - ${res.status}:`, text);
    throw new Error(text || `HTTP ${res.status}`);
  }

  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export const api = {
  // Health check
  health: () => request('/health'),

  // Auth APIs (if you add authentication later)
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password } }),

  // Document APIs
  listDocuments: () => request('/document'),
  
  searchDocuments: (params = {}) => {
    const qs = Object.entries(params)
      .filter(([, v]) => v != null && String(v).trim() !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    const path = qs ? `/document?${qs}` : '/document';
    return request(path);
  },
  
  getDocument: async (id) => {
    const res = await request(`/document?id=${encodeURIComponent(id)}`);
    return Array.isArray(res) ? res[0] : res;
  },
  
  createDocument: (payload) =>
    request('/document', { method: 'POST', body: payload }),
  
  updateDocument: (id, payload, params = {}) => {
    const searchParams = new URLSearchParams();
    searchParams.set('id', id);
    
    // Add optional parameters like change_note and created_by
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        searchParams.set(key, value);
      }
    });
    
    return request(`/document?${searchParams.toString()}`, { 
      method: 'PUT', 
      body: payload 
    });
  },
  
  deleteDocument: (id) =>
    request(`/document?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Artifact APIs
  uploadArtifact: (file) => {
    const form = new FormData();
    form.append('file', file);
    return request('/artifact', { method: 'POST', body: form });
  },

  deleteArtifact: (id) =>
    request(`/artifact?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Document version APIs
  listDocumentVersions: (id) =>
    request(`/document/versions?id=${encodeURIComponent(id)}`),
  
  getDocumentVersion: (id, versionNumber) =>
    request(`/document/version?id=${encodeURIComponent(id)}&version=${encodeURIComponent(versionNumber)}`),
  
  restoreDocumentVersion: (id, versionNumber) =>
    request(`/document/restore?id=${encodeURIComponent(id)}&version=${encodeURIComponent(versionNumber)}`, { 
      method: 'POST' 
    }),

  // Document partial data APIs
  getDocumentMedications: (id) =>
    request(`/document/medications?id=${encodeURIComponent(id)}`),
  
  getDocumentVitals: (id) =>
    request(`/document/vitals?id=${encodeURIComponent(id)}`),

  // Script Request APIs
  listScriptRequests: (params = {}) => {
    const qs = Object.entries(params)
      .filter(([, v]) => v != null && String(v).trim() !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    const path = qs ? `/script-request?${qs}` : '/script-request';
    return request(path);
  },
  
  getScriptRequest: async (id) => {
    const res = await request(`/script-request?id=${encodeURIComponent(id)}`);
    return Array.isArray(res) ? res[0] : res;
  },
  
  createScriptRequest: (payload) =>
    request('/script-request', { method: 'POST', body: payload }),
  
  updateScriptRequest: (id, payload) =>
    request(`/script-request?id=${encodeURIComponent(id)}`, { 
      method: 'PUT', 
      body: payload 
    }),
  
  deleteScriptRequest: (id) =>
    request(`/script-request?id=${encodeURIComponent(id)}`, { 
      method: 'DELETE' 
    }),
};

// Export for debugging
if (import.meta.env.DEV) {
  console.log('[API Client] Base URL:', API_BASE);
}
