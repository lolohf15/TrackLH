/**
 * One-off: give every category that has no icon yet the one its name
 * suggests (the same rules the category sheet uses as you type). Categories
 * that already have an icon are never touched, so it is safe to re-run.
 *
 *   node --env-file=.env scripts/backfill-category-icons.mts           # dry run
 *   node --env-file=.env scripts/backfill-category-icons.mts --apply   # write
 *
 * An .mts so Node's built-in TypeScript support runs it as ESM and the app's
 * tsconfig (which only globs .ts) leaves it alone. Needs the `icon` column from
 * migration 20261002100000_category_icon.
 */
import { PrismaClient } from "@prisma/client";
import { suggestCategoryIcon } from "../lib/category-icons.ts";

const apply = process.argv.includes("--apply");
const prisma = new PrismaClient();

async function main() {
  const missing = await prisma.category.findMany({
    where: { icon: null },
    select: { id: true, name: true, kind: true },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });

  const plan = missing.map((c) => ({ ...c, icon: suggestCategoryIcon(c.name) }));
  for (const row of plan) console.log(`${row.kind.padEnd(8)} ${row.name.padEnd(28)} → ${row.icon}`);
  console.log(`\n${plan.length} categories without an icon.`);

  if (!apply) {
    console.log("Dry run. Re-run with --apply to write.");
    return;
  }

  await prisma.$transaction(
    plan.map((row) =>
      prisma.category.updateMany({
        // Re-checked in the write itself, so an icon picked between the read
        // and here is never overwritten.
        where: { id: row.id, icon: null },
        data: { icon: row.icon },
      })
    )
  );
  console.log("Written.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
