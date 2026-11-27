import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

/**
 * Runtime state persistence.
 *
 * Each runtime store (issues, governance) is saved as one JSON value in the
 * Supabase `app_state` table, keyed by store name. When SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY are not set (offline dev, laptop demo backup), it
 * falls back to the original OS temp-directory JSON files, so
 * `npm run reset:demo` keeps working locally.
 *
 * Server-only — the service role key bypasses row-level security. Never import
 * this from a client component.
 */

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase =
  url && serviceKey
    ? createClient(url, serviceKey, { auth: { persistSession: false } })
    : null;

const MAX_SAVE_ATTEMPTS = 10;

/** Short random pause before a retry, growing with each attempt, so colliding requests spread out. */
function backoff(attempt: number): Promise<void> {
  const ms = Math.min(400, 15 * 2 ** attempt) * (0.5 + Math.random());
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function localFile(key: string): string {
  return path.join(os.tmpdir(), `citytrace-runtime-${key}.json`);
}

interface Loaded<T> {
  data: T;
  version: number;
}

async function load<T>(key: string, empty: T): Promise<Loaded<T>> {
  if (!supabase) {
    try {
      const raw = fs.readFileSync(localFile(key), "utf8");
      return { data: JSON.parse(raw) as T, version: 0 };
    } catch {
      return { data: empty, version: 0 };
    }
  }

  const { data, error } = await supabase
    .from("app_state")
    .select("data, version")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error(
      `Missing app_state row "${key}" — run the setup SQL in Supabase first.`
    );
  }

  const value = data.data as T | null;
  const isEmpty =
    !value || (typeof value === "object" && Object.keys(value).length === 0);
  return { data: isEmpty ? empty : value, version: data.version ?? 0 };
}

/** Read a store. Returns `empty` if nothing has been saved yet. */
export async function readState<T>(key: string, empty: T): Promise<T> {
  return (await load(key, empty)).data;
}

/**
 * Read a store, change it with `mutate`, and save it.
 *
 * Saves use an optimistic version check: if another request saved in between,
 * the store is reloaded and `mutate` runs again on the fresh copy, so two
 * simultaneous changes cannot overwrite each other. Because `mutate` may run
 * more than once, it must only change `store` and return a value — no other
 * side effects (notifications, network calls) inside it.
 */
export async function updateState<T, R>(
  key: string,
  empty: T,
  mutate: (store: T) => R
): Promise<R> {
  for (let attempt = 0; attempt < MAX_SAVE_ATTEMPTS; attempt += 1) {
    if (attempt > 0) await backoff(attempt);
    const { data, version } = await load(key, empty);
    const before = JSON.stringify(data);
    const result = mutate(data);

    // Nothing changed (e.g. a forbidden or not-found request): skip the save.
    if (JSON.stringify(data) === before) return result;

    if (!supabase) {
      fs.writeFileSync(localFile(key), JSON.stringify(data, null, 2), "utf8");
      return result;
    }

    const { data: saved, error } = await supabase
      .from("app_state")
      .update({
        data,
        version: version + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("key", key)
      .eq("version", version)
      .select("key");
    if (error) throw error;
    if (saved && saved.length > 0) return result;
  }

  throw new Error(`Could not save "${key}" — too many simultaneous edits.`);
}
