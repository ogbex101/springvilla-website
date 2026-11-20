/* Apply supabase/migrations/*.sql in order to DATABASE_URL. Tracks applied files in ops.schema_migrations. */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

export async function migrate(connectionString: string, opts: { extra?: string[]; quiet?: boolean } = {}) {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query("create schema if not exists ops; create table if not exists ops.schema_migrations (name text primary key, applied_at timestamptz default now())");
    const dir = path.join(process.cwd(), "supabase/migrations");
    const files = [...(opts.extra ?? []), ...fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort().map((f) => path.join(dir, f))];
    for (const file of files) {
      const name = path.basename(file);
      const { rowCount } = await client.query("select 1 from ops.schema_migrations where name = $1", [name]);
      if (rowCount) continue;
      await client.query("begin");
      try {
        await client.query(fs.readFileSync(file, "utf8"));
        await client.query("insert into ops.schema_migrations (name) values ($1)", [name]);
        await client.query("commit");
        if (!opts.quiet) console.log("applied", name);
      } catch (e) {
        await client.query("rollback");
        throw new Error(`${name}: ${(e as Error).message}`);
      }
    }
  } finally {
    await client.end();
  }
}

if (process.argv[1]?.endsWith("migrate.ts")) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. See docs/OWNER_TODO.md section B.");
    process.exit(1);
  }
  migrate(url).then(() => console.log("Migrations complete."), (e) => {
    console.error(e.message);
    process.exit(1);
  });
}
