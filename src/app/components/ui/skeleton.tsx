import type { CSSProperties } from "react";
import { cn } from "./utils";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: CSSProperties;
  className?: string;
}

/** A pulsing placeholder block for content that hasn't loaded yet. */
export function Skeleton({ width = "100%", height = 14, radius = 6, style, className }: SkeletonProps) {
  return (
    <div
      className={cn("pr-skeleton", className)}
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

/** A stack of skeleton rows, for list/table loading states. */
export function SkeletonRows({ count = 4, height = 14, gap = 10 }: { count?: number; height?: number; gap?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={height} width={i === count - 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}
