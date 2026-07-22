import ProductCard from "../components/ProductCard";
import { useProducts } from "../hooks/useProducts";

function DashboardPage() {
  const {
    data,
    isLoading,
    isError,
  } = useProducts();

  if (isLoading) {
    return <h2>Loading...</h2>;
  }

  if (isError) {
    return <h2>Something went wrong.</h2>;
  }

  if (!data) {
    return <h2>No data available.</h2>;
  }

  console.log("API response:", data);

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-6">
        Marketplace
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.data.map((product: any) => (
          <ProductCard
            key={product.id}
            product={product}
          />
        ))}
      </div>
    </div>
  );
}

export default DashboardPage;