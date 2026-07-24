import ListingCard from "../features/listings/components/ListingCard";
import { useListings } from "../features/listings/hooks/useListings";

function DashboardPage() {
  const {
    data,
    isLoading,
    isError,
  } = useListings();

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
        {data.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
          />
        ))}
      </div>
    </div>
  );
}

export default DashboardPage;