import { ProductCard } from "../components/ProductCard";
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
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {productsQuery.data.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};
