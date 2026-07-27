import { CircleHelp } from "lucide-react";
import { useHelp } from "./HelpContext";

export function HelpButton() {
  const { openHelp } = useHelp();
  return (
    <button
      type="button"
      onClick={() => openHelp()}
      aria-label="Open Help Center"
      className="flex items-center justify-center rounded-lg transition-colors"
      style={{ width: 32, height: 32, color: "var(--pr-text-muted)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)";
        e.currentTarget.style.color = "var(--pr-text-primary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
        e.currentTarget.style.color = "var(--pr-text-muted)";
      }}
    >
      <CircleHelp className="w-[18px] h-[18px]" />
    </button>
  );
}
