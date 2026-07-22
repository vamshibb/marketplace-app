import { useQuery } from "@tanstack/react-query";

import { getProducts } from "../api/productApi";

function DashboardPage() {
  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  if (isLoading) {
    return <h2>Loading...</h2>;
  }

  if (isError) {
    return <h2>Something went wrong.</h2>;
  }

  console.log("API response:", data);

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-6">
        Marketplace
      </h1>

      {data.data.map((product: any) => (
        <div
          key={product.id}
          className="border rounded p-4 mb-4"
        >
          <h2 className="text-2xl font-semibold">
            {product.title}
          </h2>

          <p>{product.description}</p>

          <p className="font-bold">
            ${product.price}
          </p>
        </div>
      ))}
    </div>
  );
}

export default DashboardPage;