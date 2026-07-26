# Policy Studio Wireframes

Text wireframes for the eight required pages. Enterprise, minimal, GitHub-level clarity: dense information, no illustration, no color-as-decoration, no motion. See `POLICY_STUDIO_COMPONENTS.md` for the React component breakdown these imply.

## Policy List

```
Policy Studio                                          [+ New Policy]

Search: [________________]   Status: [All v]   Sort: [Last Modified v]

Name                    Version  Status         Last Modified   Owner
Vendor Payment Limit    v3       active         2026-07-20      finance_team
Wire Transfer Cap       v1       pending_review 2026-07-22      controller_1
Purchase Order Ceiling  v2       draft          2026-07-24      finance_team
```

## Policy Workspace (create/edit)

```
< Back to Policy List                                   [Save Draft]

Vendor Payment Limit                              v3 · draft

Identity
  Name:        [Vendor Payment Limit____________]
  Description: [Vendor payments under R100,000____]

Scope
  Principal:  [prin_1 - Regional Controller (EMEA) v]
  Action:     [vendor_payment v]
  Agent:      [(any agent for this principal) v]
  Resource:   [________________________________]

Conditions (all must hold)                              [+ Add condition]
  amount        <=  100000                                    [Remove]
  currency      ==  "ZAR"                                      [Remove]
  vendor.approved == true                                      [Remove]

Constraints
  Delegated by:       [controller_1______________]
  Expires:            [____________] (blank = no expiry)
  Evidence required:  [x]
  Risk level:         [medium v]

Effect
  ( ) Allow   ( ) Deny   (x) Require human review

Metadata
  Owner: [finance_team______]   Tags: [pilot] [x]  [+ Add tag]

Audit
  Created 2026-07-18 by alice · Modified 2026-07-24 by alice
```

## Compile

```
< Back to Vendor Payment Limit v3

Compile: Vendor Payment Limit v3

[Run Compile]

Result: ERRORS, not compiled

  ✕ CONFLICTING_POLICY_STRUCTURE
    policies 'rp-1' and 'rp-2' both apply to principal 'prin_1' action
    'vendor_payment' and constrain 'amount' with conflicting values
    (100000 vs 50000)

  Fix the condition above, save a new draft, and recompile.
```

successful case:

```
Result: SUCCESS

  Bundle ID:        bundle-a1b2c3
  Bundle Hash:      sha256:9f8e...
  Compiler Version: 2.0.0
  Rego generated for 1 Runtime Policy. No warnings.

  [Continue to Dry Run]
```

## Dry Run

```
< Back to Vendor Payment Limit v3 (compiled)

Dry Run: Vendor Payment Limit v3

Principal: [prin_1____________]
Action:    [vendor_payment____]
Resource:  [__________________] (optional)
Context (JSON):
  [{"amount": 75000, "currency": "ZAR", "vendor": {"approved": true}}]

[Run Dry Run]

Result:
  Decision:          ALLOW
  Reason:            (none, matched cleanly)
  Evidence required: yes (from this policy's Constraints)

This does not affect the active bundle. Run as many times as needed.
```

## Version History

```
< Back to Vendor Payment Limit

Version History: Vendor Payment Limit

v3  draft            2026-07-24  alice        "widen ZAR limit to 100k"
v2  active            2026-07-20  alice        "add vendor.approved check"   [Rollback]
v1  retired           2026-07-18  alice        "initial version"

[Compare v2 -> v3]
```

## Policy Diff

```
< Back to Version History

Diff: Vendor Payment Limit  v2 -> v3

Conditions
  Modified   amount <= 50000        ->  amount <= 100000
  Unchanged  currency == "ZAR"
  Unchanged  vendor.approved == true

Scope        Unchanged
Effect       Unchanged (require_human_review)
Constraints  Unchanged

Affected Agents (2)
  agent_5   AP-Automation-Agent
  agent_9   Treasury-Bot

Affected Runtime Policies (1)
  Wire Transfer Cap (v1, pending_review): shares principal 'prin_1',
  action 'vendor_payment' is different, listed for awareness only

Risk Impact: INCREASED
  (a numeric limit was raised: this version allows strictly more than
  the version it replaces, for at least one possible input)
```

## Review Queue

```
Policy Studio > Review Queue

Pending Review (2)

Wire Transfer Cap        v1   submitted 2026-07-22 by controller_1
  [View]  [Approve]  [Reject]

Purchase Order Ceiling   v2   submitted 2026-07-23 by finance_team
  [View]  [Approve]  [Reject]

Reject requires a reason:
  [_______________________________]
```

## Deployment

```
< Back to Vendor Payment Limit v3 (compiled)

Deploy: Vendor Payment Limit v3

This policy is approved and compiled. Deploying will replace whatever
policy is currently active and take effect for real Intent evaluation
immediately.

  Compiler Result:    SUCCESS, 0 errors, 0 warnings
  Bundle Version:     bundle-a1b2c3
  Bundle Hash:        sha256:9f8e...

[Deploy]

after deploying:

  Deployed.
  Deployment Time: 2026-07-24 14:32:11 UTC
  This policy is now active.
```
