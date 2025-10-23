import { createContext, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const api = useMemo(() => ({
    show: (message, opts = {}) => {
      const id = Math.random().toString(36).slice(2);
      const toast = { id, message, type: opts.type || "info" };
      setToasts((t) => [...t, toast]);
      const duration = opts.duration === 0 ? 0 : (opts.duration || 2500);
      if (duration > 0) {
        setTimeout(() => {
          setToasts((t) => t.filter((x) => x.id !== id));
        }, duration);
      }
      return id;
    },
    hide: (id) => setToasts((t) => t.filter((x) => x.id !== id)),
    clear: () => setToasts([]),
  }), []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((t) => (
          <div key={t.id} className={`relative rounded-md pl-4 pr-8 py-2 shadow text-white ${t.type === "success" ? "bg-green-600" : t.type === "error" ? "bg-red-600" : "bg-gray-800"}`}>
            {t.message}
            <button
              aria-label="Dismiss"
              className="absolute top-1 right-1 text-white/80 hover:text-white"
              onClick={() => api.hide(t.id)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};
