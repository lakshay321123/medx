// HARDENED: blocks SSRF to private/loopback/link-local, validates redirects, only http/https.
import { NextRequest, NextResponse } from "next/server";
import { lookup } from "dns/promises";
import net from "node:net";

export const runtime = "nodejs";

const TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;
const ALLOWED_PORTS = new Set([80, 443]);

// Optional allowlist (keep empty to allow all public)
const ALLOW_HOSTS = new Set<string>([
  // "www.cdc.gov", "www.nih.gov"
]);

/** RFC1918 / special ranges checks */
function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const n = ip.split(".").map(Number);
    const v = (n[0] << 24) | (n[1] << 16) | (n[2] << 8) | n[3];
    const inRange = (base: number, mask: number) => (v & mask) === base;
    return (
      inRange(0x0a000000, 0xff000000) || // 10.0.0.0/8
      inRange(0xac100000, 0xfff00000) || // 172.16.0.0/12
      inRange(0xc0a80000, 0xffff0000) || // 192.168.0.0/16
      inRange(0x7f000000, 0xff000000) || // 127.0.0.0/8 (loopback)
      inRange(0xa9fe0000, 0xffff0000) || // 169.254.0.0/16 (link-local)
      inRange(0x64400000, 0xffc00000) || // 100.64.0.0/10 (CGNAT)
      inRange(0xc0000000, 0xffffff00) // 192.0.0.0/24 (IETF)
    );
  }
  // IPv6: block unique-local, loopback, link-local, multicast
  if (net.isIPv6(ip)) {
    const s = ip.toLowerCase();
    return (
      s.startsWith("fc") ||
      s.startsWith("fd") || // unique local fc00::/7
      s === "::1" || // loopback
      s.startsWith("fe80:") || // link-local
      s.startsWith("ff") // multicast
    );
  }
  return true; // unknown → treat as unsafe
}

function isPublicHttpUrl(u: URL): string | null {
  const proto = u.protocol.replace(":", "");
  if (!(proto === "http" || proto === "https")) return "Only http/https allowed";
  if (!u.hostname) return "Missing hostname";
  if (u.hostname === "localhost") return "localhost blocked";
  if (/\.(local|internal|intra|corp|lan|home)$/i.test(u.hostname)) return "private TLD blocked";

  const port = u.port ? Number(u.port) : proto === "http" ? 80 : 443;
  if (!ALLOWED_PORTS.has(port)) return "Port not allowed";

  if (ALLOW_HOSTS.size && !ALLOW_HOSTS.has(u.hostname.toLowerCase())) {
    return "Host not on allowlist";
  }
  return null;
}

async function assertResolvesToPublicIp(hostname: string): Promise<string | null> {
  // Resolve all A/AAAA and make sure none are private/special
  try {
    const addrs = await lookup(hostname, { all: true });
    if (!addrs.length) return "DNS resolution failed";
    for (const a of addrs) {
      if (isPrivateAddress(a.address)) return "Resolved to private/special IP";
    }
    return null;
  } catch {
    return "DNS lookup failed";
  }
}

async function fetchSafe(u0: URL) {
  // Manually follow redirects and validate each hop
  let u = u0;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      let res = await fetch(u, {
        method: "HEAD",
        redirect: "manual",
        signal: ctrl.signal,
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) return { ok: false, status: res.status, finalUrl: u.toString() };
        const next = new URL(loc, u);
        const protoErr = isPublicHttpUrl(next);
        if (protoErr) return { ok: false, status: 0, finalUrl: next.toString(), reason: protoErr };
        const ipErr = await assertResolvesToPublicIp(next.hostname);
        if (ipErr) return { ok: false, status: 0, finalUrl: next.toString(), reason: ipErr };
        u = next;
        continue; // loop to follow next redirect hop
      }
      if (!res.ok || res.status >= 400) {
        // Some sites reject HEAD; try a tiny GET
        res = await fetch(u, {
          method: "GET",
          redirect: "manual",
          headers: { Range: "bytes=0-64" },
          signal: ctrl.signal,
        });
      }
      return { ok: res.ok, status: res.status, finalUrl: u.toString() };
    } catch {
      return { ok: false, status: 0, finalUrl: u.toString(), reason: "Request failed" };
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, status: 0, finalUrl: u.toString(), reason: "Too many redirects" };
}

function rewriteIfNeeded(u: string): string {
  // Known-bad → good
  if (
    u === "https://www.cms.gov/medicare/coding/place-of-service-codes/place-service-code-set" ||
    u === "http://www.cms.gov/medicare/coding/place-of-service-codes/place-service-code-set"
  ) {
    return "https://www.cms.gov/medicare/coding-billing/place-of-service-codes/code-sets";
  }
  return u;
}

export async function POST(req: NextRequest) {
  const { url } = await req.json().catch(() => ({}));
  if (!url || typeof url !== "string") {
    return NextResponse.json({ ok: false, status: 400, reason: "Bad request" }, { status: 400 });
  }
  let href = url.trim();
  if (/^www\./i.test(href)) href = "https://" + href;

  href = rewriteIfNeeded(href);

  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return NextResponse.json({ ok: false, status: 0, reason: "Invalid URL" }, { status: 200 });
  }

  const protoErr = isPublicHttpUrl(u);
  if (protoErr) {
    return NextResponse.json({ ok: false, status: 0, reason: protoErr }, { status: 200 });
  }

  const ipErr = await assertResolvesToPublicIp(u.hostname);
  if (ipErr) {
    return NextResponse.json({ ok: false, status: 0, reason: ipErr }, { status: 200 });
  }

  const result = await fetchSafe(u);

  let verdict: "alive" | "dead" | "uncertain";
  if (result.ok) {
    verdict = "alive";
  } else if (
    [
      401, 403, 405, 407, 408, 409, 412, 415, 418, 421, 422, 423, 425, 426, 428, 429,
      431, 451,
    ].includes(result.status)
  ) {
    verdict = "alive";
  } else if (result.status === 404 || result.status === 410) {
    verdict = "dead";
  } else if (
    result.status === 0 &&
    [
      "Invalid URL",
      "DNS lookup failed",
      "DNS resolution failed",
      "Resolved to private/special IP",
      "Only http/https allowed",
      "localhost blocked",
      "private TLD blocked",
      "Port not allowed",
      "Host not on allowlist",
      "Too many redirects",
    ].includes((result as any).reason || "")
  ) {
    verdict = "dead";
  } else {
    verdict = "uncertain";
  }

  return NextResponse.json(
    { ...result, verdict },
    { status: 200, headers: { "Referrer-Policy": "no-referrer" } }
  );
}
