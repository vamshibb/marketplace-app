import { useQuery } from "@tanstack/react-query";

import { api } from "../api/api";

import ProductCard from "../components/ProductCard";

function HomePage() {
  const { data, isLoading } =
    useQuery({
      queryKey: ["products"],

      queryFn: async () => {
        const response =
          await api.get("/products");

        return response.data;
      },
    });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-5xl font-bold mb-8">
        Marketplace
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {data?.map((product: any) => (
          <ProductCard
            key={product.id}
            product={product}
          />
        ))}
      </div>
    </div>
  );
}

export default HomePage;