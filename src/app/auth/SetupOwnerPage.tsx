import { useId, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Shield } from "lucide-react";
import { useAuth } from "./AuthContext";
import { authApi } from "./authApi";
import { ApiError } from "../live/apiClient";
import { getOperatorKey, setOperatorKey } from "../live/operatorKey";

function describeSetupError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return "That Operator Key is incorrect.";
    if (e.status === 503) return "No Operator Key is configured on this deployment yet.";
    if (e.status === 409) return "Another account already uses that email.";
    if (e.status === 422) return "Password must be at least 8 characters.";
  }
  return "Couldn't set up the account. Check your connection and try again.";
}

// The Organisation Owner account is created automatically on first boot
// (RBAC.md), but its password only ever exists as a one-time line in the
// deploy log -- there was no way for a real person to actually retrieve
// it or create their own login. This page is that missing path: anyone
// who holds the Operator Key (already a full administrative credential
// everywhere else in this platform) can use it here to set the Owner's
// real email and password, once or again later if it's ever lost.
export function SetupOwnerPage() {
  const formId = useId();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [operatorKey, setOperatorKeyInput] = useState(getOperatorKey());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await authApi.setupOwner(email, password, operatorKey);
      setOperatorKey(operatorKey);
      await login(email, password);
      navigate("/organization", { replace: true });
    } catch (err) {
      setError(describeSetupError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="flex items-center justify-center min-h-screen p-6"
      style={{ backgroundColor: "var(--pr-bg-primary)" }}
    >
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, var(--pr-authority-blue) 0%, var(--pr-logo-gradient-end) 100%)",
            }}
          >
            <Shield className="w-4.5 h-4.5 text-white" />
          </div>
          <h1 className="text-base font-semibold" style={{ color: "var(--pr-text-primary)" }}>
            Pay<span style={{ color: "var(--pr-warning-amber)" }}>Reality</span>
          </h1>
        </div>

        <div
          className="p-6 rounded-xl"
          style={{ backgroundColor: "var(--pr-bg-card)", border: "1px solid var(--pr-overlay-05)" }}
        >
          <h2 className="text-sm font-medium mb-1" style={{ color: "var(--pr-text-primary)" }}>
            Set up your account
          </h2>
          <p className="text-xs mb-5" style={{ color: "var(--pr-text-muted)" }}>
            The Operator Key is the same credential the sidebar's "Operator Key" field asks for --
            whoever holds it already has full administrative access to this platform. Use it once here
            to become the Organisation Owner with your own email and password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor={`${formId}-operator-key`}
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--pr-text-muted)" }}
              >
                Operator Key
              </label>
              <input
                id={`${formId}-operator-key`}
                type="password"
                required
                value={operatorKey}
                onChange={(e) => setOperatorKeyInput(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg"
                style={{ backgroundColor: "var(--pr-input-bg)", color: "var(--pr-text-primary)", border: "1px solid var(--pr-overlay-08)" }}
              />
            </div>
            <div>
              <label
                htmlFor={`${formId}-email`}
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--pr-text-muted)" }}
              >
                Your email
              </label>
              <input
                id={`${formId}-email`}
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg"
                style={{ backgroundColor: "var(--pr-input-bg)", color: "var(--pr-text-primary)", border: "1px solid var(--pr-overlay-08)" }}
              />
            </div>
            <div>
              <label
                htmlFor={`${formId}-password`}
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--pr-text-muted)" }}
              >
                New password
              </label>
              <input
                id={`${formId}-password`}
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg"
                style={{ backgroundColor: "var(--pr-input-bg)", color: "var(--pr-text-primary)", border: "1px solid var(--pr-overlay-08)" }}
              />
            </div>
            <div>
              <label
                htmlFor={`${formId}-confirm-password`}
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--pr-text-muted)" }}
              >
                Confirm password
              </label>
              <input
                id={`${formId}-confirm-password`}
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg"
                style={{ backgroundColor: "var(--pr-input-bg)", color: "var(--pr-text-primary)", border: "1px solid var(--pr-overlay-08)" }}
              />
            </div>

            {error && (
              <p className="text-xs" style={{ color: "var(--pr-critical-red)" }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full text-sm font-medium py-2 rounded-lg"
              style={{ backgroundColor: "var(--pr-authority-blue)", color: "white", opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? "Setting up..." : "Set up account"}
            </button>
          </form>

          <p className="text-xs mt-4 text-center" style={{ color: "var(--pr-text-muted)" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "var(--pr-authority-blue)" }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
