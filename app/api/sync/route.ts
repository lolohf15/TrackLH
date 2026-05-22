import { NextResponse } from "next/server";
import { syncFromNotion, ensureDefaults } from "@/services/notion-sync";

export async function POST() {
  await ensureDefaults();
  const result = await syncFromNotion();
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
