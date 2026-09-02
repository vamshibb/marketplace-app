import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

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
    <main className="p-4">
      <h1 className="mb-4">Sign In</h1>

      {loginMutation.error && (
        <p className="mb-4" role="alert">
          {errorMessage}
        </p>
      )}

      <form
        className="space-y-4"
        noValidate
        onSubmit={handleSubmit(onSubmit)}
      >
        <div>
          <label htmlFor="email">Email</label>

          <input
            id="email"
            type="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />

          {errors.email && (
            <p id="email-error" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password">Password</label>

          <input
            id="password"
            type="password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password ? "password-error" : undefined
            }
            {...register("password")}
          />

          {errors.password && (
            <p id="password-error" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button type="submit" isLoading={loginMutation.isPending}>
          Login
        </Button>
      </form>
    </main>
  );
};
