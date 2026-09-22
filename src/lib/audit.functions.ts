import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BOT_UA = "UXAuditBot/1.0 (+https://uxaudit.lovable.app/about-bot)";

const AuditInput = z.object({
  url: z.string().trim().min(1).max(2000),
  businessName: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(500),
});

export const CATEGORIES = [
  "Urgency & scarcity",
  "Social proof",
  "Authority & trust",
  "Risk reversal",
  "Anchoring & pricing psychology",
  "CTA design & friction reduction",
  "Storytelling & emotional framing",
  "Personalization & specificity",
  "Cognitive load & friction",
  "Attention & visual hierarchy",
  "Commitment & consistency",
  "Reciprocity",
  "Loss aversion & framing",
] as const;

export type AuditFinding = {
  id: string;
  title: string;
  category: (typeof CATEGORIES)[number];
  explanation: string;
  note: string | null;
  principle: string | null;
  evidence: string | null;
};

type DraftFinding = Omit<AuditFinding, "id">;

export type AuditResult = {
  scanId: string;
  status: "completed" | "blocked" | "failed";
  message: string | null;
  summary: string | null;
  businessName: string;
  url: string;
  createdAt: string;
  findings: AuditFinding[];
};

function normalizeUrl(input: string) {
  const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  return new URL(withScheme);
}

/** Minimal robots.txt check for our own user-agent (and *). */
async function isAllowedByRobots(target: URL): Promise<boolean> {
  try {
    const res = await fetch(new URL("/robots.txt", target.origin).toString(), {
      headers: { "User-Agent": BOT_UA },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return true; // no robots.txt => allowed
    const text = (await res.text()).slice(0, 200000);

    const groups: { agents: string[]; rules: { allow: boolean; path: string }[] }[] = [];
    let current: (typeof groups)[number] | null = null;
    let lastWasAgent = false;

    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.split("#")[0]!.trim();
      if (!line) continue;
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const field = line.slice(0, idx).trim().toLowerCase();
      const value = line.slice(idx + 1).trim();

      if (field === "user-agent") {
        if (!current || !lastWasAgent) {
          current = { agents: [], rules: [] };
          groups.push(current);
        }
        current.agents.push(value.toLowerCase());
        lastWasAgent = true;
      } else if (field === "disallow" || field === "allow") {
        if (!current) continue;
        lastWasAgent = false;
        current.rules.push({ allow: field === "allow", path: value });
      }
    }

    const botName = "uxauditbot";
    const specific = groups.find((g) => g.agents.includes(botName));
    const wildcard = groups.find((g) => g.agents.includes("*"));
    const group = specific ?? wildcard;
    if (!group) return true;

    const path = target.pathname + target.search;
    let best: { allow: boolean; length: number } | null = null;
    for (const rule of group.rules) {
      if (rule.path === "") continue; // empty Disallow means allow all
      const prefix = rule.path.replace(/\*$/, "");
      if (path.startsWith(prefix)) {
        if (!best || prefix.length > best.length) {
          best = { allow: rule.allow, length: prefix.length };
        }
      }
    }
    return best ? best.allow : true;
  } catch {
    return true; // robots unreachable => proceed
  }
}

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Signals that survive tag-stripping but matter for persuasion analysis. */
function extractSignals(html: string) {
  const buttons = [...html.matchAll(/<(button|a)\b[^>]*>([\s\S]{0,120}?)<\/\1>/gi)]
    .map((m) => htmlToText(m[2] ?? ""))
    .filter((t) => t.length > 0 && t.length < 80)
    .slice(0, 60);
  const checked = [...html.matchAll(/<input\b[^>]*type=["']?checkbox["']?[^>]*>/gi)]
    .filter((m) => /\bchecked\b/i.test(m[0]))
    .slice(0, 20)
    .map((m) => m[0]);
  const countdowns = /countdown|timer|expires? in|only \d+ left|hurry|ends soon/i.test(html);
  const headings = [...html.matchAll(/<h([1-3])\b[^>]*>([\s\S]{0,200}?)<\/h\1>/gi)]
    .map((m) => htmlToText(m[2] ?? ""))
    .filter((t) => t.length > 0)
    .slice(0, 30);
  const formFields = (html.match(/<input\b(?![^>]*type=["']?hidden)/gi) ?? []).length;
  return {
    buttons,
    headings,
    formFields,
    preCheckedInputs: checked,
    hasUrgencyMarkup: countdowns,
  };
}

/**
 * Text that survives on JS-rendered pages: title, meta/OG tags, JSON-LD,
 * noscript blocks, image alt text, aria labels, headings and button copy.
 */
function extractFallbackText(html: string) {
  const parts: string[] = [];

  const title = html.match(/<title\b[^>]*>([\s\S]{0,300}?)<\/title>/i);
  if (title) parts.push(htmlToText(title[1] ?? ""));

  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0];
    if (!/name=["']?(description|twitter:[\w:-]+)|property=["']?og:[\w:-]+/i.test(tag)) continue;
    const content = tag.match(/content=["']([\s\S]*?)["']/i);
    if (content?.[1]) parts.push(htmlToText(content[1]));
  }

  for (const m of html.matchAll(
    /<script\b[^>]*type=["']application\/(ld\+json|json)["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    const raw = m[2] ?? "";
    for (const s of raw.matchAll(/"(?:[^"\\]|\\.){3,300}"/g)) {
      const v = s[0].slice(1, -1);
      if (/[a-zA-Z]{3,}\s/.test(v) && !/^https?:|^\//.test(v)) parts.push(v);
    }
  }

  for (const m of html.matchAll(/<noscript\b[^>]*>([\s\S]*?)<\/noscript>/gi)) {
    parts.push(htmlToText(m[1] ?? ""));
  }

  for (const m of html.matchAll(/\b(alt|aria-label|placeholder|title)=["']([^"']{3,200})["']/gi)) {
    parts.push(htmlToText(m[2] ?? ""));
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const t = p.trim();
    if (t.length < 3 || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out.join(". ");
}

/** Combines visible text with fallback sources so JS-heavy pages still get reviewed. */
function buildPageText(html: string) {
  const visible = htmlToText(html);
  const signals = extractSignals(html);
  const extras = [
    extractFallbackText(html),
    signals.headings.join(". "),
    signals.buttons.join(". "),
  ]
    .filter(Boolean)
    .join(". ");

  if (visible.length >= 400) {
    return `${visible}\n\nPage metadata, headings and button labels: ${extras}`.slice(0, 30000);
  }
  return [visible, extras].filter(Boolean).join("\n\n").slice(0, 30000);
}

function stripDashes(text: string) {
  return text.replace(/\s*[—–]\s*/g, ", ");
}

const CHECKLIST = [
  `1. Urgency & scarcity: countdown timers, limited stock or spots, time-limited offers. Principle: scarcity, fear of missing out.`,
  `2. Social proof: testimonials, review counts, customer logos, usage stats, "X people bought this". Principle: social validation, herd behaviour.`,
  `3. Authority & trust: certifications, media mentions, expert endorsements, security badges, named leadership. Principle: authority bias.`,
  `4. Risk reversal: money-back guarantees, free trials, "cancel anytime", no credit card required. Principle: perceived-risk reduction.`,
  `5. Anchoring & pricing psychology: crossed-out prices, "most popular" plan, decoy tiers, per-month framing, charm pricing. Principle: anchoring, the decoy effect.`,
  `6. CTA design & friction reduction: button copy, repetition, placement, contrast, implied number of steps, single-field forms. Principle: processing fluency, reduced activation energy.`,
  `7. Storytelling & emotional framing: problem-agitation-solution structure, before and after framing, aspirational or identity language. Principle: narrative transportation, self-identity.`,
  `8. Personalization & specificity: tailored-feeling copy, named use cases, role or industry segmentation, concrete numbers. Principle: self-reference effect, concreteness.`,
  `9. Cognitive load & friction: how much thinking the page asks for. Amount of copy per screen, jargon, number of choices offered, form length, clarity of the next step. Principle: cognitive load, choice overload, Hick's law.`,
  `10. Attention & visual hierarchy: what the page pushes you to look at first. Hero dominance, one primary action versus competing links, ordering of sections, contrast of the main CTA. Principle: visual salience, serial position effect.`,
  `11. Commitment & consistency: small first asks that lead to bigger ones. Multi-step signup, quizzes, progress indicators, "start free then upgrade". Principle: foot in the door, the Zeigarnik effect.`,
  `12. Reciprocity: something given before anything is asked. Free tools, templates, guides, calculators, open pricing, generous free tier. Principle: reciprocity norm.`,
  `13. Loss aversion & framing: what you lose by not acting, negative framing, "stop wasting", "don't lose", cost-of-inaction maths, endowment through trials. Principle: loss aversion, framing effect, the endowment effect.`,
].join("\n");

const STYLE_RULES = [
  `Write like an experienced practitioner talking to a colleague. Direct, concrete, professional.`,
  `Never use em dashes or en dashes. Use full stops, commas or colons.`,
  `No filler openers, no hype words such as unlock, supercharge, elevate, seamless, game-changing, in today's fast-paced world.`,
  `No hedging padding such as "it is worth noting that". Say the thing.`,
];

function buildAnalysisPrompt(args: {
  pageText: string;
  signals: ReturnType<typeof extractSignals>;
  businessName: string;
  description: string;
  url: string;
}) {
  return [
    `You are a conversion and UX analyst with a background in behavioural science and cyberpsychology. Review one landing page and identify which persuasion and user-experience techniques it uses. This is a descriptive "what makes this page convincing" analysis, not a risk or dark-pattern audit.`,
    `Business: ${args.businessName}`,
    `Business description: ${args.description}`,
    `Page URL: ${args.url}`,
    ``,
    `Use ONLY these categories. The "category" value must match one of them exactly:`,
    CHECKLIST,
    ``,
    `For each technique found on this page, return:`,
    `- title: the technique as used here, under 60 characters.`,
    `- category: exactly one of the categories above.`,
    `- principle: the behavioural or cognitive principle behind it, 1 to 4 words, for example "Loss aversion", "Processing fluency", "Authority bias".`,
    `- evidence: the exact phrase, label or element from the page that triggered this finding, under 140 characters. Quote the page, do not paraphrase.`,
    `- explanation: how it works on this page and what effect it has on the visitor. Max 2 sentences, plain language.`,
    `- note: one sentence on how well executed it is, or null if there is nothing useful to add.`,
    ``,
    ...STYLE_RULES.map((r) => `Style: ${r}`),
    ``,
    `You can only see this one landing page. Never comment on or assume anything about checkout, billing or cancellation flows.`,
    `Only report techniques you can point to in the content below. If the page uses none of them, return an empty findings list.`,
    `Return at most 20 findings. Keep the summary under 400 characters: one or two sentences on the page's overall persuasion strategy.`,
    ``,
    `Button and link labels: ${JSON.stringify(args.signals.buttons)}`,
    `Headings: ${JSON.stringify(args.signals.headings)}`,
    `Visible form fields: ${args.signals.formFields}`,
    `Pre-checked checkboxes found: ${args.signals.preCheckedInputs.length}`,
    `Urgency-style markup detected: ${args.signals.hasUrgencyMarkup}`,
    ``,
    `Page text:`,
    args.pageText,
  ].join("\n");
}

function buildReviewPrompt(args: {
  pageText: string;
  url: string;
  businessName: string;
  draft: { summary: string; findings: DraftFinding[] };
}) {
  return [
    `You are reviewing a draft persuasion analysis of one landing page before it is shown to a client. Be strict.`,
    `Business: ${args.businessName}`,
    `Page URL: ${args.url}`,
    ``,
    `Do all of the following:`,
    `1. Remove any finding whose evidence does not appear in the page content below, or that is speculation about checkout, billing or cancellation.`,
    `2. Merge findings that describe the same technique, keeping the strongest evidence.`,
    `3. Correct the category when it is wrong, and the principle when it is imprecise. Categories must stay within this list:`,
    CHECKLIST,
    `4. Tighten every explanation to at most 2 sentences and make sure the evidence quotes the page.`,
    `5. Rewrite the summary if it overstates what is on the page.`,
    ``,
    ...STYLE_RULES.map((r) => `Style: ${r}`),
    ``,
    `Return the cleaned summary and findings in the same shape. Keep at most 20 findings, ordered by how much they shape the visitor's decision.`,
    ``,
    `Draft analysis:`,
    JSON.stringify(args.draft),
    ``,
    `Page text:`,
    args.pageText,
  ].join("\n");
}

async function analyze(args: {
  pageText: string;
  signals: ReturnType<typeof extractSignals>;
  businessName: string;
  description: string;
  url: string;
  apiKey: string;
}) {
  const { createOpenAI } = await import("@ai-sdk/openai");
  const { streamText, Output, NoObjectGeneratedError } = await import("ai");

  const lovable = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: args.apiKey,
    headers: {
      "Lovable-API-Key": args.apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });

  const schema = z.object({
    summary: z.string(),
    findings: z.array(
      z.object({
        title: z.string(),
        category: z.enum(CATEGORIES),
        principle: z.string().nullable(),
        evidence: z.string().nullable(),
        explanation: z.string(),
        note: z.string().nullable(),
      }),
    ),
  });

  const providerOptions = {
    openai: {
      forceReasoning: true,
      reasoningEffort: "low",
      reasoningSummary: "auto",
      store: false,
      include: ["reasoning.encrypted_content"],
    },
  } as const;

  const run = async (prompt: string) => {
    const result = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      output: Output.object({ schema }),
      prompt,
      providerOptions,
    });
    return await result.output;
  };

  const clean = (output: z.infer<typeof schema>) => ({
    summary: stripDashes(output.summary).slice(0, 1000),
    findings: output.findings.slice(0, 20).map<DraftFinding>((f) => ({
      title: stripDashes(f.title).slice(0, 120),
      category: f.category,
      principle: f.principle ? stripDashes(f.principle).slice(0, 60) : null,
      evidence: f.evidence ? stripDashes(f.evidence).slice(0, 200) : null,
      explanation: stripDashes(f.explanation).slice(0, 600),
      note: f.note ? stripDashes(f.note).slice(0, 300) : null,
    })),
  });

  let draft: ReturnType<typeof clean>;
  try {
    draft = clean(await run(buildAnalysisPrompt(args)));
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      throw new Error("The analysis came back in an unexpected format. Please try again.");
    }
    throw error;
  }

  if (draft.findings.length === 0) return draft;

  // Review pass. If it fails for any reason, keep the first-pass result.
  try {
    const reviewed = clean(
      await run(
        buildReviewPrompt({
          pageText: args.pageText,
          url: args.url,
          businessName: args.businessName,
          draft,
        }),
      ),
    );
    return reviewed.findings.length > 0 ? reviewed : draft;
  } catch {
    return draft;
  }
}

export const DAILY_AUDIT_LIMIT = 3;

async function getClientKey(): Promise<string> {
  const { getRequest } = await import("@tanstack/react-start/server");
  const request = getRequest();
  const headers = request?.headers;
  const ip =
    headers?.get("cf-connecting-ip") ??
    headers?.get("x-real-ip") ??
    headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const data = new TextEncoder().encode(`ux-audit:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const runAudit = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AuditInput.parse(input))
  .handler(async ({ data }): Promise<AuditResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const clientKey = await getClientKey();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("audit_scans")
      .select("id", { count: "exact", head: true })
      .eq("client_key", clientKey)
      .gte("created_at", since);
    if ((count ?? 0) >= DAILY_AUDIT_LIMIT) {
      throw new Error(
        `You've used all ${DAILY_AUDIT_LIMIT} audits for today. Please come back tomorrow.`,
      );
    }


    let target: URL;
    try {
      target = normalizeUrl(data.url);
      if (!/^https?:$/.test(target.protocol)) throw new Error("bad protocol");
    } catch {
      throw new Error("That doesn't look like a valid website address.");
    }

    const saveScan = async (
      status: "completed" | "blocked" | "failed",
      message: string | null,
      summary: string | null,
      findings: DraftFinding[],
    ): Promise<AuditResult> => {
      const { data: scan, error } = await supabaseAdmin
        .from("audit_scans")
        .insert({
          business_name: data.businessName,
          business_description: data.description,
          url: target.toString(),
          status,
          message,
          summary,
          client_key: clientKey,
        })
        .select("id, created_at")
        .single();
      if (error || !scan) throw new Error("We couldn't save this audit. Please try again.");

      let saved: AuditFinding[] = [];
      if (findings.length > 0) {
        const { data: rows, error: findingsError } = await supabaseAdmin
          .from("audit_findings")
          .insert(findings.map((f) => ({ ...f, scan_id: scan.id })))
          .select("id, title, category, explanation, note, principle, evidence");
        if (findingsError) throw new Error("We couldn't save the audit findings.");
        saved = (rows ?? []) as AuditFinding[];
      }

      return {
        scanId: scan.id,
        status,
        message,
        summary,
        businessName: data.businessName,
        url: target.toString(),
        createdAt: scan.created_at,
        findings: saved,
      };
    };

    if (!(await isAllowedByRobots(target))) {
      return saveScan(
        "blocked",
        "This page can't be scanned. The site's robots.txt asks automated tools not to visit it.",
        null,
        [],
      );
    }

    const DESKTOP_UA =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
    const MOBILE_UA =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

    const browserHeaders = (ua: string, origin: string) => ({
      "User-Agent": ua,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Upgrade-Insecure-Requests": "1",
      "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      "sec-ch-ua-mobile": ua === MOBILE_UA ? "?1" : "?0",
      "sec-ch-ua-platform": ua === MOBILE_UA ? '"iOS"' : '"macOS"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
      Referer: `${origin}/`,
      Referrer: `${origin}/`,
      "Cache-Control": "max-age=0",
    });

    type Attempt = {
      ok: boolean;
      status: number;
      contentType: string;
      body: string;
      isText?: boolean;
    };

    const fetchAs = async (url: string, ua: string, origin: string): Promise<Attempt> => {
      const res = await fetch(url, {
        headers: browserHeaders(ua, origin),
        redirect: "follow",
        signal: AbortSignal.timeout(25000),
      });
      return {
        ok: res.ok,
        status: res.status,
        contentType: res.headers.get("content-type") ?? "",
        body: (await res.text()).slice(0, 600000),
      };
    };

    const readerFetch = async (url: string): Promise<Attempt> => {
      // Cache-busting param: the shared reader cache returns 403 for repeat hits.
      const sep = url.includes("?") ? "&" : "?";
      const res = await fetch(`https://r.jina.ai/${url}${sep}uxa=${Date.now()}`, {
        headers: { "User-Agent": DESKTOP_UA, Accept: "text/plain,*/*" },
        redirect: "follow",
        signal: AbortSignal.timeout(25000),
      });
      return {
        ok: res.ok,
        status: res.status,
        contentType: res.headers.get("content-type") ?? "",
        body: (await res.text()).slice(0, 600000),
        isText: true,
      };
    };

    const origin = target.origin;
    const pageUrl = target.toString();
    const isDeepLink = target.pathname !== "/" || !!target.search;

    const strategies: { label: string; homepage?: boolean; run: () => Promise<Attempt> }[] = [
      { label: "desktop", run: () => fetchAs(pageUrl, DESKTOP_UA, origin) },
      { label: "mobile", run: () => fetchAs(pageUrl, MOBILE_UA, origin) },
      { label: "reader", run: () => readerFetch(pageUrl) },
      ...(isDeepLink
        ? [
            {
              label: "homepage",
              homepage: true,
              run: () => fetchAs(`${origin}/`, DESKTOP_UA, origin),
            },
          ]
        : []),
    ];

    let html = "";
    let pageText = "";
    let usedHomepage = false;
    let lastStatus: number | null = null;
    let refused = false;
    let lastError = false;
    let nonHtml = false;
    let gotAny = false;

    for (const [index, strategy] of strategies.entries()) {
      if (index > 0) await new Promise((r) => setTimeout(r, 400));
      try {
        const result = await strategy.run();
        lastStatus = result.status;
        if (!result.ok) {
          if (result.status === 403 || result.status === 429 || result.status === 401) {
            refused = true;
          }
          continue;
        }
        if (
          !result.isText &&
          result.contentType &&
          !/html|xml|text\/plain/i.test(result.contentType)
        ) {
          nonHtml = true;
          continue;
        }
        gotAny = true;
        const candidate = result.isText ? result.body.trim() : buildPageText(result.body);
        if (candidate.length > pageText.length) {
          html = result.isText ? "" : result.body;
          pageText = candidate;
          usedHomepage = !!strategy.homepage;
        }
        if (pageText.length >= 400) break;
      } catch {
        lastError = true;
      }
    }

    if (!gotAny) {
      if (nonHtml && !refused) {
        return saveScan(
          "failed",
          "That address doesn't return a web page we can review.",
          null,
          [],
        );
      }
      if (refused) {
        return saveScan(
          "failed",
          "The site refused our request. It blocks visitors it doesn't recognise, so try another page on the same site.",
          null,
          [],
        );
      }
      if (lastStatus && !lastError) {
        return saveScan(
          "failed",
          `We couldn't load the page. The site responded with status ${lastStatus}.`,
          null,
          [],
        );
      }
      return saveScan(
        "failed",
        "We couldn't reach that page. It timed out or refused the request.",
        null,
        [],
      );
    }

    if (pageText.length < 40) {
      return saveScan(
        "failed",
        "The page loaded but returned no readable content, most likely because it renders entirely in the browser and blocks direct requests.",
        null,
        [],
      );
    }


    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("The analysis service isn't configured yet.");

    try {
      const analysis = await analyze({
        pageText,
        signals: extractSignals(html),
        businessName: data.businessName,
        description: data.description,
        url: usedHomepage ? `${origin}/` : target.toString(),
        apiKey,
      });
      const summary = usedHomepage
        ? `The page you entered refused our request, so this report covers the home page at ${origin}. ${analysis.summary ?? ""}`.trim()
        : analysis.summary;
      return saveScan("completed", null, summary, analysis.findings);

    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      const rateLimited = /429|rate/i.test(raw);
      const noCredits = /402|credit/i.test(raw);
      return saveScan(
        "failed",
        rateLimited
          ? "The analysis service is busy right now. Please try again in a moment."
          : noCredits
            ? "The analysis service is out of credits. Please top up and try again."
            : "The analysis couldn't be completed. Please try again.",
        null,
        [],
      );
    }
  });

export const getAudit = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ scanId: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<AuditResult | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: scan } = await supabaseAdmin
      .from("audit_scans")
      .select("id, business_name, url, status, message, summary, created_at")
      .eq("id", data.scanId)
      .maybeSingle();
    if (!scan) return null;

    const { data: findings } = await supabaseAdmin
      .from("audit_findings")
      .select("id, title, category, explanation, note, principle, evidence")
      .eq("scan_id", scan.id)
      .order("created_at", { ascending: true });

    return {
      scanId: scan.id,
      status: scan.status,
      message: scan.message,
      summary: scan.summary,
      businessName: scan.business_name,
      url: scan.url,
      createdAt: scan.created_at,
      findings: (findings ?? []) as AuditFinding[],
    };
  });
