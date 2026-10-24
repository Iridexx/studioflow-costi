// Se nessuno riesce più a entrare: imposta una nuova password a un socio dal PC server.
// Uso: pnpm reimposta-password <nome utente> <nuova password>
import { prisma } from "../src/lib/db";
import { passwordProblem } from "../src/lib/password";
import { setPassword } from "../src/modules/partners/service";

async function main() {
  const [username, password] = process.argv.slice(2);
  if (!username || !password) {
    console.log("Uso: pnpm reimposta-password <nome utente> <nuova password>");
    const partners = await prisma.partner.findMany({ where: { username: { not: null } } });
    console.log("Nomi utente presenti:", partners.map((p) => p.username).join(", ") || "nessuno");
    process.exit(1);
  }
  const problem = passwordProblem(password);
  if (problem) throw new Error(problem);
  const partner = await prisma.partner.findUnique({ where: { username: username.toLowerCase() } });
  if (!partner) throw new Error(`Nome utente "${username}" non trovato.`);
  await setPassword(partner.id, password);
  console.log(`Password di ${partner.name} cambiata.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
