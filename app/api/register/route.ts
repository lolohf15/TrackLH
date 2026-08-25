import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo de solicitud inválido (JSON)" }, { status: 400 });
    }

    const { email, password, name } = body as Record<string, unknown>;

    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!EMAIL_RE.test(cleanEmail)) {
      return NextResponse.json({ error: "Escribe un correo válido" }, { status: 400 });
    }

    if (typeof password !== "string" || password.length < MIN_PASSWORD) {
      return NextResponse.json(
        { error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres` },
        { status: 400 }
      );
    }

    const cleanName =
      typeof name === "string" && name.trim() !== "" ? name.trim().slice(0, 80) : null;

    const passwordHash = await hash(password, 12);

    try {
      const user = await prisma.user.create({
        data: { email: cleanEmail, name: cleanName, passwordHash },
        select: { id: true, email: true },
      });
      return NextResponse.json({ success: true, id: user.id }, { status: 201 });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return NextResponse.json({ error: "Ese correo ya está registrado" }, { status: 409 });
      }
      throw err;
    }
  } catch (err) {
    console.error("[POST /api/register]", err);
    return NextResponse.json({ error: "No se pudo crear la cuenta" }, { status: 500 });
  }
}
