import { prisma } from "./client";
import { seedCategories } from "./seeds/category.seed";

async function main() {
  await seedCategories();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });