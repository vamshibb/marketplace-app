import ListingForm from "../components/ListingForm";

function CreateListingPage() {
  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8">
        Create Listing
      </h1>

      <ListingForm />
    </div>
  );
}

export default CreateListingPage;