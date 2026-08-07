import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: number;
  borderColor?: string;
  radius?: number;
}

/** The card shell repeated near-verbatim across the app (bg-card + hairline border). */
export function Card({
  children,
  className,
  style,
  padding = 20,
  borderColor = "var(--pr-overlay-05)",
  radius = 12,
  ...rest
}: CardProps) {
  const mergedStyle: CSSProperties = {
    backgroundColor: "var(--pr-bg-card)",
    border: `1px solid ${borderColor}`,
    borderRadius: radius,
    padding,
    ...style,
  };
  return (
    <div className={cn(className)} style={mergedStyle} {...rest}>
      {children}
    </div>
  );
}
