# UX Audit — landing, intake form, placeholder results

## What you'll get

Three pages on a light, quiet design (the "Frosted report" direction: near-white background, one steel-blue accent, Inter with a monospace voice for labels):

1. **`/` — landing.** Headline "Get an ethical UX audit of your website", a two-line explainer, a small frosted panel listing the three things an audit checks (consent & privacy, honest pricing, fair engagement), and one button: "Request your audit".
2. **`/audit` — the form.** Three fields only: website URL, business name, a short description of what you do. Mistakes are called out under the field in question, not in a popup.
3. **`/results` — placeholder report.** After a short loading state, you land here. It shows the business name, site, and industry you entered, with the audit sections listed and each marked "Pending", plus a line saying findings will appear once the live audit is wired up. A "Start another audit" link returns you to the form.

Nothing is saved to a database — there's no account, no storage. Your three answers travel to the results page through the address bar, which is why they're visible there; that handoff gets replaced when the real audit logic is added.

## Layout of the app

```text
/          landing: eyebrow, headline, explainer, checks panel, one CTA
/audit     intake form + loading state -> navigates to /results
/results   report header (business, site, industry) + pending sections
```

A single shared shell wraps all three: a slim sticky header (the "U" mark, the words "UX Audit", and a "Start audit" link) and a minimal one-line footer ("No data stored"). No nav bar with link columns, no extra sections.

## Technical details

**Routes** (TanStack Start, file-based)
- `src/routes/__root.tsx` — holds the header/footer shell around `<Outlet />`, loads the fonts by `<link>`, carries site-wide metadata.
- `src/routes/index.tsx` — landing, replacing the placeholder.
- `src/routes/audit.tsx` — form.
- `src/routes/results.tsx` — placeholder report, with `validateSearch` so the page can't be opened with junk or missing values (redirects to `/audit` if so).

**Handoff between pages.** The form submits into search params on the results route: `/results?site=…&business=…&industry=…`, parsed once with a shared zod schema (`src/lib/audit-schema.ts`) used both by the form and by `validateSearch`. No state library, no persistence layer.

**Validation** (zod + react-hook-form, both already installed)
- URL: required, must parse as a web address; a bare `mysite.com` is normalised to `https://mysite.com` before submitting. Max 200 chars.
- Business name: required, max 120 chars.
- Description: required, min 10 / max 500 chars, with a quiet character count.
- Errors render inline with `aria-invalid` and `aria-describedby`; the submit button is inert while a field is invalid.

**Loading state.** On a valid submit the button disables and swaps to "Auditing your site…" with a thin accent progress bar (`role="status"`, ~1.4s), then `navigate()` to `/results`. The delay is a placeholder for the real audit call.

**Design tokens.** The chosen direction's values move into `src/styles.css` in the project's existing oklch format (`:root` values plus the `@theme inline` map already in place), so `bg-primary`, `text-muted-foreground`, `border-border` etc. all resolve to the new palette: background `oklch(0.985 0.006 236)`, foreground `oklch(0.21 0.02 250)`, muted `oklch(0.55 0.02 250)`, primary `oklch(0.52 0.06 240)`, primary-foreground `oklch(0.99 0.004 235)`, border `oklch(0.21 0.02 250 / 0.1)`. Components use only these semantic tokens — no hardcoded color classes. Inter (400–800) and JetBrains Mono (400/500) load via a `<link>` in the root route head.

**Motion.** One subtle fade-and-rise per page load, the progress bar during loading, nothing looping; all of it suppressed under `prefers-reduced-motion`.

**Metadata.** Each route gets its own `head()` with a distinct title, description, and og tags (e.g. "Request a UX audit — UX Audit", "Your ethical UX audit report — UX Audit"). No stock imagery or generated illustrations.

## Verification

After the edits: check `/tmp/observability/build-errors.log` is clean, then drive the flow in a browser — land on `/`, click through to the form, submit an invalid URL to confirm the inline error, submit a valid one to confirm the loading state and arrival on `/results` showing the entered details — with screenshots of each step.

## Open for later (not in this pass)

- The real audit: fetching the site, the checks themselves, and scores replacing "Pending".
- Storing audits or email delivery, if you want results to survive a refresh or be sent to the user.
