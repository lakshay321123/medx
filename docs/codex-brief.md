## Mandatory Fixes (no code shown here)

Locate & Mute the Legacy Summarizer

Search repo for any producer of these strings and disable it for AI-Doc intents:

“on the provided packet and snapshot”

“Patient Reports” / “Patient Overview”

“Follow-up Question:” / “What is your primary concern”

When the incoming message matches our AI-Doc intents (below), do not emit this legacy output. Either early-return a benign placeholder or let routing continue to the new Snapshot/Compare path.

Top-of-Route Intercepts (must execute before anything else)

In both routes:

AI-Doc route (e.g., /api/aidoc/chat)

Generic stream route (e.g., /api/chat/stream)
Add a deterministic intercept at the very top of POST() that:

Detect these intents (case/spacing tolerant):
“pull my reports”, “pull all my reports”, “show/list my reports”,
“compare my reports”,
“compare my (ldl|hba1c|a1c|alt|ast|hdl|triglycerides|total cholesterol|fasting glucose)”,
“how is my health overall”.

Confirm the thread is AI-Doc:

Prefer threadType from request body.

If missing, look up by threadId in DB to get the thread type.

On match, return the new Snapshot/Compare markdown from this intercept (single message). Do not call legacy code.

Data Rules (to remove noise & wrong labels)

Group labs by YYYY-MM-DD.

De-dup inside each date:

First by (document_id, test) if available.

Then keep the latest value per canonical test name (LDL/LDL-C, HbA1c/A1c, ALT/SGPT, AST/SGOT, TG/Triglycerides, TC/Total Cholesterol, Fasting Glucose).

Status only when safe: compute high/low/normal only if reference ranges exist; otherwise set status: "unknown" and still show value + unit.

Snapshot format (markdown):

Header: ## Patient Snapshot

For each date (newest first): one-line mini summary (e.g., “Cholesterol high; liver enzymes high; glucose normal.”), then up to 6 inline chips like `LDL: 172.3 mg/dL (high)` and “+N more” if needed.

Compare format (markdown):

Header: ## Compare <Metric>

Chronological list of dates + values. If <2 values, include “Need ≥2 results to assess trend.”

Feature Flag & Safety Lever

Gate with AIDOC_FORCE_INTERCEPT=1 (on in Preview/Prod).

Add AIDOC_FORCE_INTERCEPT_HARD=1 (off by default). When set, intercept even if thread type cannot be resolved — use only for short-term verification.

No Fallthrough for These Intents

If unauthenticated → return a single friendly markdown line (“Please sign in to view your reports.”).

If no labs → return Snapshot header + friendly note.

Never fall back to the legacy paragraph block for these intents.

24-Hour Observability

Log once per intercepted request: flag state, resolved thread type, detected intent.

Remove logs after validation.

Acceptance Tests (must pass)

AI-Doc / Pull: “pull my reports” → One markdown message starting with ## Patient Snapshot.
No duplicate tests per date; mini summary + chips; content reflects real values.

AI-Doc / Compare: “compare my LDL” → ## Compare LDL list; if only one value, shows the “Need ≥2 results…” line.

AI-Doc / Overall: “how is my health overall” → Snapshot again (same clean format).

Negative Routing: In a non-AI-Doc thread, the same phrases do not trigger the Snapshot; behavior unchanged.

Content sanity on current data:

LDL 172.3 vs 161.9 → correct dates; no “vs itself” comparison.

ALT 219 vs 220 → treated as flat, not “↓”.

Vitamin D 48.7 ng/mL → not labeled low unless range says so (use “unknown” if no range).

Legacy block ban: For these intents, the legacy “packet & snapshot” paragraph and “What is your primary concern…” must never appear.
