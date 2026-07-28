import ListingForm from "../components/ListingForm";

function CreateListingPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-8 text-4xl font-bold">
        Create Listing
      </h1>

      <ListingForm />
    </div>
  );
}

export default CreateListingPage;