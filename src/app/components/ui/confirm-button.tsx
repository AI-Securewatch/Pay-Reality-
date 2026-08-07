import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Button } from "./button";

interface ConfirmButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  onConfirm: () => void | Promise<void>;
  children: ReactNode;
  confirmLabel?: string;
  variant?: "primary" | "danger" | "ghost" | "tint-success" | "tint-danger";
  size?: "sm" | "md";
}

/**
 * A button that requires a second click to actually fire, for
 * consequential actions (approve/reject/publish/delete/revoke) that had
 * no confirmation step before. Renders inline rather than as a modal to
 * stay consistent with this app's plain, non-glassmorphic surface.
 */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = "Confirm",
  variant = "primary",
  size = "md",
  disabled,
  className,
  style,
  ...rest
}: ConfirmButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Button
          type="button"
          variant={variant}
          size={size}
          disabled={busy}
          pending={busy}
          className={className}
          style={style}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
              setConfirming(false);
            }
          }}
        >
          {busy ? "Working..." : confirmLabel}
        </Button>
        <Button type="button" variant="ghost" size={size} disabled={busy} onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </span>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={disabled}
      className={className}
      style={style}
      onClick={() => setConfirming(true)}
      {...rest}
    >
      {children}
    </Button>
  );
}
