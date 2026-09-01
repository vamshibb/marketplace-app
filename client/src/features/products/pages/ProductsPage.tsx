import { useProductsQuery } from "../hooks/useProductsQuery";

export const ProductsPage = () => {
  const productsQuery = useProductsQuery();

  if (productsQuery.isPending) {
    return <p>Loading...</p>;
  }

  if (productsQuery.isError) {
    return <p role="alert">{productsQuery.error.message}</p>;
  }

  if (productsQuery.data.length === 0) {
    return <p>No products found</p>;
  }

  return (
    <main className="space-y-2">
      {productsQuery.data.map((product) => (
        <p key={product.id}>{product.title}</p>
      ))}
    </main>
  );
};
