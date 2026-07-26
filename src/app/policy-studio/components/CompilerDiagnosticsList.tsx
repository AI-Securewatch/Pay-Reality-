import type { CompilerError } from "../types";

// Plain text rows, no icons or color-coded severity gimmicks: a
// CompilerError's code/message/path is shown exactly as the compiler
// reported it, never collapsed into a generic "something went wrong."
export function CompilerDiagnosticsList({ errors }: { errors: CompilerError[] }) {
  if (errors.length === 0) return null;
  return (
    <div style={{ marginTop: 12 }}>
      {errors.map((e, i) => (
        <div
          key={i}
          style={{
            borderLeft: "2px solid var(--pr-critical-red)",
            paddingLeft: 10,
            marginBottom: 10,
            fontSize: 13,
          }}
        >
          <div style={{ color: "var(--pr-critical-red)", fontFamily: "monospace" }}>{e.code}</div>
          <div style={{ color: "var(--pr-text-secondary)" }}>{e.message}</div>
          {e.path && (
            <div style={{ color: "var(--pr-text-disabled)", fontSize: 12 }}>at {e.path}</div>
          )}
        </div>
      ))}
    </div>
  );
}
