# Refine the audit analysis prompt

Rewrite only the AI analysis prompt inside the existing audit server function (`src/lib/audit.functions.ts`, `analyzePage`). Fetching, robots.txt checks, storage, and the UI stay untouched.

## What changes

Replace the current open-ended dark-pattern guidance with the user's fixed checklist and severity rubric:

**Checklist (the only categories allowed)**
- Fake urgency: countdown timers, "X left in stock," "X people viewing" with no evidence
- Missing trust signals: no privacy policy link, contact info, business identity, or terms
- Manipulative language: guilt-trip opt-out copy, fake scarcity, CTA labels that don't match their action
- Pre-checked opt-ins: any checkbox pre-selected by default (newsletter, marketing consent)
- Disguised ads: sponsored content styled as organic content or navigation
- Misleading claims: unsubstantiated testimonials, trust badges, stats, or fake certification styling
- Confusing CTAs: prominent "yes" with hidden/greyed/tiny "no"

**Severity rubric (explicit in the prompt)**
- High: actively misleads about something material (fake claims driving a decision, deceptive CTA design)
- Medium: pressures or nudges unfairly but isn't false (guilt-trip copy, pre-checked non-financial opt-ins)
- Low: minor/borderline pattern, debatable vs. standard marketing

**Landing-page scope guardrails**
- Instruct the AI to flag only patterns from this list — no new categories.
- Explicitly forbid flagging or assuming anything about checkout, billing, or cancellation flows, since only the landing page is visible.

## Technical details

- Single edit: the `prompt` array in `analyzePage` (src/lib/audit.functions.ts, ~line 156).
- Keep everything else: the zod output schema (`summary` + `findings[{title, severity, explanation}]`), the page signals passed in (button labels, pre-checked checkbox count, urgency markup), the existing length limits (≤12 findings, title <60 chars, explanation ≤2 sentences, summary <400 chars), and the truncation logic.
- Keep `openai/gpt-6-astra` on the Responses API with the current provider options unchanged.
- Verify: run one real audit through the form (example.com as a clean control), confirm the build is OK and the report renders.
