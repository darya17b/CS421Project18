const API_BASE = import.meta.env.VITE_API_URL || '/api';

const getToken = () => {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
};

async function request(path, { method = 'GET', body, headers } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }

  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export const api = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password } }),
  // Existing script APIs 
  listScripts: () => request('/scripts'),
  getScript: (id) => request(`/scripts/${id}`),
  createScript: (payload) =>
    request('/scripts', { method: 'POST', body: payload }),
  proposeEdits: (id, payload = {}) =>
    request(`/scripts/${id}/propose`, { method: 'POST', body: payload }),

  // document APIs (readonly)
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
  updateDocument: (id, payload) =>
    request(`/document?id=${encodeURIComponent(id)}`, { method: 'PUT', body: payload }),
  deleteDocument: (id) =>
    request(`/document?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
