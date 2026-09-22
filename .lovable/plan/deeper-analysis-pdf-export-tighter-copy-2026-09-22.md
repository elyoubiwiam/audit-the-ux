# Deeper analysis, PDF export, tighter copy

## 1. Tone of voice

Remove every em dash from visible copy and from the text the AI is told to produce. Rewrite the affected lines on the landing page, form page, results page, page titles and error messages so they read direct and professional: short sentences, plain verbs, no "unlock", "supercharge", "dive in", "in today's fast-paced world". Add the same rule to the analysis prompt so findings never come back with em dashes or filler phrasing.

Examples of the rewrite:
- "UX Audit — See what's persuading visitors on any landing page" becomes "UX Audit: what's persuading visitors on any landing page"
- "Three quick details — that's all we need to get started." becomes "Three quick details and we can start."
- "We couldn't reach that page — it timed out or refused our request." becomes "We couldn't reach that page. It timed out or refused the request."

## 2. Download the report as a PDF

Add a "Download PDF" button next to "Run another scan" on the results page. It opens the browser print dialog with a print-only stylesheet applied, so the saved file is a clean document rather than a screenshot of the app.

- Print styles hide the buttons, footer and background tints, force single-column cards, avoid page breaks inside a technique card, and print the URL and scan date in the header block.
- The suggested filename comes from the document title, which is set on the results page to a clean slug such as `ux-audit-calendly-com-2026-09-22`, derived from the scanned domain and the scan date.
- The report page keeps its own shareable URL: `/results?scan=<id>`.

## 3. Deeper analysis criteria

Expand the checklist from 8 to 13 categories, keeping the existing eight and adding:

- Cognitive load and friction
- Attention and visual hierarchy
- Commitment and consistency
- Reciprocity
- Loss aversion and framing

Each category gets a fuller definition in the prompt with concrete page-level cues, plus the underlying behavioural principle so explanations stay grounded (for example anchoring, the Zeigarnik effect, the endowment effect, social validation, processing fluency).

Each finding gains two short fields:
- `principle`: the psychology behind it, a few words (for example "Loss aversion", "Processing fluency")
- `evidence`: the exact phrase or element on the page that triggered the finding

Findings still carry title, category, explanation and the optional effectiveness note. The findings limit rises from 12 to 20.

## 4. Review pass

After the first analysis, a second model call reviews the draft findings against the page text and returns a cleaned list: drops anything not supported by the page, merges duplicates, corrects a wrong category, and tightens wording. Only the reviewed list is saved. If the review call fails, the first-pass findings are saved as-is so a scan never dies because of the extra step.

## 5. Results page

Show the new fields on each card: a small principle tag next to the technique name, and the quoted evidence line under the explanation. New categories get their own icon chips so grouping still scans at a glance.

## Technical notes

- `src/lib/audit.functions.ts`: extend `CATEGORIES`, add `principle` and `evidence` to the zod schema and `AuditFinding` type, rewrite the prompt, add a `review()` step using the same model and provider options (`openai/gpt-6-astra`, Responses API, streamed) wrapped in try/catch with fallback to the draft.
- Migration: add `principle text` and `evidence text` columns to `audit_findings` (nullable, so existing rows stay valid).
- `src/routes/results.tsx`: new icon map entries, principle tag, evidence line, `Download PDF` button calling `window.print()`, document title set to the clean slug.
- `src/styles.css`: an `@media print` block for the report layout.
- Fetching, robots handling, storage shape and the form flow stay as they are.
