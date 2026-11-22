#!/usr/bin/env node
/**
 * Clears citizen reports and status changes recorded during a demo session.
 *
 * The runtime store lives in the OS temp directory so it never pollutes the
 * project tree; this script removes it so the next run starts from the seeded
 * 22-issue dataset.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const file = path.join(os.tmpdir(), "citytrace-runtime-issues.json");

if (fs.existsSync(file)) {
  fs.rmSync(file, { force: true });
  console.log(`Removed demo store: ${file}`);
} else {
  console.log("No demo store found — nothing to reset.");
}
