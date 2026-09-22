# Getting past sites that refuse the scanner

Some sites answer our request with "403 Forbidden" because they can tell it is not a
person in a browser. Today we try two variations and then give up with an error.
This plan adds several more ways in, so a refusal only ends the scan once every
option has failed.

## What changes for you

- Far fewer "may be blocking automated visitors" errors.
- When a site still refuses, the message says so plainly and suggests trying a
  different page on the same site.
- We keep respecting robots.txt. If a site formally asks automated tools to stay
  away, we still stop. This plan is only about sites that block silently while
  their rules allow the visit.

## How we get in

Tried in order, stopping at the first one that returns real page text:

1. A request that looks exactly like a normal browser: full Chrome user agent with
   no bot suffix, plus the headers real browsers always send (sec-ch-ua,
   Sec-Fetch-*, Upgrade-Insecure-Requests, Accept-Encoding, a matching Referer of
   the site's own home page).
2. The same request as a mobile Safari browser, which many bot filters treat more
   leniently.
3. The site's own shareable version: the plain-text reader endpoint (r.jina.ai),
   which fetches and renders the page for us and also solves the "page builds
   itself in the browser" problem.
4. Last resort for a 403 on a deep link: the site's home page, so the report is
   still about that business rather than nothing at all, with a note in the report
   saying which page was actually read.

Between attempts we pause briefly, and a 403 or 429 no longer stops the loop.

## Technical notes

All changes are in `src/lib/audit.functions.ts`, inside the fetch section of
`runAudit`. No database or UI changes.

- Replace the two-item `[BOT_UA, BROWSER_UA]` loop with an ordered list of
  strategies, each `{ label, run() }` returning `{ ok, status, contentType, body }`.
- Drop the `UXAuditBot/1.0` suffix from the browser user agent strings; keep
  `BOT_UA` for the robots.txt lookup only, so our robots compliance stays honest.
- Add the browser header set above; send `Referer: <origin>/` and
  `redirect: "follow"`.
- Reader fallback: `https://r.jina.ai/<encoded url>`, 25s timeout, treat the
  returned markdown as page text directly (skip `buildPageText` HTML stripping).
- Track the best candidate by extracted text length as today; break at >= 400
  characters.
- Keep the existing content-type guard, but only reject non-HTML when a strategy
  actually returned 200.
- Failure copy: distinguish 403/429 ("the site refused our request") from other
  statuses and from timeouts.
