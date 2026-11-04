import { useState, type FormEvent } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "../../../shared/ui/Button";

const publishableKey =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

const stripePromise = publishableKey
  ? loadStripe(publishableKey)
  : null;

type PaymentFormProps = {
  orderId: string;
  onConfirmed: () => Promise<void>;
  paymentKind?: "payment" | "deposit";
  submitLabel?: string;
};

const PaymentForm = ({
  orderId,
  onConfirmed,
  paymentKind = "payment",
  submitLabel = "Authorize payment",
}: PaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();

  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [message, setMessage] =
    useState<string | null>(null);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!stripe || !elements || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const returnUrl = new URL(
        "/orders",
        window.location.origin
      );

      returnUrl.searchParams.set("tab", "purchases");
      returnUrl.searchParams.set(
        "orderId",
        orderId
      );
      returnUrl.searchParams.set(
        "paymentReturn",
        paymentKind === "deposit"
          ? "deposit"
          : "1"
      );

      const { error } =
        await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: returnUrl.toString(),
          },
          redirect: "if_required",
        });

      if (error) {
        setMessage(
          error.message ??
          "Unable to authorize payment."
        );
        return;
      }

      await onConfirmed();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to authorize payment."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3"
    >
      <PaymentElement
        options={{
          layout: "accordion",
        }}
      />

      {message && (
        <p className="text-xs text-red-600">
          {message}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        isLoading={isSubmitting}
        disabled={!stripe || !elements}
      >
        {submitLabel}
      </Button>
    </form>
  );
};

type OrderPaymentFormProps = {
  orderId: string;
  clientSecret: string;
  onConfirmed: () => Promise<void>;
  paymentKind?: "payment" | "deposit";
  submitLabel?: string;
};

export const OrderPaymentForm = ({
  orderId,
  clientSecret,
  onConfirmed,
  paymentKind = "payment",
  submitLabel = "Authorize payment",
}: OrderPaymentFormProps) => {
  if (!stripePromise) {
    return (
      <p className="text-xs text-red-600">
        Stripe payment configuration is unavailable.
      </p>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
      }}
    >
      <PaymentForm
        orderId={orderId}
        onConfirmed={onConfirmed}
        paymentKind={paymentKind}
        submitLabel={submitLabel}
      />
    </Elements>
  );
};