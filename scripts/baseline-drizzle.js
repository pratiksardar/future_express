/**
 * One-time recovery helper for databases created outside Drizzle migrations.
 *
 * Problem: schema objects already exist, but drizzle.__drizzle_migrations is empty,
 * so `drizzle-kit migrate` tries to re-run 0000 and fails with "type ... already exists".
 *
 * Behavior:
 * - Ensures drizzle.__drizzle_migrations exists
 * - If table has zero rows and baseline schema is detected, inserts the first migration marker (0000)
 * - Leaves existing migration rows untouched
 */
require("dotenv").config({ path: "/Users/lemon/future-express/.env" });
const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");
const postgres = require("postgres");

async function main() {
  const sql = postgres(process.env.DATABASE_URL);
  try {
    const journalPath = path.join("/Users/lemon/future-express/drizzle/meta/_journal.json");
    const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
    const baseline = journal.entries.find((e) => e.idx === 0);
    if (!baseline) throw new Error("Missing idx=0 entry in drizzle/meta/_journal.json");

    const baselinePath = path.join("/Users/lemon/future-express/drizzle", `${baseline.tag}.sql`);
    const baselineSql = fs.readFileSync(baselinePath, "utf8");
    const baselineHash = crypto.createHash("sha256").update(baselineSql).digest("hex");

    await sql`create schema if not exists drizzle`;
    await sql`
      create table if not exists drizzle.__drizzle_migrations (
        id serial primary key,
        hash text not null,
        created_at bigint
      )
    `;

    const existing = await sql`select count(*)::int as c from drizzle.__drizzle_migrations`;
    const rows = existing[0]?.c ?? 0;
    if (rows > 0) {
      console.log(`drizzle.__drizzle_migrations already has ${rows} row(s); no baseline needed.`);
      return;
    }

    const schemaExists = await sql`select to_regtype('category') as category_type`;
    if (!schemaExists[0]?.category_type) {
      console.log("Baseline schema not detected; skipping baseline insert.");
      return;
    }

    await sql`
      insert into drizzle.__drizzle_migrations (hash, created_at)
      values (${baselineHash}, ${baseline.when})
    `;
    console.log(`Inserted baseline migration marker for ${baseline.tag}.`);
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

