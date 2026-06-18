import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export type NotificationType = "success" | "warning" | "info";

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}

interface NotificationContextValue {
  notify: {
    success: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
  };
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const styles: Record<NotificationType, { bg: string; border: string; color: string; icon: typeof CheckCircle2 }> = {
  success: {
    bg: "rgba(34, 197, 94, 0.12)",
    border: "rgba(34, 197, 94, 0.3)",
    color: "var(--pr-trust-green)",
    icon: CheckCircle2,
  },
  warning: {
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.3)",
    color: "var(--pr-warning-amber)",
    icon: AlertTriangle,
  },
  info: {
    bg: "rgba(77, 124, 254, 0.12)",
    border: "rgba(77, 124, 254, 0.3)",
    color: "var(--pr-authority-blue)",
    icon: Info,
  },
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Notification[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const add = useCallback(
    (type: NotificationType, message: string) => {
      const id = `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setItems((prev) => [...prev.slice(-2), { id, type, message }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  const notify = {
    success: (message: string) => add("success", message),
    warning: (message: string) => add("warning", message),
    info: (message: string) => add("info", message),
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div
        className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
        style={{ maxWidth: 380 }}
      >
        <AnimatePresence>
          {items.map((item) => {
            const s = styles[item.type];
            const Icon = s.icon;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 40, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40 }}
                className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg"
                style={{
                  backgroundColor: "var(--pr-bg-secondary)",
                  borderColor: s.border,
                }}
              >
                <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: s.color }} />
                <p className="text-sm flex-1" style={{ color: "var(--pr-text-primary)" }}>
                  {item.message}
                </p>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  className="flex-shrink-0 p-0.5 rounded"
                  style={{ color: "var(--pr-text-muted)" }}
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotify(): NotificationContextValue["notify"] {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    return {
      success: () => {},
      warning: () => {},
      info: () => {},
    };
  }
  return ctx.notify;
}
