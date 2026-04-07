#!/usr/bin/env node
// Fetch the title of one or more URLs while keeping token cost near zero.
// Streams each response, extracts og:title or <title>, and aborts.
// Usage: node scripts/fetch-title.mjs <url> [url2] [url3] ...

import { get as httpsGet } from "node:https";
import { get as httpGet } from "node:http";
import { lookup } from "node:dns/promises";

const MAX_REDIRECTS = 5;
const MAX_BYTES = 1048576;
const TIMEOUT_MS = 5000;

const OG_TITLE_RE = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i;
const TITLE_RE = /<title[^>]*>([\s\S]*?)<\/title>/i;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// SSRF protection: reject private, reserved, and cloud metadata IPs
function isPrivateIP(ip) {
  // Handle IPv4-mapped IPv6 addresses (::ffff:x.x.x.x)
  const normalized = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  // IPv4 private/reserved ranges
  const parts = normalized.split(".").map(Number);
  if (parts.length === 4) {
    const [a, b] = parts;
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 127) return true; // 127.0.0.0/8
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local + cloud metadata)
    if (a === 0) return true; // 0.0.0.0/8
    if (a >= 224) return true; // multicast + reserved
  }
  // IPv6 private/reserved
  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fe80:")) return true; // link-local
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // unique local
  return false;
}

// Best-effort SSRF guard: resolves hostname and rejects private IPs.
// Note: DNS rebinding (TTL=0) can cause http.get to resolve a different IP
// than the one checked here. A full fix requires a custom lookup agent, which
// is out of scope for a title-fetching utility.
async function validateUrl(url) {
  const { hostname } = new URL(url);
  const { address } = await lookup(hostname);
  if (isPrivateIP(address)) {
    throw new Error(`Blocked: ${hostname} resolves to private IP ${address}`);
  }
}

function extractTitle(html) {
  const t = html.match(TITLE_RE);
  if (t) return decodeTitle(t[1]);
  const og = html.match(OG_TITLE_RE);
  if (og) return decodeTitle(og[1]);
  return null;
}

function decodeTitle(raw) {
  return raw
    .replace(/\s+/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .trim();
}

async function fetchTitle(url, redirects = 0) {
  if (redirects > MAX_REDIRECTS) {
    throw new Error("Too many redirects");
  }

  await validateUrl(url);

  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? httpsGet : httpGet;

    const req = client(
      url,
      { headers: { "User-Agent": UA }, timeout: TIMEOUT_MS },
      (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          res.destroy();
          req.destroy();
          const next = new URL(res.headers.location, url).href;
          resolve(fetchTitle(next, redirects + 1));
          return;
        }

        if (res.statusCode !== 200) {
          res.destroy();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        let bytes = 0;
        let found = false;
        let buf = "";

        // Detect charset from Content-Type header, fall back to UTF-8
        const ctHeader = res.headers["content-type"] || "";
        const charsetMatch = ctHeader.match(/charset=([^\s;]+)/i);
        const rawCharset = charsetMatch ? charsetMatch[1].replace(/['"]/g, "") : "utf-8";
        let decoder;
        try {
          decoder = new TextDecoder(rawCharset, { fatal: false });
        } catch {
          decoder = new TextDecoder("utf-8", { fatal: false });
        }

        res.on("error", (err) => {
          if (!found) reject(err);
        });
        res.on("data", (chunk) => {
          if (found) return;
          bytes += chunk.length;
          buf += decoder.decode(chunk, { stream: true });

          const title = extractTitle(buf);
          if (title) {
            found = true;
            res.destroy();
            req.destroy();
            resolve(title);
          } else if (bytes >= MAX_BYTES) {
            res.destroy();
            req.destroy();
            reject(new Error("Title not found within first 1MB"));
          }
        });

        res.on("end", () => {
          if (found) return;
          buf += decoder.decode();
          const title = extractTitle(buf);
          if (title) resolve(title);
          else reject(new Error("No title found"));
        });
      },
    );

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });

    req.on("error", reject);
  });
}

function fetchTitleWithFallback(url) {
  return fetchTitle(url).catch((primaryErr) =>
    fetchTitle(`https://web.archive.org/web/2/${url}`).catch((wbErr) => {
      throw new Error(`${primaryErr.message}; Wayback: ${wbErr.message}`);
    }),
  );
}

const urls = process.argv.slice(2);
if (urls.length === 0) {
  process.stderr.write("Usage: node scripts/fetch-title.mjs <url> [url2] ...\n");
  process.exit(1);
}

const results = await Promise.allSettled(
  urls.map((u) => fetchTitleWithFallback(u)),
);

for (let i = 0; i < urls.length; i++) {
  const r = results[i];
  if (r.status === "fulfilled") {
    process.stdout.write(r.value + "\n");
  } else {
    process.stderr.write(`${urls[i]}: ${r.reason.message}\n`);
    process.stdout.write("\n");
  }
}

if (results.every((r) => r.status === "rejected")) process.exit(1);
