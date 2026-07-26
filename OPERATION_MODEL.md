# Operation Model

## What an Operation is

An Operation is the verb: what is being done to a Resource, independent of what kind of Resource it is. Approve, Reject, Create, Delete, Execute, Assign, Release, Suspend, Sign, Transfer, Archive, Publish. The same Operation applies across every industry PayReality serves: "Approve" governs a vendor payment, a prescription, a building permit, and a claim identically at the Runtime Engine level, because the Runtime Engine only ever evaluates whether *this* Operation, on *this* Resource, by *this* Principal, satisfies *these* Conditions.

## Why Operation is separated from Resource Type

Today, `scope.action` is a single opaque string (`"vendor_payment"`, `"wire_transfer"`) that conflates verb and noun: there is no clean way to express "reject a vendor payment" as distinct from "approve a vendor payment," because the action name itself already presumes approval is the only thing that happens to it. Splitting the concept in two:

```
Operation:  Approve
Resource:   Vendor Payment
```

means every Operation can be combined with every Resource Type an organisation defines, without PayReality's code needing to know either exists in advance. A hospital's "Approve Prescription" and a mine's "Release Blast Zone" are structurally identical: `{operation, resource_type, scope.resource, conditions, constraints, effect}`. Only the strings differ, and the strings are entirely the organisation's.

## Canonical Operations

A starting, PayReality-provided set of universal verbs (extensible, never closed):

| Operation | Meaning |
|---|---|
| Approve | Grant the requested action |
| Reject | Refuse the requested action |
| Create | Bring a new instance of a Resource into existence |
| Delete | Remove a Resource instance |
| Execute | Carry out an action that has already been authorized |
| Assign | Transfer responsibility for a Resource to a Principal |
| Release | Permit an action to proceed after being held (e.g. a blast, a shipment, a hold) |
| Suspend | Temporarily halt authority over a Resource |
| Sign | Apply a binding attestation to a Resource |
| Transfer | Move a Resource (or authority over it) between Principals |
| Archive | Move a Resource out of active status without deleting it |
| Publish | Make a Resource or decision effective/visible |

This list is deliberately not exhaustive and never will be exhaustively enumerable by PayReality; see "Extensibility" below.

## Extensibility

Operations are customer-extensible the same way Resource Types are (`RESOURCE_MODEL.md`): an organisation can register a new Operation (say, "Escalate," or a domain-specific verb like "Decommission" for critical infrastructure) as data, not as a PayReality code change. The canonical list above is a *seed vocabulary* PayReality ships so a new customer has sensible defaults on day one, not a closed enum the Runtime Engine or Compiler validates against internally. Validation of "is this a known Operation for this organisation" happens the same way "is this a known Resource Type" does: against that organisation's own registry, via the same `Vocabulary`-protocol mechanism Compiler V2 already has (`domain/compiler_v2/compiler_v2.py::Vocabulary`), just no longer hardcoded to one financial implementation.

## Relationship to today's Effect model

`Effect` (`allow | deny | require_human_review`, `domain/runtime_policy/effects.py`) is not replaced or renamed. Operation describes *what is being requested*; Effect describes *what the Runtime Engine decided to do about the request* once a matching policy's conditions are evaluated. These are already orthogonal in the existing model and remain so: "Approve" (an Operation) can resolve to any of the three Effects depending on Conditions, exactly as "vendor_payment" (today's action) already can.

## What does not change

The Decision Engine's evaluation logic (`domain/decision/engine.py`) does not need to know the difference between "Approve" and "Release" any more than it needs to know the difference between "vendor_payment" and "blast_zone" today: it evaluates whether the Principal, Operation, and Resource combination matches an active policy's `Scope`, and whether that policy's Conditions hold, exactly as it evaluates `scope.action` today. Renaming `action` to `operation` (plus adding `resource_type` alongside it, per `RESOURCE_MODEL.md`) is a field-naming and schema-shape change to `Scope`, not a change to how matching or evaluation works.

See `MIGRATION_PLAN_V4.md` for how `operation` is introduced without breaking any policy, bundle, or API that still uses `action` during the transition.
