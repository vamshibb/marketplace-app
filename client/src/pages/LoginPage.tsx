import { useForm } from "react-hook-form";
import { api } from "../api/api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { useAuthStore } from "../store/authStore";

type FormData = {
  email: string;
  password: string;
};

function LoginPage() {
  const {
    register,
    handleSubmit,
  } = useForm<FormData>();

  const setAuth =
    useAuthStore(
      (state) => state.setAuth
    );

  const navigate = useNavigate();

  const onSubmit = async (
    data: FormData
  ) => {
    try {
      const response =
        await api.post(
          "/auth/login",
          data
        );

      setAuth(
        response.data.data.user,
        response.data.data.token
      );

      toast.success("Login successful");

      navigate("/dashboard");
    } catch (error) {
      toast.error("Invalid email or password");
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-4xl font-bold mb-8">
        Login
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
          Login
        </button>
      </form>
    </div>
  );
}

export default LoginPage;