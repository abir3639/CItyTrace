#!/usr/bin/env node
/**
 * Clears citizen reports, status changes, and user auth sessions/registrations
 * recorded during a demo session.
 *
 * Runtime stores live in the OS temp directory so they never pollute the project
 * tree; this script removes them so the next run starts cleanly from the seeded
 * 22-issue dataset and 4 seeded demo accounts.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const files = [
  path.join(os.tmpdir(), "citytrace-runtime-issues.json"),
  path.join(os.tmpdir(), "citytrace-runtime-auth.json"),
  path.join(os.tmpdir(), "citytrace-runtime-governance.json"),
];

let removedAny = false;
for (const file of files) {
  if (fs.existsSync(file)) {
    fs.rmSync(file, { force: true });
    console.log(`Removed demo store: ${file}`);
    removedAny = true;
  }
}

if (!removedAny) {
  console.log("No demo store found — nothing to reset.");
}
