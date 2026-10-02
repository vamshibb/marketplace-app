import { useEffect, useId, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "../../../shared/ui/Button";
import { createOrderRequestSchema, type OrderRequestValues } from "../schemas/orderRequestSchema";
import { useCreateOrderMutation } from "../hooks/useCreateOrderMutation";
import { rentalDuration } from "../utils/rentalDuration";
import { RentalCalendar } from "./RentalCalendar";
import { useRentalAvailability } from "../hooks/useRentalAvailability";
import { monthStart, requiredAvailabilityMonths, utcToday } from "../utils/rentalCalendarDates";
import { rentalRangeError } from "../utils/rentalRangeAvailability";
import type { OrderRequestProduct } from "./RequestOrderButton";

export const OrderRequestModal = ({ product, onClose }: { product: OrderRequestProduct; onClose: () => void }) => {
  const isRental = product.listingType === "RENT";
  const dialogRef = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  const id = useId();
  const mutation = useCreateOrderMutation(product.id, product.sellerId, onClose);
  const { register, control, handleSubmit, setValue, formState: { errors } } = useForm<OrderRequestValues>({
    resolver: zodResolver(createOrderRequestSchema(product)), defaultValues: { quantity: 1, notes: "" },
  });
  const quantity = useWatch({ control, name: "quantity" });
  const [from, to] = useWatch({ control, name: ["requestedFrom", "requestedTo"] });
  const [month, setMonth] = useState(() => monthStart(utcToday()));
  const availability = useRentalAvailability(product.id, isRental ? requiredAvailabilityMonths(month, from, to) : [], month);
  const rangeError = isRental ? rentalRangeError(product, quantity, from, to, availability.days) : null;
  const rentalBlocked = isRental && Boolean(rangeError);
  const days = isRental ? rentalDuration(from, to) : 1;
  const total = Number.isInteger(quantity) && quantity > 0 && days !== null
    ? Math.round(product.price * 100) * quantity * days / 100 : null;
  const money = (value: number) => "$" + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  useEffect(() => {
    const dialog = dialogRef.current;
    const focus = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (focus instanceof HTMLElement && focus.isConnected) focus.focus();
    };
  }, []);
  const submit = async (values: OrderRequestValues) => {
    if (submitting.current || mutation.isPending || rentalBlocked) return;
    submitting.current = true;
    try { await mutation.mutateAsync(isRental ? values : { quantity: values.quantity, notes: values.notes }); }
    catch { /* Mutation supplies toast; keep the entered values. */ }
    finally { submitting.current = false; }
  };
  return <dialog ref={dialogRef} aria-labelledby={id + "-heading"}
    onCancel={event => { event.preventDefault(); if (!submitting.current) onClose(); }}
    className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl backdrop:bg-black/50">
    <h2 id={id + "-heading"} className="text-xl font-semibold text-slate-900">{isRental ? "Request Rental" : "Request Purchase"}</h2>
    <p className="mt-2 font-medium wrap-anywhere text-slate-800">{product.title}</p>
    <p className="mt-1 text-sm text-slate-500">{isRental ? "Price per day" : "Unit price"}: {money(product.price)}</p>
    <form noValidate onSubmit={event => { void handleSubmit(submit)(event); }} className="mt-4 space-y-4">
      {isRental && <RentalCalendar product={product} month={month} onMonthChange={setMonth}
        from={from} to={to} quantity={quantity} availability={availability.days}
        loading={availability.isPending} error={availability.isError} retrying={availability.isFetching}
        onRetry={() => { void availability.retry(); }} disabled={mutation.isPending} rangeError={rangeError}
        onSelect={(start, end) => {
          setValue("requestedFrom", start, { shouldDirty: true });
          setValue("requestedTo", end, { shouldDirty: true });
        }} />}
      <div>
        <label htmlFor={id + "-quantity"} className="mb-1 block text-sm font-medium">Quantity</label>
        <input id={id + "-quantity"} type="number" min={1} max={isRental ? product.quantityAvailable : undefined} step={1} disabled={mutation.isPending}
          {...register("quantity", { valueAsNumber: true })}
          aria-invalid={Boolean(errors.quantity)} aria-describedby={errors.quantity ? id + "-quantity-error" : undefined}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline-2 focus-visible:outline-blue-600" />
        {errors.quantity && <p id={id + "-quantity-error"} role="alert" className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>}
      </div>
      <div>
        <label htmlFor={id + "-notes"} className="mb-1 block text-sm font-medium">Notes (optional)</label>
        <textarea id={id + "-notes"} rows={3} maxLength={1000} disabled={mutation.isPending} {...register("notes")}
          aria-invalid={Boolean(errors.notes)} aria-describedby={errors.notes ? id + "-notes-error" : undefined}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline-2 focus-visible:outline-blue-600" />
        {errors.notes && <p id={id + "-notes-error"} role="alert" className="mt-1 text-sm text-red-600">{errors.notes.message}</p>}
      </div>
      {isRental && <dl aria-live="polite" className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 text-sm">
        <div><dt className="text-slate-500">From</dt><dd>{from || "Choose start"}</dd></div>
        <div><dt className="text-slate-500">Return</dt><dd>{to || "Choose return"}</dd></div>
        <div><dt className="text-slate-500">Duration</dt><dd>{days === null ? "Choose dates" : `${days} ${days === 1 ? "day" : "days"}`}</dd></div>
        <div><dt className="text-slate-500">Quantity</dt><dd>{Number.isInteger(quantity) && quantity > 0 ? quantity : "Enter quantity"}</dd></div>
        <div><dt className="text-slate-500">Price per day</dt><dd>{money(product.price)}</dd></div>
      </dl>}
      <p aria-live="polite" className="flex justify-between border-t border-slate-200 pt-3 font-semibold"><span>{isRental ? "Estimated total" : "Total"}</span><span className="text-blue-600">{total === null ? "—" : money(total)}</span></p>
      {mutation.isError && <p role="alert" className="text-sm text-red-600">Unable to send your request. Your entries have been kept.</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" disabled={mutation.isPending} onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={mutation.isPending || rentalBlocked} aria-busy={mutation.isPending || undefined}>{mutation.isPending ? "Sending..." : isRental ? "Send Rental Request" : "Send request"}</Button>
      </div>
    </form>
  </dialog>;
};
