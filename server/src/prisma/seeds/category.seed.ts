import { prisma } from "../client";

type CategorySeed = {
  name: string;
  slug: string;
  children?: CategorySeed[];
};

const categories: CategorySeed[] = [
  {
    name: "Electronics",
    slug: "electronics",
    children: [
      { name: "Cameras", slug: "cameras" },
      { name: "Laptops", slug: "laptops" },
      { name: "Phones", slug: "phones" },
      { name: "Audio", slug: "audio" },
    ],
  },
  {
    name: "Vehicles",
    slug: "vehicles",
    children: [
      { name: "Cars", slug: "cars" },
      { name: "Motorcycles", slug: "motorcycles" },
      { name: "Bicycles", slug: "bicycles" },
    ],
  },
  {
    name: "Tools",
    slug: "tools",
    children: [
      { name: "Power Tools", slug: "power-tools" },
      { name: "Hand Tools", slug: "hand-tools" },
      { name: "Gardening", slug: "gardening" },
    ],
  },
  {
    name: "Sports",
    slug: "sports",
    children: [
      { name: "Camping", slug: "camping" },
      { name: "Cycling", slug: "cycling" },
      { name: "Fitness", slug: "fitness" },
    ],
  },
];

async function createCategory(
  category: CategorySeed,
  parentId?: string
) {
  const created = await prisma.category.create({
    data: {
      name: category.name,
      slug: category.slug,
      parentId,
    //   isLeaf: !category.children?.length,
    },
  });

  if (category.children) {
    for (const child of category.children) {
      await createCategory(child, created.id);
    }
  }
}

export async function seedCategories() {
  console.log("🌱 Seeding categories...");

  await prisma.category.deleteMany();

  for (const category of categories) {
    await createCategory(category);
  }

  console.log("✅ Categories seeded.");
}