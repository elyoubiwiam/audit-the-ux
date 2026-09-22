# UX Audit — Plan

A minimal, light web app that explains the service and collects the details needed to run an ethical UX audit. Real audit logic comes later; this round delivers the full flow with a simulated loading step.

## Pages

**Landing page (`/`)**
- Headline: "Get an ethical UX audit of your website"
- One short supporting sentence and a single call-to-action button leading to the form
- Light background, generous whitespace, one accent color, no clutter

**Audit form (`/audit`)**
- Three fields: Website URL, Business name, Business/industry description (short textarea)
- Basic validation: all fields required, URL must look like a URL
- On submit: button switches to a loading state ("Analyzing your site…") with a spinner, then after a short simulated delay navigates to the results page, passing the entered values along

**Results page (`/results`)**
- Friendly placeholder screen confirming the request was received, echoing the submitted URL and business name
- Clear note that the full ethical audit report is coming next, plus a link back to start a new audit

## Design

- Minimal, calm, UX-friendly: light background, one accent color used for buttons, links, and focus states only
- One clean typeface, generous spacing, rounded inputs with clear focus rings, readable font sizes
- Fully responsive; form centered and comfortable on mobile and desktop
- Semantic design tokens in `src/styles.css` — no hardcoded colors

## Technical details

- TanStack Start routes: `src/routes/index.tsx` (landing), `src/routes/audit.tsx` (form), `src/routes/results.tsx` (results)
- Form state passed to results via validated search params; direct visits to `/results` without data get a graceful empty state
- Loading state simulated with a short timeout in the submit handler (to be replaced by the real audit call next round)
- Each route gets its own head() metadata (title, description, og tags)
- No backend or database in this round
