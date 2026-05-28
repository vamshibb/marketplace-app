import { useForm } from "react-hook-form";
import { api } from "../api/api";

type FormData = {
  email: string;
  password: string;
};

function RegisterPage() {
  const {
    register,
    handleSubmit,
  } = useForm<FormData>();

  const onSubmit = async (
    data: FormData
  ) => {
    try {
      const response =
        await api.post(
          "/auth/register",
          data
        );

      console.log(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-4xl font-bold mb-8">
        Register
      </h1>

      <form
        onSubmit={handleSubmit(
          onSubmit
        )}
        className="space-y-4"
      >
        <input
          {...register("email")}
          placeholder="Email"
          className="w-full p-3 rounded bg-zinc-900 border border-zinc-700"
        />

        <input
          {...register("password")}
          type="password"
          placeholder="Password"
          className="w-full p-3 rounded bg-zinc-900 border border-zinc-700"
        />

        <button
          className="w-full bg-white text-black p-3 rounded font-semibold"
        >
          Register
        </button>
      </form>
    </div>
  );
}

export default RegisterPage;