import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { cookies } from "next/headers";
import { SECTORS } from "@/data";
import type { PublicUser, UserRef, UserRole } from "@/types/citytrace";
import { DEPARTMENTS, getDepartment } from "./departments";
import { DEMO_NOW } from "./stats";

/**
 * Runtime authentication & citizen profile store.
 *
 * Pre-seeded with four demonstration Dhaka civic accounts (password: `citytrace123`)
 * using Node's native `crypto.scryptSync` + timing-safe comparison and backed by
 * an HTTP-only session store in the OS temp directory.
 *
 * Server-only — never import this from a client component.
 */

export const SESSION_COOKIE = "ct_session";

const AUTH_STORE_FILE = path.join(os.tmpdir(), "citytrace-runtime-auth.json");
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;
const AVATAR_PALETTE = [
  "#007AFF",
  "#34C759",
  "#AF52DE",
  "#FF9500",
  "#5856D6",
  "#0D9488",
  "#E11D48",
] as const;

interface StoredUser extends PublicUser {
  passwordHash: string;
}

interface SessionRecord {
  userId: string;
  createdAt: string;
}

interface AuthStoreShape {
  users: StoredUser[];
  sessions: Record<string, SessionRecord>;
}

function hashPassword(password: string, saltHex?: string): string {
  const salt = saltHex ?? crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHex, "hex");
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function computeInitials(name: string): string {
  const cleaned = name
    .replace(/\b(engr|dr|mr|mrs|ms)\.?\s+/gi, "")
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "CT";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export function pickAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100_000;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

// Deterministic demo salt so hashes stay reproducible across restarts.
const DEMO_SEED_PASSWORD_HASH = hashPassword(
  "citytrace123",
  "4369747954726163654468616b613031"
);

const SEEDED_STORED_USERS: StoredUser[] = [
  {
    id: "USR-001",
    name: "Farhana Rahman",
    email: "farhana@citytrace.demo",
    role: "citizen",
    sectorId: "S04",
    initials: "FR",
    avatarColor: "#007AFF",
    joinedAt: "2023-02-10",
    passwordHash: DEMO_SEED_PASSWORD_HASH,
  },
  {
    id: "USR-002",
    name: "Tanvir Ahmed",
    email: "tanvir@citytrace.demo",
    role: "citizen",
    sectorId: "S02",
    initials: "TA",
    avatarColor: "#34C759",
    joinedAt: "2023-04-18",
    passwordHash: DEMO_SEED_PASSWORD_HASH,
  },
  {
    id: "USR-003",
    name: "Nusrat Jahan",
    email: "nusrat@citytrace.demo",
    role: "verifier",
    sectorId: "S06",
    initials: "NJ",
    avatarColor: "#AF52DE",
    joinedAt: "2023-01-22",
    passwordHash: DEMO_SEED_PASSWORD_HASH,
  },
  {
    id: "USR-004",
    name: "Engr. Mahmudul Hasan",
    email: "mahmudul@citytrace.demo",
    role: "official",
    sectorId: "S07",
    departmentId: "DEPT-ROADS",
    initials: "MH",
    avatarColor: "#FF9500",
    joinedAt: "2022-11-05",
    passwordHash: DEMO_SEED_PASSWORD_HASH,
  },
  {
    id: "USR-005",
    name: "Engr. Rafiqul Islam",
    email: "rafiqul@citytrace.demo",
    role: "official",
    sectorId: "S02",
    departmentId: "DEPT-DRAINAGE",
    initials: "RI",
    avatarColor: "#E67E22",
    joinedAt: "2023-01-12",
    passwordHash: DEMO_SEED_PASSWORD_HASH,
  },
];

export function isDemoModeEnabled(): boolean {
  return process.env.CITYTRACE_DISABLE_DEMO_SWITCH !== "1";
}

export function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    sectorId: user.sectorId,
    ...(user.departmentId ? { departmentId: user.departmentId } : {}),
    initials: user.initials,
    avatarColor: user.avatarColor,
    joinedAt: user.joinedAt,
  };
}

export function toUserRef(user: PublicUser): UserRef {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    initials: user.initials,
    avatarColor: user.avatarColor,
    sectorId: user.sectorId,
    ...(user.departmentId ? { departmentId: user.departmentId } : {}),
  };
}

export const SEEDED_PUBLIC_USERS: readonly PublicUser[] =
  SEEDED_STORED_USERS.map(toPublicUser);

export const DEMO_SWITCH_ACCOUNTS: readonly PublicUser[] = [
  SEEDED_PUBLIC_USERS[0], // Citizen: Farhana Rahman
  SEEDED_PUBLIC_USERS[2], // Civic Verifier: Nusrat Jahan
  SEEDED_PUBLIC_USERS[3], // Official Roads: Engr. Mahmudul Hasan
  SEEDED_PUBLIC_USERS[4], // Official Drainage: Engr. Rafiqul Islam
];

function ensureSeededUsers(existing: StoredUser[]): {
  users: StoredUser[];
  changed: boolean;
} {
  const byId = new Set(existing.map((u) => u.id));
  const merged = [...existing];
  let changed = false;
  for (const seeded of SEEDED_STORED_USERS) {
    if (!byId.has(seeded.id)) {
      merged.push(seeded);
      changed = true;
    }
  }
  return { users: merged, changed };
}

function readAuthStore(): AuthStoreShape {
  try {
    const raw = fs.readFileSync(AUTH_STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<AuthStoreShape>;
    const rawUsers = Array.isArray(parsed.users) ? parsed.users : [];
    const { users } = ensureSeededUsers(rawUsers);
    const sessions =
      parsed.sessions && typeof parsed.sessions === "object"
        ? parsed.sessions
        : {};
    return { users, sessions };
  } catch {
    return { users: [...SEEDED_STORED_USERS], sessions: {} };
  }
}

function writeAuthStore(store: AuthStoreShape): void {
  fs.writeFileSync(AUTH_STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}

export function listPublicUsers(): PublicUser[] {
  return readAuthStore().users.map(toPublicUser);
}

export function findUserById(id: string): PublicUser | null {
  const found = readAuthStore().users.find((u) => u.id === id);
  return found ? toPublicUser(found) : null;
}

export function registerUser(input: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  sectorId: string;
  departmentId?: string;
}):
  | { ok: true; user: PublicUser }
  | { ok: false; error: string; field?: string; status: number } {
  const name = input.name.trim().replace(/\s+/g, " ");
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const role: UserRole =
    input.role === "verifier" || input.role === "official"
      ? input.role
      : "citizen";
  const sectorId = SECTORS.some((s) => s.id === input.sectorId)
    ? input.sectorId
    : SECTORS[0].id;
  const departmentId =
    role === "official"
      ? (getDepartment(input.departmentId)?.id ?? DEPARTMENTS[0].id)
      : undefined;

  if (name.length < 2 || name.length > 60) {
    return {
      ok: false,
      field: "name",
      error: "Full name must be between 2 and 60 characters.",
      status: 422,
    };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      ok: false,
      field: "email",
      error: "Enter a valid email address.",
      status: 422,
    };
  }
  if (password.length < 6 || password.length > 100) {
    return {
      ok: false,
      field: "password",
      error: "Password must be at least 6 characters.",
      status: 422,
    };
  }

  const store = readAuthStore();
  if (store.users.some((u) => u.email.toLowerCase() === email)) {
    return {
      ok: false,
      field: "email",
      error: "An account with this email already exists.",
      status: 409,
    };
  }

  const usedIds = new Set(store.users.map((u) => u.id));
  let idx = store.users.length + 1;
  while (usedIds.has(`USR-${String(idx).padStart(3, "0")}`)) {
    idx += 1;
  }
  const id = `USR-${String(idx).padStart(3, "0")}`;

  const created: StoredUser = {
    id,
    name,
    email,
    role,
    sectorId,
    ...(departmentId ? { departmentId } : {}),
    initials: computeInitials(name),
    avatarColor: pickAvatarColor(email),
    joinedAt: DEMO_NOW,
    passwordHash: hashPassword(password),
  };

  store.users.push(created);
  writeAuthStore(store);

  return { ok: true, user: toPublicUser(created) };
}

export function authenticateUser(
  email: string,
  password: string
): PublicUser | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !password) return null;
  const store = readAuthStore();
  const user = store.users.find((u) => u.email.toLowerCase() === normalized);
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return toPublicUser(user);
}

export function createSession(userId: string): string {
  const store = readAuthStore();
  const token = crypto.randomBytes(32).toString("hex");
  store.sessions[token] = {
    userId,
    createdAt: new Date().toISOString(),
  };
  writeAuthStore(store);
  return token;
}

export function deleteSession(token: string): void {
  if (!token) return;
  const store = readAuthStore();
  if (store.sessions[token]) {
    delete store.sessions[token];
    writeAuthStore(store);
  }
}

export function getUserBySessionToken(token: string): PublicUser | null {
  if (!token) return null;
  const store = readAuthStore();
  const session = store.sessions[token];
  if (!session) return null;
  const user = store.users.find((u) => u.id === session.userId);
  return user ? toPublicUser(user) : null;
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getUserBySessionToken(token);
}

export function cookieOptionsForRequest(request: Request) {
  let isHttps = request.headers.get("x-forwarded-proto") === "https";
  if (!isHttps) {
    try {
      isHttps = new URL(request.url).protocol === "https:";
    } catch {
      isHttps = false;
    }
  }
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: isHttps,
  };
}
