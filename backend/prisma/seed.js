const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@rosteriq.app" },
    update: {},
    create: { email: "demo@rosteriq.app", name: "Demo Manager" },
  });
  console.log(`Seeded demo user ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
