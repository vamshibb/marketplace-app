import { useForm } from "react-hook-form";

type ListingFormData = {
  title: string;
  description: string;
  image: string;
  price: number;
};

function ListingForm() {
  const {
    register,
    handleSubmit,
  } = useForm<ListingFormData>();

  const onSubmit = (
    data: ListingFormData
  ) => {
    console.log(data);
  };

  return (
    <form
      className="space-y-8"
      onSubmit={handleSubmit(onSubmit)}
    >
      {/* Listing Details */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-xl font-semibold">
          Listing Details
        </h2>

        <p className="mt-1 text-sm text-zinc-400">
          Tell renters what you're offering.
        </p>

        <div className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="title"
              className="mb-2 block text-sm font-medium"
            >
              Item Name
            </label>

            <input
              id="title"
              type="text"
              placeholder="e.g. Canon EOS R6 Camera"
              {...register("title")}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none transition focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium"
            >
              Description
            </label>

            <textarea
              id="description"
              rows={5}
              placeholder="Describe your rental item..."
              {...register("description")}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none transition focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="image"
              className="mb-2 block text-sm font-medium"
            >
              Image URL
            </label>

            <input
              id="image"
              type="text"
              placeholder="https://example.com/image.jpg"
              {...register("image")}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none transition focus:border-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-xl font-semibold">
          Rental Pricing
        </h2>

        <p className="mt-1 text-sm text-zinc-400">
          Set the rental price for your item.
        </p>

        <div className="mt-6">
          <label
            htmlFor="price"
            className="mb-2 block text-sm font-medium"
          >
            Rental Price (CAD)
          </label>

          <input
            id="price"
            type="number"
            placeholder="0.00"
            {...register("price", {
              valueAsNumber: true,
            })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none transition focus:border-blue-500"
          />
        </div>
      </section>

      {/* Actions */}
      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Publish Rental Listing
        </button>
      </div>
    </form>
  );
}

export default ListingForm;