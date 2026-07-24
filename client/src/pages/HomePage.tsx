import { useListings } from "../features/listings/hooks/useListings";
import ListingCard from "../features/listings/components/ListingCard";


function HomePage() {
  const { data, isLoading } = useListings();


  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-5xl font-bold mb-8">
        Marketplace
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {Array.isArray(data) &&
    data.map((listing: any) => {
      const listingProps = { listing } as any;

      return (
        <ListingCard
          key={listing.id}
          {...listingProps}
        />
      );
    })}
    </div>
    </div>
  );
}

export default HomePage;