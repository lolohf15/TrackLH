import { Client } from "@notionhq/client";
import type {
  PageObjectResponse,
  QueryDatabaseResponse,
} from "@notionhq/client/build/src/api-endpoints";

export const notion = new Client({ auth: process.env.NOTION_API_KEY });

export const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID ?? "";

// Override any property name via env var to match your Notion schema
export const NOTION_PROPS = {
  date:        process.env.NOTION_PROP_DATE        ?? "Fecha",
  amount:      process.env.NOTION_PROP_AMOUNT      ?? "Monto",
  type:        process.env.NOTION_PROP_TYPE        ?? "Tipo",
  category:    process.env.NOTION_PROP_CATEGORY    ?? "Categoría",
  account:     process.env.NOTION_PROP_ACCOUNT     ?? "Cuenta",
  toAccount:   process.env.NOTION_PROP_TO_ACCOUNT  ?? "Cuenta Destino",
  description: process.env.NOTION_PROP_DESCRIPTION ?? "Descripción",
  procesado:   process.env.NOTION_PROP_PROCESADO   ?? "Procesado",
  notes:       process.env.NOTION_PROP_NOTES       ?? "Notas",
};

export type NotionPage = PageObjectResponse;

function getProp(page: NotionPage, name: string): unknown {
  return (page.properties as Record<string, unknown>)[name];
}

export function extractTitle(page: NotionPage): string | null {
  // Try common title property names
  const candidates = ["Nombre", "Name", "Título", "title"];
  for (const name of candidates) {
    const p = getProp(page, name) as { type?: string; title?: Array<{ plain_text: string }> } | undefined;
    if (p?.type === "title" && p.title?.length) {
      return p.title.map((t) => t.plain_text).join("");
    }
  }
  // Also try any property of type title
  for (const val of Object.values(page.properties)) {
    const p = val as { type?: string; title?: Array<{ plain_text: string }> };
    if (p?.type === "title" && p.title?.length) {
      return p.title.map((t) => t.plain_text).join("");
    }
  }
  return null;
}

export function extractDate(page: NotionPage): string | null {
  const p = getProp(page, NOTION_PROPS.date) as { type?: string; date?: { start: string } } | undefined;
  if (p?.type === "date" && p.date?.start) return p.date.start;
  return null;
}

export function extractNumber(page: NotionPage, propName: string): number | null {
  const p = getProp(page, propName) as { type?: string; number?: number | null } | undefined;
  if (p?.type === "number" && p.number != null) return p.number;
  return null;
}

export function extractSelect(page: NotionPage, propName: string): string | null {
  const p = getProp(page, propName) as { type?: string; select?: { name: string } | null } | undefined;
  if (p?.type === "select" && p.select?.name) return p.select.name;
  return null;
}

export function extractRichText(page: NotionPage, propName: string): string | null {
  const p = getProp(page, propName) as { type?: string; rich_text?: Array<{ plain_text: string }> } | undefined;
  if (p?.type === "rich_text" && p.rich_text?.length) {
    return p.rich_text.map((t) => t.plain_text).join("");
  }
  return null;
}

export function extractCheckbox(page: NotionPage, propName: string): boolean {
  const p = getProp(page, propName) as { type?: string; checkbox?: boolean } | undefined;
  if (p?.type === "checkbox") return p.checkbox ?? false;
  return false;
}

export async function queryAllPages(databaseId: string): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;

  do {
    const response: QueryDatabaseResponse = await notion.databases.query({
      database_id: databaseId,
      sorts: [{ property: NOTION_PROPS.date, direction: "descending" }],
      ...(cursor ? { start_cursor: cursor } : {}),
      page_size: 100,
    });

    pages.push(
      ...(response.results.filter(
        (r): r is NotionPage => r.object === "page" && "properties" in r
      ))
    );

    cursor = response.next_cursor ?? undefined;
  } while (cursor);

  return pages;
}
