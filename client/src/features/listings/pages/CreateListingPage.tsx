import { useForm } from "react-hook-form";

import toast from "react-hot-toast";

import { api } from "../api/api";

import { useAuthStore } from "../store/authStore";

type FormData = {
  title: string;
  description: string;
  price: number;
  image: string;
};

function CreateProductPage() {
  const { register, handleSubmit } =
    useForm<FormData>();

  const token = useAuthStore(
    (state) => state.token
  );

  const onSubmit = async (
    data: FormData
  ) => {
    try {
      await api.post(
        "/products",
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success(
        "Product created"
      );
    } catch (error) {
      toast.error(
        "Failed to create product"
      );
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">
        Create Product
      </h1>

      <form
        onSubmit={handleSubmit(
          onSubmit
        )}
        className="space-y-4"
      >
        <input
          {...register("title")}
          placeholder="Title"
          className="w-full p-3 rounded bg-zinc-900 border border-zinc-700"
        />

        <textarea
          {...register("description")}
          placeholder="Description"
          className="w-full p-3 rounded bg-zinc-900 border border-zinc-700 h-40"
        />

        <input
          {...register("price")}
          type="number"
          placeholder="Price"
          className="w-full p-3 rounded bg-zinc-900 border border-zinc-700"
        />

        <input
          {...register("image")}
          placeholder="Image URL"
          className="w-full p-3 rounded bg-zinc-900 border border-zinc-700"
        />

        <button
          className="w-full bg-white text-black p-3 rounded font-semibold"
        >
          Create Product
        </button>
      </form>
    </div>
  );
}

export default CreateProductPage;