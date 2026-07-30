import { useId, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "./AuthContext";
import { ApiError } from "../live/apiClient";

function describeLoginError(e: unknown): string {
  if (e instanceof ApiError && e.status === 401) {
    return "Incorrect email or password.";
  }
  return "Couldn't sign in. Check your connection and try again.";
}

export function LoginPage() {
  const formId = useId();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      const from = (location.state as { from?: string } | null)?.from ?? "/";
      navigate(from, { replace: true });
    } catch (err) {
      setError(describeLoginError(err));
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
          <img src="/payreality-logo.png" alt="" className="w-8 h-8 rounded-lg flex-shrink-0" />
          <h1 className="text-base font-semibold" style={{ color: "var(--pr-text-primary)" }}>
            Pay<span style={{ color: "var(--pr-warning-amber)" }}>Reality</span>
          </h1>
        </div>

        <div
          className="p-6 rounded-xl"
          style={{
            backgroundColor: "var(--pr-bg-card)",
            border: "1px solid var(--pr-overlay-05)",
          }}
        >
          <h2 className="text-sm font-medium mb-1" style={{ color: "var(--pr-text-primary)" }}>
            Sign in
          </h2>
          <p className="text-xs mb-5" style={{ color: "var(--pr-text-muted)" }}>
            Sign in to access PayReality. Once you're in, the Operator Key in the sidebar can still
            grant elevated access for specific actions -- it isn't an alternative to signing in.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor={`${formId}-email`}
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--pr-text-muted)" }}
              >
                Email
              </label>
              <input
                id={`${formId}-email`}
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg"
                style={{
                  backgroundColor: "var(--pr-input-bg)",
                  color: "var(--pr-text-primary)",
                  border: "1px solid var(--pr-overlay-08)",
                }}
              />
            </div>
            <div>
              <label
                htmlFor={`${formId}-password`}
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--pr-text-muted)" }}
              >
                Password
              </label>
              <input
                id={`${formId}-password`}
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg"
                style={{
                  backgroundColor: "var(--pr-input-bg)",
                  color: "var(--pr-text-primary)",
                  border: "1px solid var(--pr-overlay-08)",
                }}
              />
            </div>

            {error && (
              <p className="text-xs" style={{ color: "var(--pr-critical-red)" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full text-sm font-medium py-2 rounded-lg"
              style={{
                backgroundColor: "var(--pr-authority-blue)",
                color: "white",
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="text-xs mt-4 text-center" style={{ color: "var(--pr-text-muted)" }}>
            No account yet?{" "}
            <Link to="/setup-owner" style={{ color: "var(--pr-authority-blue)" }}>
              Set one up with the Operator Key
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
