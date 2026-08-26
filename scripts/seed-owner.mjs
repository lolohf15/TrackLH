/**
 * Sets the owner account's password.
 *
 * Run it and it asks for the password, hiding what you type:
 *
 *   npm run seed:owner
 *
 * For an unattended run it also accepts OWNER_EMAIL / OWNER_PASSWORD from the
 * local .env, which is gitignored. Either way the password is never written to
 * the repository and never appears in shell history.
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";

const prisma = new PrismaClient();

/** Reads a line without echoing it back to the terminal. */
function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: stdin, output: stdout, terminal: true });
    // Swallow the echo so the password never appears on screen.
    const onData = () => {
      stdout.clearLine?.(0);
      stdout.cursorTo?.(0);
      stdout.write(question);
    };
    stdout.write(question);
    stdin.on("data", onData);
    rl.question("", (answer) => {
      stdin.off("data", onData);
      rl.close();
      stdout.write("\n");
      resolve(answer);
    });
  });
}

function ask(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: stdin, output: stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

let email = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase();
let password = process.env.OWNER_PASSWORD ?? "";

if (!email) {
  email = (await ask("Correo de tu cuenta: ")).trim().toLowerCase();
}

if (!password) {
  password = await askHidden("Contraseña nueva (no se muestra): ");
  const again = await askHidden("Repítela: ");
  if (password !== again) {
    console.error("\nLas contraseñas no coinciden. No se cambió nada.");
    process.exit(1);
  }
}

if (!email) {
  console.error("Hace falta un correo.");
  process.exit(1);
}

if (password.length < 8) {
  console.error("La contraseña debe tener al menos 8 caracteres. No se cambió nada.");
  process.exit(1);
}

const existing = await prisma.user.findUnique({ where: { email } });
if (!existing) {
  console.error(`No existe ninguna cuenta con el correo ${email}.`);
  process.exit(1);
}

await prisma.user.update({
  where: { email },
  data: { passwordHash: await hash(password, 12) },
});

console.log(`\nListo. Ya puedes entrar en /login con ${email}.`);

await prisma.$disconnect();
