"""Fixed scope vocabulary: spec Section 12.6.

"The MVP maintains this vocabulary as a fixed enumeration reviewed alongside
the domain model; introducing a new action type requires updating this
enumeration and is treated as a schema change, not a runtime configuration
change, so that an unrecognized requested_action always resolves to
HUMAN_REVIEW rather than silently matching the wrong Mandate" (spec 9.3/12.6).

Used by the intent service (not the Rego bundle itself) to short-circuit an
unrecognized action to HUMAN_REVIEW before OPA is ever queried; this is a
different case from "a recognized action with no matching Mandate", which
the compiled Rego correctly resolves to DENY (spec 9.3 draws this exact
distinction).
"""

KNOWN_SCOPES = frozenset(
    {
        "vendor_payment",
        "purchase_order_create",
        "wire_transfer",
    }
)


def is_recognized_scope(action: str) -> bool:
    return action in KNOWN_SCOPES
