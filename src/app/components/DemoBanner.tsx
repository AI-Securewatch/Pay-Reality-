import { useTour } from "../demo/tour/TourProvider";

// Elegant, not a warning: this is a feature of the deployment, not an
// error state, so it uses the brand accent, not amber/critical tokens.
export function DemoBanner() {
  const { start } = useTour();
  return (
    <div
      className="flex items-center justify-center gap-3 flex-wrap px-4 py-2 text-center"
      style={{ backgroundColor: "var(--pr-authority-blue)", color: "#fff", fontSize: 13 }}
    >
      <span>
        <strong className="font-semibold">Interactive Product Demonstration</strong>
        {" -- "}
        This environment contains fictional organisations, users, transactions and policies created solely for demonstration purposes.
      </span>
      <button
        type="button"
        onClick={start}
        className="px-2.5 py-1 rounded-md text-xs font-medium flex-shrink-0"
        style={{ backgroundColor: "rgba(255,255,255,0.18)", color: "#fff" }}
      >
        Start Guided Demo
      </button>
    </div>
  );
}
