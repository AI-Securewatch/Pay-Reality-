import type { CSSProperties, InputHTMLAttributes } from "react";
import { cn } from "./utils";

/**
 * Returns the shared form-field style object so <select>/<textarea> call
 * sites that used to spread a hand-copied literal (`{...inputStyle, height: 70}`)
 * can spread this instead. `theme` picks between the two token pairings
 * that were already both in use (hover-bg fields vs. recessed input-bg fields).
 */
export function getInputStyle(theme: "hover" | "recessed" = "hover", overrides?: CSSProperties): CSSProperties {
  const base: CSSProperties =
    theme === "recessed"
      ? {
          backgroundColor: "var(--pr-input-bg)",
          border: "1px solid var(--pr-overlay-10)",
          color: "var(--pr-text-primary)",
          borderRadius: 8,
          padding: "8px 10px",
          fontSize: 13,
          width: "100%",
        }
      : {
          backgroundColor: "var(--pr-bg-hover)",
          border: "1px solid var(--pr-overlay-10)",
          color: "var(--pr-text-primary)",
          borderRadius: 6,
          padding: "6px 8px",
          fontSize: 13,
          width: "100%",
        };
  return { ...base, ...overrides };
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  theme?: "hover" | "recessed";
}

export function Input({ className, style, theme = "hover", ...rest }: InputProps) {
  return <input className={cn(className)} style={getInputStyle(theme, style)} {...rest} />;
}
