/**
 * Sets the owner account's password from the local .env, which is gitignored.
 * The password never enters the repository or any command line.
 *
 *   OWNER_EMAIL=tu@correo.com
 *   OWNER_PASSWORD=algo-largo-y-privado
 *
 * Run with:  npm run seed:owner
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const email = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase();
const password = process.env.OWNER_PASSWORD ?? "";

if (!email || !password) {
  console.error(
    "Faltan OWNER_EMAIL y/o OWNER_PASSWORD en .env.\n" +
      "Agrégalos ahí (el archivo está en .gitignore) y vuelve a correr `npm run seed:owner`."
  );
  process.exit(1);
}

if (password.length < 8) {
  console.error("La contraseña debe tener al menos 8 caracteres.");
  process.exit(1);
}

const passwordHash = await hash(password, 12);

const user = await prisma.user.upsert({
  where: { email },
  create: { email, passwordHash, onboardedAt: new Date() },
  update: { passwordHash },
  select: { id: true, email: true, onboardedAt: true },
});

console.log(`Contraseña establecida para ${user.email} (id ${user.id}).`);
console.log("Ya puedes entrar en /login.");

await prisma.$disconnect();
