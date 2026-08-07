import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type ToastSeverity = "success" | "error" | "warning" | "neutral";

interface Toast {
  id: number;
  message: string;
  severity: ToastSeverity;
}

interface ToastContextValue {
  notify: (message: string, severity?: ToastSeverity) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const SEVERITY_COLOR: Record<ToastSeverity, string> = {
  success: "var(--pr-trust-green)",
  error: "var(--pr-critical-red)",
  warning: "var(--pr-warning-amber)",
  neutral: "var(--pr-text-secondary)",
};

const DISMISS_MS = 5000;

/** App-wide toast host. Mount once near the root (see App.tsx); call useToast() anywhere below it. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, severity: ToastSeverity = "neutral") => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, severity }]);
      window.setTimeout(() => dismiss(id), DISMISS_MS);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2" style={{ maxWidth: 360, zIndex: 100 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm"
            style={{
              backgroundColor: "var(--pr-bg-card)",
              border: `1px solid ${SEVERITY_COLOR[t.severity]}`,
              color: "var(--pr-text-primary)",
            }}
          >
            <span aria-hidden="true" style={{ color: SEVERITY_COLOR[t.severity] }}>●</span>
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              style={{ color: "var(--pr-text-muted)" }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
