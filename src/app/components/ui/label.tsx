import type { LabelHTMLAttributes } from "react";
import { cn } from "./utils";

interface FieldLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  size?: 11 | 12;
}

/** The muted field-label style repeated across every form/panel in the app. */
export function FieldLabel({ className, style, size = 12, ...rest }: FieldLabelProps) {
  return (
    <label
      className={cn(className)}
      style={{
        fontSize: size,
        color: "var(--pr-text-muted)",
        display: "block",
        marginBottom: size === 11 ? 2 : 4,
        ...style,
      }}
      {...rest}
    />
  );
}
