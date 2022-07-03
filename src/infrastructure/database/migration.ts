import fs from "node:fs/promises";
import path from "node:path";
import {
  DatabasePool,
  createPool,
  sql,
  TaggedTemplateLiteralInvocation,
} from "slonik";
import { Umzug, InputMigrations } from "umzug";
import { getConfig } from "../../config";

export function buildMigration({
  migrationFiles,
  databasePool,
}: {
  migrationFiles: InputMigrations<Record<never, never>>;
  databasePool: DatabasePool;
}) {
  async function ensureTable() {
    await databasePool.query(sql`
      create table if not exists "public"."migrations" (
        "name" varchar, primary key ("name")
      );
    `);
  }

  async function executed() {
    await ensureTable();
    const migrations = await databasePool.anyFirst<string>(sql`
      select "name"
      from "public"."migrations"
      order by "name" asc;
    `);

    return [...migrations];
  }

  async function logMigration({ name }: { name: string }) {
    await databasePool.query(sql`
      insert into "public"."migrations" ("name")
      values (${name});
    `);
  }

  async function unlogMigration({ name }: { name: string }) {
    await ensureTable();

    await databasePool.query(sql`
      delete from "public"."migrations"
      where "name" = ${name};
    `);
  }

  const umzug = new Umzug<Record<never, never>>({
    migrations: migrationFiles,
    logger: undefined,
    storage: {
      executed,
      logMigration,
      unlogMigration,
    },
  });

  return umzug;
}

// eslint-disable-next-line unicorn/prefer-module
const migrationsPath = path.join(__dirname, "../../../migrations");
export const databasePool = createPool(getConfig().databaseUrl);

/**
 * Do not use this in production, as it assumes the file structure
 * Should only be used in tests
 */
export async function readMigrations() {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const migrationsFiles = await fs.readdir(migrationsPath);
  return await Promise.all(
    migrationsFiles
      .filter((file) => file.endsWith(".sql"))
      .map(async (file) => {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const content = await fs.readFile(
          path.join(migrationsPath, file),
          "utf8"
        );

        const query: TaggedTemplateLiteralInvocation = {
          sql: content,
          type: "SLONIK_TOKEN_SQL",
          values: [],
        };

        return {
          name: file.slice(file.indexOf("_") + 1, -1 * ".sql".length),
          async up() {
            await databasePool.query(query);
          },
          async down() {
            // nothing to do
          },
        };
      })
  );
}