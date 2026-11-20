// In-memory login session. Nothing is written to localStorage/sessionStorage, so
// the JWT is gone on reload. The role is only used to decide what UI to show;
// the backend checks every request itself.
import { useSyncExternalStore } from "react";

let session = null; // { token, email, id, role }
const listeners = new Set();

export const getSession = () => session;

export const getToken = () => session?.token ?? null;

export const isAdmin = () => session?.role === "admin";

export const setSession = (next) => {
  session = next;
  listeners.forEach((l) => l());
};

export const clearSession = () => setSession(null);

export const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// handles use session
export const useSession = () => useSyncExternalStore(subscribe, getSession);
