import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { Button } from "../../../shared/ui/Button";
import { useRegisterMutation } from "../hooks/useRegisterMutation";
import {
  registerSchema,
  type RegisterFormValues,
} from "../schemas/registerSchema";

export const RegisterPage = () => {
  const navigate = useNavigate();
  const registerMutation = useRegisterMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const errorMessage =
    registerMutation.error instanceof Error
      ? registerMutation.error.message
      : "Unable to create account.";

  const onSubmit = (values: RegisterFormValues): void => {
    registerMutation.mutate(
      {
        email: values.email,
        password: values.password,
      },
      {
        onSuccess: () => {
          navigate("/");
        },
      },
    );
  };

  return (
    <main className="p-4">
      <h1 className="mb-4">Create Account</h1>

      {registerMutation.error && (
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

        <div>
          <label htmlFor="confirmPassword">Confirm Password</label>

          <input
            id="confirmPassword"
            type="password"
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={
              errors.confirmPassword ? "confirm-password-error" : undefined
            }
            {...register("confirmPassword")}
          />

          {errors.confirmPassword && (
            <p id="confirm-password-error" role="alert">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button type="submit" isLoading={registerMutation.isPending}>
          Create Account
        </Button>
      </form>
    </main>
  );
};
