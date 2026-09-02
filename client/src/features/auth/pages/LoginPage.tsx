import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "../../../shared/ui/Button";
import { useLoginMutation } from "../hooks/useLoginMutation";
import {
  loginSchema,
  type LoginFormValues,
} from "../schemas/loginSchema";

export const LoginPage = () => {
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const errorMessage =
    loginMutation.error instanceof Error
      ? loginMutation.error.message
      : "Unable to sign in.";

  const onSubmit = (values: LoginFormValues): void => {
    loginMutation.mutate(values, {
      onSuccess: () => {
        navigate("/");
      },
    });
  };

  return (
    <div>
      <div className="mb-8 text-center">
        <Link className="text-lg font-semibold" to="/">
          Marketplace
        </Link>
        <h1 className="mt-4 text-3xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-gray-600">
          Buy, sell, and rent with confidence.
        </p>
      </div>

      {loginMutation.error && (
        <p className="mb-5 text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      )}

      <form
        className="space-y-5"
        noValidate
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700" htmlFor="email">
            Email
          </label>

          <input
            id="email"
            type="email"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />

          {errors.email && (
            <p id="email-error" className="text-sm text-red-600" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700" htmlFor="password">
            Password
          </label>

          <input
            id="password"
            type="password"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password ? "password-error" : undefined
            }
            {...register("password")}
          />

          {errors.password && (
            <p id="password-error" className="text-sm text-red-600" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button
          className="w-full"
          type="submit"
          isLoading={loginMutation.isPending}
        >
          Login
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Don&apos;t have an account?{" "}
        <Link className="font-medium text-blue-600" to="/register">
          Register
        </Link>
      </p>
    </div>
  );
};
