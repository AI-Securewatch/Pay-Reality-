import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

type AlertSeverity = "error" | "warning" | "success" | "neutral";

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  severity?: AlertSeverity;
  icon?: ReactNode;
}

const SEVERITY_COLOR: Record<AlertSeverity, string> = {
  error: "var(--pr-critical-red)",
  warning: "var(--pr-warning-amber)",
  success: "var(--pr-trust-green)",
  neutral: "var(--pr-text-secondary)",
};

/** The inline status-message row repeated across every form/page (role="alert" + a severity color). */
export function Alert({ severity = "neutral", icon, className, style, children, ...rest }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(icon && "flex items-center gap-2 text-sm", className)}
      style={{ color: SEVERITY_COLOR[severity], ...style }}
      {...rest}
    >
      {icon}
      {icon ? <span>{children}</span> : children}
    </div>
  );
}
