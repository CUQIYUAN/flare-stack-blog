/**
 * Signs a throwaway Admin into the local dev server, then removes it again.
 *
 *   bun scripts/dev-admin-session.ts seed     # prints the session cookie value
 *   bun scripts/dev-admin-session.ts cleanup  # deletes the Admin, its session and new Posts
 *
 * Sign-up needs a Turnstile token, so `seed` writes the user and session rows
 * straight into the local D1 file and signs the cookie with BETTER_AUTH_SECRET
 * from `.dev.vars`, the way better-auth does. The local database is often a
 * copy of production data: `cleanup` removes only the throwaway Admin and the
 * Posts created after `seed` (every row whose `post_id` points at them).
 */
import { Database } from "bun:sqlite";
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const D1_DIR = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
const STATE_FILE = ".wrangler/dev-admin-session.json";
const USER_ID = "dev-admin-session-user";
const EMAIL = "dev-admin-session@example.test";

interface SeedState {
  database: string;
  sessionId: string;
  lastPostId: number;
}

function findDatabase() {
  const candidates = readdirSync(D1_DIR)
    .filter((name) => name.endsWith(".sqlite") && name !== "metadata.sqlite")
    .map((name) => path.join(D1_DIR, name))
    .filter((file) => {
      const db = new Database(file, { readonly: true });
      try {
        return (
          db.query("select 1 from sqlite_master where name = 'posts'").get() !==
          null
        );
      } finally {
        db.close();
      }
    })
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  if (!candidates[0]) {
    throw new Error(
      `No local D1 database with a posts table in ${D1_DIR}; run the dev server once first.`,
    );
  }
  return candidates[0];
}

function authSecret() {
  const secret = readFileSync(".dev.vars", "utf8").match(
    /^BETTER_AUTH_SECRET\s*=\s*"?([^"\n]+)"?/m,
  )?.[1];
  if (!secret) throw new Error("BETTER_AUTH_SECRET is missing from .dev.vars");
  return secret;
}

async function signCookieValue(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return encodeURIComponent(
    `${value}.${Buffer.from(signature).toString("base64")}`,
  );
}

async function seed() {
  if (existsSync(STATE_FILE)) {
    throw new Error(`${STATE_FILE} exists; run cleanup first.`);
  }
  const database = findDatabase();
  const db = new Database(database);
  const now = Date.now();
  const token = crypto.randomUUID().replaceAll("-", "");
  const sessionId = `dev-admin-session-${now}`;
  const lastPostId =
    (db.query("select max(id) as id from posts").get() as { id: number | null })
      .id ?? 0;

  db.run(
    "insert or ignore into user (id, name, email, email_verified, role, created_at, updated_at) values (?, ?, ?, 1, 'admin', ?, ?)",
    [USER_ID, "Dev Admin Session", EMAIL, now, now],
  );
  db.run(
    "insert into session (id, expires_at, token, created_at, updated_at, user_id) values (?, ?, ?, ?, ?, ?)",
    [sessionId, now + 3_600_000, token, now, now, USER_ID],
  );
  db.close();

  writeFileSync(
    STATE_FILE,
    JSON.stringify({ database, sessionId, lastPostId } satisfies SeedState),
  );
  console.log(await signCookieValue(token, authSecret()));
}

function cleanup() {
  if (!existsSync(STATE_FILE)) {
    console.log("Nothing to clean up.");
    return;
  }
  const state = JSON.parse(readFileSync(STATE_FILE, "utf8")) as SeedState;
  const db = new Database(state.database);
  db.run("pragma foreign_keys = on");

  const tables = (
    db
      .query("select name from sqlite_master where type = 'table'")
      .all() as Array<{ name: string }>
  ).map((row) => row.name);
  const removed: Record<string, number> = {};

  db.transaction(() => {
    for (const table of tables) {
      const columns = db.query(`pragma table_info("${table}")`).all() as Array<{
        name: string;
      }>;
      if (!columns.some((column) => column.name === "post_id")) continue;
      const count = (
        db
          .query(`select count(*) as n from "${table}" where post_id > ?`)
          .get(state.lastPostId) as {
          n: number;
        }
      ).n;
      if (count === 0) continue;
      db.run(`delete from "${table}" where post_id > ?`, [state.lastPostId]);
      removed[table] = count;
    }
    removed.posts = db.run("delete from posts where id > ?", [
      state.lastPostId,
    ]).changes;
    removed.session = db.run("delete from session where user_id = ?", [
      USER_ID,
    ]).changes;
    removed.user = db.run("delete from user where id = ?", [USER_ID]).changes;
  })();
  db.close();

  rmSync(STATE_FILE);
  console.log(JSON.stringify(removed));
}

const command = process.argv[2];
if (command === "seed") await seed();
else if (command === "cleanup") cleanup();
else {
  console.error("Usage: bun scripts/dev-admin-session.ts <seed|cleanup>");
  process.exit(1);
}
