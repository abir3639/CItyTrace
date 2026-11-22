#!/usr/bin/env node
/**
 * Crawls the running CITYTRACE app and reports any internal link that does not
 * return a success response.
 *
 *   node scripts/check-links.mjs [baseUrl] [maxPages]
 *
 * Exits non-zero if a broken link is found, so it can gate a demo build.
 */
const base = (process.argv[2] ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const maxPages = Number(process.argv[3] ?? 80);

const SEEDS = [
  "/",
  "/city-explorer",
  "/civic-issues",
  "/public-projects",
  "/money-tracker",
  "/ai-investigation",
  "/civic-issues/report",
];

const seen = new Map();
const queue = [...SEEDS];
const broken = [];

function decode(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&#x27;", "'")
    .replaceAll("&quot;", '"');
}

function normalise(href) {
  if (!href) return null;
  const value = decode(href.trim());
  if (
    value.startsWith("#") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:") ||
    value.startsWith("javascript:") ||
    value.startsWith("http") ||
    value.startsWith("data:")
  ) {
    return null;
  }
  if (!value.startsWith("/")) return null;
  return value;
}

async function fetchPage(path) {
  const response = await fetch(`${base}${path}`, { redirect: "manual" });
  const html = response.headers.get("content-type")?.includes("text/html")
    ? await response.text()
    : "";
  return { status: response.status, html };
}

console.log(`Crawling ${base} (max ${maxPages} pages)\n`);

while (queue.length > 0 && seen.size < maxPages) {
  const path = queue.shift();
  if (seen.has(path)) continue;

  let result;
  try {
    result = await fetchPage(path);
  } catch (error) {
    seen.set(path, 0);
    broken.push({ path, status: `request failed: ${error.message}` });
    continue;
  }

  seen.set(path, result.status);
  if (result.status < 200 || result.status >= 300) {
    broken.push({ path, status: result.status });
    continue;
  }

  for (const match of result.html.matchAll(/href="([^"]+)"/g)) {
    const next = normalise(match[1]);
    if (next && !seen.has(next) && !queue.includes(next)) queue.push(next);
  }
}

const statuses = [...seen.entries()].reduce((acc, [, status]) => {
  acc[status] = (acc[status] ?? 0) + 1;
  return acc;
}, {});

console.log(`Checked ${seen.size} pages`);
console.log(
  `Status mix: ${Object.entries(statuses)
    .map(([status, count]) => `${status}×${count}`)
    .join("  ")}`
);

if (broken.length > 0) {
  console.log(`\nBroken links (${broken.length}):`);
  for (const item of broken) console.log(`  ${item.status}  ${item.path}`);
  process.exit(1);
}

console.log("\nNo broken internal links.");
