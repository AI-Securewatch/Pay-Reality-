import { useState } from "react";
import { KeyRound } from "lucide-react";
import { getOperatorKey, setOperatorKey } from "../operatorKey";

// The backend requires this key for policy review/compile/activate and
// decision-resolution calls (app/security.py::verify_operator_key). There's
// no human login system yet, so this is the real, working credential entry
// point for the single shared operator key, not a placeholder.
export function OperatorKeyField() {
  const [value, setValue] = useState(getOperatorKey());
  const [saved, setSaved] = useState(false);

  return (
    <div
      className="px-3 py-2.5 rounded-xl mt-2"
      style={{ backgroundColor: "var(--pr-overlay-03)", border: "1px solid var(--pr-overlay-04)" }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <KeyRound className="w-3 h-3" style={{ color: "var(--pr-text-disabled)" }} />
        <span className="text-[11px] font-medium" style={{ color: "var(--pr-text-secondary)" }}>
          Operator Key
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="password"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          onBlur={() => {
            setOperatorKey(value);
            setSaved(true);
          }}
          placeholder="Required to approve/activate"
          className="w-full text-[11px] px-2 py-1 rounded-md"
          style={{
            backgroundColor: "var(--pr-input-bg)",
            color: "var(--pr-text-primary)",
            border: "1px solid var(--pr-overlay-06)",
          }}
        />
      </div>
      {saved && (
        <p className="text-[10px] mt-1" style={{ color: "var(--pr-trust-green)" }}>
          Saved to this browser
        </p>
      )}
    </div>
  );
}
