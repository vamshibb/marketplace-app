import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getListing } from "../api/listingApi";

function ListingPage() {
  const { id } = useParams();

  const { data, isLoading, isError } = useQuery({
  queryKey: ["listing", id],
  queryFn: () => getListing(id!),
});

if (isLoading) {
  return <div>Loading...</div>;
}

if (isError) {
  return <div>Something went wrong.</div>;
}

if (!data) {
  return <div>Listing not found.</div>;
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

export default ListingPage;