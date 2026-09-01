export const productsQueryKeys = {
  all: () => ["products"] as const,
  detail: (id: string) => ["products", "detail", id] as const,
};
