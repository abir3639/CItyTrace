#!/usr/bin/env node
/**
 * Clears citizen reports, status changes, notifications, uploaded photos and
 * user auth sessions/registrations recorded during a demo session, so the next
 * run starts cleanly from the seeded 22-issue dataset and seeded demo accounts.
 *
 * Always clears the local temp-file stores (used when Supabase is not
 * configured). If Supabase credentials are available, also resets the
 * `issues` and `governance` rows of `app_state` and empties the
 * `issue-photos` Storage bucket.
 *
 * Usage:
 *   npm run reset:demo                                  # local files + Supabase from .env.local (if set)
 *   npm run reset:demo -- --env=.env.prod --yes         # another environment, e.g. production
 *
 * Any env file other than .env.local requires --yes, so production is never
 * wiped by accident.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const envArg = args.find((arg) => arg.startsWith("--env="));
const envFile = envArg ? envArg.slice("--env=".length) : ".env.local";
const confirmed = args.includes("--yes");

// ---------------------------------------------------------------------------
// 1. Local temp-file stores
// ---------------------------------------------------------------------------

const files = [
  path.join(os.tmpdir(), "citytrace-runtime-issues.json"),
  path.join(os.tmpdir(), "citytrace-runtime-auth.json"),
  path.join(os.tmpdir(), "citytrace-runtime-governance.json"),
];

let removedAny = false;
for (const file of files) {
  if (fs.existsSync(file)) {
    fs.rmSync(file, { force: true });
    console.log(`Removed local demo store: ${file}`);
    removedAny = true;
  }
}
if (!removedAny) console.log("No local demo store files found.");

// ---------------------------------------------------------------------------
// 2. Supabase (database rows + photo bucket)
// ---------------------------------------------------------------------------

/** Minimal .env parser: KEY=value lines, optional quotes, # comments. Does not override real env vars. */
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return false;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match || line.trimStart().startsWith("#")) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
  return true;
}

if (envArg && !fs.existsSync(envFile)) {
  console.error(`Env file not found: ${envFile}`);
  process.exit(1);
}
loadEnvFile(envFile);

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.log(`No Supabase credentials in the environment or ${envFile} — skipped database reset.`);
  process.exit(0);
}

const host = new URL(url).host;
if (envFile !== ".env.local" && !confirmed) {
  console.error(
    `Refusing to reset Supabase project ${host} from ${envFile} without --yes.\n` +
      `If you really mean it: npm run reset:demo -- --env=${envFile} --yes`
  );
  process.exit(1);
}

const { createClient } = await import("@supabase/supabase-js");
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

console.log(`Resetting Supabase project ${host} …`);

// Reset each store row. The version is bumped (only if unchanged since we read
// it) so a request that was mid-save against the old data retries on the empty
// store instead of writing the old data back.
for (const key of ["issues", "governance"]) {
  let done = false;
  for (let attempt = 0; attempt < 5 && !done; attempt += 1) {
    const { data: row, error: readError } = await supabase
      .from("app_state")
      .select("version")
      .eq("key", key)
      .maybeSingle();
    if (readError) throw readError;
    if (!row) {
      console.error(`  Missing app_state row "${key}" — run supabase/setup.sql first.`);
      process.exit(1);
    }
    const { data: saved, error } = await supabase
      .from("app_state")
      .update({ data: {}, version: row.version + 1, updated_at: new Date().toISOString() })
      .eq("key", key)
      .eq("version", row.version)
      .select("key");
    if (error) throw error;
    done = Boolean(saved && saved.length > 0);
  }
  if (!done) throw new Error(`Could not reset "${key}" — it kept changing. Stop the app and retry.`);
  console.log(`  Cleared app_state "${key}"`);
}

// Empty the photo bucket (files are stored flat, so one level is enough).
const bucket = supabase.storage.from("issue-photos");
const removed = new Set();
let photosComplete = true;
let previousBatch = "";
for (let page = 0; page < 1000; page += 1) {
  const { data: objects, error } = await bucket.list("", { limit: 100 });
  if (error) {
    console.error(`  Could not list issue-photos (${error.message}) — photos were not cleared.`);
    photosComplete = false;
    break;
  }
  const names = (objects ?? [])
    .map((object) => object.name)
    .filter((name) => name && name !== ".emptyFolderPlaceholder");
  if (names.length === 0) break;
  // Same files listed again after removing them: they can't be removed — stop rather than loop forever.
  if (names.join("|") === previousBatch) {
    for (const name of names) removed.delete(name);
    console.error(`  ${names.length} photo(s) could not be removed — check the issue-photos bucket in Supabase.`);
    photosComplete = false;
    break;
  }
  previousBatch = names.join("|");
  const { error: removeError } = await bucket.remove(names);
  if (removeError) throw removeError;
  for (const name of names) removed.add(name);
}
console.log(`  Removed ${removed.size} photo${removed.size === 1 ? "" : "s"} from issue-photos`);

if (photosComplete) {
  console.log("Done — the demo starts from the seeded dataset.");
} else {
  console.error("Finished with problems — the database was reset, but some photos remain (see above).");
  process.exitCode = 1;
}
