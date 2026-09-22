import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BOT_UA = "UXAuditBot/1.0 (+https://uxaudit.lovable.app/about-bot)";

const AuditInput = z.object({
  url: z.string().trim().min(1).max(200),
  businessName: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(500),
});

export type AuditFinding = {
  id: string;
  title: string;
  severity: "low" | "medium" | "high";
  explanation: string;
};

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

/** Signals that survive tag-stripping but matter for dark patterns. */
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
  return { buttons, preCheckedInputs: checked, hasUrgencyMarkup: countdowns };
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
        severity: z.enum(["low", "medium", "high"]),
        explanation: z.string(),
      }),
    ),
  });

  const prompt = [
    `You are an ethical UX auditor. Review one webpage for UX problems and dark patterns.`,
    `Business: ${args.businessName}`,
    `Business description: ${args.description}`,
    `Page URL: ${args.url}`,
    ``,
    `Look specifically for: hidden costs, fake urgency or scarcity, forced continuity (hard-to-avoid subscriptions), confusing cancellation flows, missing trust signals (contact info, refund/privacy policies), manipulative language, pre-checked opt-ins, and misleading button copy.`,
    `Only report issues supported by the content below. If the page looks clean, return an empty findings list.`,
    `Write each explanation in plain language, max 2 sentences, no jargon. Keep titles under 60 characters. Return at most 12 findings. Keep the summary under 400 characters.`,
    ``,
    `Button and link labels: ${JSON.stringify(args.signals.buttons)}`,
    `Pre-checked checkboxes found: ${args.signals.preCheckedInputs.length}`,
    `Urgency-style markup detected: ${args.signals.hasUrgencyMarkup}`,
    ``,
    `Page text:`,
    args.pageText,
  ].join("\n");

  try {
    const result = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      output: Output.object({ schema }),
      prompt,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    const output = await result.output;
    return {
      summary: output.summary.slice(0, 1000),
      findings: output.findings.slice(0, 12).map((f) => ({
        title: f.title.slice(0, 120),
        severity: f.severity,
        explanation: f.explanation.slice(0, 600),
      })),
    };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      throw new Error("The analysis came back in an unexpected format. Please try again.");
    }
    throw error;
  }
}

export const runAudit = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AuditInput.parse(input))
  .handler(async ({ data }): Promise<AuditResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

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
      findings: { title: string; severity: "low" | "medium" | "high"; explanation: string }[],
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
        })
        .select("id, created_at")
        .single();
      if (error || !scan) throw new Error("We couldn't save this audit. Please try again.");

      let saved: AuditFinding[] = [];
      if (findings.length > 0) {
        const { data: rows, error: findingsError } = await supabaseAdmin
          .from("audit_findings")
          .insert(findings.map((f) => ({ ...f, scan_id: scan.id })))
          .select("id, title, severity, explanation");
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
        "This page can't be scanned: the site's robots.txt asks automated tools not to visit it.",
        null,
        [],
      );
    }

    let html: string;
    try {
      const res = await fetch(target.toString(), {
        headers: {
          "User-Agent": BOT_UA,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en,*",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) {
        return saveScan(
          "failed",
          `We couldn't load the page (the site responded with status ${res.status}). It may be blocking automated visitors.`,
          null,
          [],
        );
      }
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("html")) {
        return saveScan("failed", "That address doesn't return a web page we can review.", null, []);
      }
      html = (await res.text()).slice(0, 600000);
    } catch {
      return saveScan(
        "failed",
        "We couldn't reach that page — it timed out or refused our request.",
        null,
        [],
      );
    }

    const pageText = htmlToText(html).slice(0, 30000);
    if (pageText.length < 100) {
      return saveScan(
        "failed",
        "The page loaded but contained almost no readable text, so there was nothing to review.",
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
        url: target.toString(),
        apiKey,
      });
      return saveScan("completed", null, analysis.summary, analysis.findings);
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
      .select("id, title, severity, explanation")
      .eq("scan_id", scan.id)
      .order("severity", { ascending: false });

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
