# Policy Studio Workflow

The state machine Policy Studio enforces, and exactly where each transition is checked. See `POLICY_STUDIO_ARCHITECTURE.md` for the data model and API surface this operates on.

## States

Reuses `PolicyStatus` from `runtime_policy/runtime_policy.py` verbatim, no new states invented: `draft`, `pending_review`, `approved`, `rejected`, `compiled`, `active`, `retired`.

## Transitions

```
                 ┌─────────┐
   (create)  ──> │  draft  │ <──────────────────────┐
                 └────┬────┘                        │ (edit an approved/
                      │ submit for review            │  rejected/active
                      ▼                              │  policy: always
              ┌───────────────┐                       │  creates a new
              │ pending_review │                      │  draft version)
              └───┬───────┬───┘                       │
          approve │       │ reject                    │
                   ▼       ▼                           │
            ┌──────────┐ ┌──────────┐                  │
            │ approved │ │ rejected │──────────────────┘
            └────┬─────┘ └──────────┘
                 │ compile
                 ▼
            ┌──────────┐
            │ compiled │
            └────┬─────┘
                 │ deploy
                 ▼
            ┌────────┐        (a later version's deploy retires this one,
            │ active │  ─────  exactly as today's Policy Bundle activation
            └────────┘         already retires whatever was previously active)
```

## Enforcement, and where it lives

Every transition is checked in `runtime_policy_service.py`, not the router and not the frontend: the frontend disables a button it knows would fail, but the actual guarantee is server-side, since a UI-only check is not a security boundary (the same principle every operator-key-gated endpoint in this codebase already holds itself to, `SECURITY.md`).

| Action | Allowed from | Rejected with |
|---|---|---|
| Submit for review | `draft` | `INVALID_TRANSITION` if not draft |
| Approve | `pending_review` | `INVALID_TRANSITION` otherwise |
| Reject | `pending_review` | `INVALID_TRANSITION` otherwise |
| Compile | `approved` | `INVALID_TRANSITION` otherwise, this is the literal enforcement of "no direct deployment from Draft": a draft cannot even be compiled, let alone deployed, without clearing review first |
| Deploy | `compiled` | `INVALID_TRANSITION` otherwise |
| Edit | any status | Always allowed, always produces a new `draft` version rather than mutating the edited one, so an edit to an `active` policy never silently changes what's currently deployed; it has to go through the same review/approve/compile/deploy sequence again |

Dry Run is deliberately not a transition at all: it can be run against any `compiled` version (it needs real Rego to evaluate against) without changing that version's status, since simulating a decision is not the same act as deploying one.

## Who does what, honestly

There is no per-person identity yet (`SECURITY.md`'s named gap, inherited here unchanged): every mutating action is gated by the same shared operator key every other policy-mutating endpoint already requires, and "author," "reviewer," and "approver" on a `RuntimePolicy`'s `Metadata`/`AuditTrail` remain free-text identity strings supplied by the caller, not an authenticated claim. Policy Studio does not pretend otherwise; the Review Queue UI asks whoever is using it to type their name, the same honest limitation `resolved_by` has always had.

## Version history and rollback

Every save (a new draft from an edit) increments `version` and creates a new `RuntimePolicyRecord` row rather than mutating the previous one, matching `RuntimePolicy`'s own immutability (`RUNTIME_POLICY_LANGUAGE.md`). Rollback is not a separate mechanism: reactivating a previously-active version means running that version's already-compiled bundle through Deploy again, the identical pattern the existing Policy Bundle rollback already uses ("reactivating a previously-retired version's id," `ARCHITECTURE.md`).

## Compile and Dry Run failures never advance status

A `compile` call that returns compiler diagnostics with errors leaves the `RuntimePolicyRecord` at `approved`, never silently marks it `compiled`. A `dry-run` call, successful or not, never changes status at all. Both mirror `compiler_v2.compile_bundle`'s and `dry_run`'s own contract: never raise for a normal failure, always return something structured, and this service layer passes that contract through to the API and the UI unchanged rather than collapsing it into a generic error.
