import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { ReactElement } from "react";

import { Button } from "../../../shared/ui/Button";
import { useRegisterMutation } from "../hooks/useRegisterMutation";
import {
  registerSchema,
  type RegisterFormValues,
} from "../schemas/registerSchema";

interface RegisterFormProps {
  onSuccess: () => void;
}

export const RegisterForm = ({ onSuccess }: RegisterFormProps): ReactElement => {
  const registerMutation = useRegisterMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: "",
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
        displayName: values.displayName,
        email: values.email,
        password: values.password,
      },
      {
        onSuccess: () => {
          onSuccess();
        },
      },
    );
  };

  return (
    <>
      {registerMutation.error && (
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
          <label className="block text-sm font-medium text-gray-700" htmlFor="displayName">
            Display Name
          </label>
          <input
            id="displayName"
            type="text"
            autoComplete="nickname"
            maxLength={100}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            aria-invalid={Boolean(errors.displayName)}
            aria-describedby={errors.displayName ? "display-name-error" : undefined}
            {...register("displayName")}
          />
          {errors.displayName && (
            <p id="display-name-error" className="text-sm text-red-600" role="alert">
              {errors.displayName.message}
            </p>
          )}
        </div>

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

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700" htmlFor="confirmPassword">
            Confirm Password
          </label>

          <input
            id="confirmPassword"
            type="password"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={
              errors.confirmPassword ? "confirm-password-error" : undefined
            }
            {...register("confirmPassword")}
          />

          {errors.confirmPassword && (
            <p
              id="confirm-password-error"
              className="text-sm text-red-600"
              role="alert"
            >
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button
          className="w-full"
          type="submit"
          isLoading={registerMutation.isPending}
        >
          Register
        </Button>
      </form>
    </>
  );
};
