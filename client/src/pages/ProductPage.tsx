import { useParams } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import { api } from "../api/api";

function ProductPage() {
  const { id } = useParams();

  const { data, isLoading } =
    useQuery({
      queryKey: ["product", id],

      queryFn: async () => {
        const response =
          await api.get(
            `/products/${id}`
          );

        return response.data;
      },
    });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="grid md:grid-cols-2 gap-10">
      <img
        src={
          data.image ||
          "https://placehold.co/600x400"
        }
        alt={data.title}
        className="rounded-xl"
      />

      <div>
        <h1 className="text-5xl font-bold">
          {data.title}
        </h1>

        <p className="mt-6 text-zinc-400">
          {data.description}
        </p>

        <div className="mt-8 text-4xl font-bold">
          ${data.price}
        </div>

        <div className="mt-4 text-zinc-500">
          Seller: {data.seller.email}
        </div>
      </div>
    </div>
  );
}

export default ProductPage;