import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth";
import { UNKNOWN_COLOR, type CategoryKind } from "@/types";

/** This user's categories, with the monthly budget attached to each. */
export async function GET() {
  try {
    const userId = await requireUser();

    const [categories, budgets] = await Promise.all([
      prisma.category.findMany({
        where: { userId },
        orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.budgetConfig.findMany({ where: { userId } }),
    ]);

    const budgetMap = new Map(budgets.map((b) => [b.category, b.amount]));

    return NextResponse.json(
      categories.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        kind: c.kind as CategoryKind,
        sortOrder: c.sortOrder,
        budget: budgetMap.get(c.name) ?? 0,
      }))
    );
  } catch (err) {
    return errorResponse(err, "GET /api/categories");
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUser();

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: "Cuerpo de solicitud inválido (JSON)" }, { status: 400 });
    }

    const name = typeof body.name === "string" ? body.name.trim().slice(0, 40) : "";
    if (name === "") {
      return NextResponse.json({ error: "Escribe un nombre para la categoría" }, { status: 400 });
    }

    const kind: CategoryKind = body.kind === "income" ? "income" : "expense";
    const color = typeof body.color === "string" ? body.color : UNKNOWN_COLOR;
    const budget = Number(body.budget);

    try {
      const created = await prisma.category.create({
        data: { userId, name, kind, color, sortOrder: 999 },
      });

      // Income has nothing to budget against, so only expenses get a row.
      if (kind === "expense" && Number.isFinite(budget) && budget > 0) {
        await prisma.budgetConfig.upsert({
          where: { userId_category: { userId, category: name } },
          create: { userId, category: name, amount: budget },
          update: { amount: budget },
        });
      }

      return NextResponse.json({ success: true, id: created.id }, { status: 201 });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return NextResponse.json({ error: "Ya tienes una categoría con ese nombre" }, { status: 409 });
      }
      throw err;
    }
  } catch (err) {
    return errorResponse(err, "POST /api/categories");
  }
}
