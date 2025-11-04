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
  listScripts: () => request('/scripts'),
  getScript: (id) => request(`/scripts/${id}`),
  createScript: (payload) =>
    request('/scripts', { method: 'POST', body: payload }),
  proposeEdits: (id, payload = {}) =>
    request(`/scripts/${id}/propose`, { method: 'POST', body: payload }),
};
