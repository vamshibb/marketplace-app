import { useId, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../../../shared/ui/Button";
import { monthStart, requiredAvailabilityMonths, rentalDuration, useRentalAvailability, utcToday } from "../../orders/availability";
import { useAvailabilityBlocksQuery } from "../hooks/useAvailabilityBlocksQuery";
import { blockMutationError, isAvailabilityForbidden, useAvailabilityBlockMutations } from "../hooks/useAvailabilityBlockMutations";
import { availabilityBlockSchema, type AvailabilityBlockValues } from "../schemas/availabilityBlockSchema";
import { blockRangeError } from "../utils/availabilityBlockRange";
import { OwnerAvailabilityCalendar } from "./OwnerAvailabilityCalendar";
import { AvailabilityBlocksList } from "./AvailabilityBlocksList";
import type { ProductDetail } from "../types";

export const AvailabilityBlockManager = ({ product, userId }: { product: ProductDetail; userId: string }) => {
  const id = useId();
  const submitting = useRef(false);
  const blocks = useAvailabilityBlocksQuery(product.id, userId);
  const { control, register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<AvailabilityBlockValues>({
    resolver: zodResolver(availabilityBlockSchema(product.quantityAvailable)),
    defaultValues: { blockedFrom: "", blockedTo: "", quantity: 1, reason: "" },
  });
  const [from, to, quantity, reason] = useWatch({ control, name: ["blockedFrom", "blockedTo", "quantity", "reason"] });
  const mutations = useAvailabilityBlockMutations(product.id, userId, () => reset({ blockedFrom: "", blockedTo: "", quantity, reason: "" }));
  const [month, setMonth] = useState(() => monthStart(utcToday()));
  const forbidden = [blocks.error, mutations.create.error, mutations.remove.error].some(isAvailabilityForbidden);
  const availability = useRentalAvailability(product.id, !forbidden && blocks.isSuccess ? requiredAvailabilityMonths(month, from, to) : [], month);
  const rangeError = blockRangeError(product.quantityAvailable, quantity, from, to, availability.days);
  const busy = isSubmitting || mutations.create.isPending || mutations.remove.isPending;
  const duration = rentalDuration(from, to);
  const submit = async (values: AvailabilityBlockValues) => {
    if (submitting.current || mutations.create.isPending || mutations.remove.isPending || rangeError) return;
    submitting.current = true;
    try { await mutations.create.mutateAsync(values); }
    catch { /* Keep the form and selection; the mutation reports the error. */ }
    finally { submitting.current = false; }
  };
  const remove = async (blockId: string) => {
    if (submitting.current || busy) return;
    submitting.current = true;
    try { await mutations.remove.mutateAsync(blockId); }
    catch { /* Preserve the block list and show the mutation error. */ }
    finally { submitting.current = false; }
  };
  if (forbidden) return <p role="alert">You cannot manage this listing</p>;
  if (blocks.isPending) return <p role="status">Loading owner blocks...</p>;
  if (blocks.isError) return <div role="alert" className="space-y-3"><p>Unable to load owner blocks.</p><Button variant="secondary" disabled={blocks.isFetching} onClick={() => { void blocks.refetch(); }}>Retry blocks</Button></div>;
  return <div>
    <form noValidate onSubmit={event => { void handleSubmit(submit)(event); }} className="grid items-stretch gap-4 md:grid-cols-2">
      <OwnerAvailabilityCalendar month={month} onMonthChange={setMonth} from={from} to={to} quantity={quantity} totalQuantity={product.quantityAvailable}
        days={availability.days} loading={availability.isPending} error={availability.isError} retrying={availability.isFetching}
        onRetry={() => { void availability.retry(); }} disabled={busy}
        onSelect={(start, end) => {
          setValue("blockedFrom", start, { shouldDirty: true });
          setValue("blockedTo", end, { shouldDirty: true });
          mutations.create.reset();
        }} />
      <div className="h-full min-w-0 rounded-xl border border-slate-200 bg-white p-3">
        <section aria-labelledby={id + "-create"} className="space-y-3">
          <h2 id={id + "-create"} className="font-semibold text-slate-900">Create availability block</h2>
          <p className="text-sm text-slate-600">End date is not blocked. Nov 10 &rarr; Nov 13 blocks Nov 10&ndash;12.</p>
          <div>
            <label htmlFor={id + "-quantity"} className="mb-1 block text-sm font-medium">Quantity</label>
            <input id={id + "-quantity"} type="number" min={1} max={product.quantityAvailable} step={1} disabled={busy} {...register("quantity", { valueAsNumber: true })} aria-invalid={Boolean(errors.quantity)} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline-2 focus-visible:outline-blue-600" />
            {errors.quantity && <p role="alert" className="text-sm text-red-600">{errors.quantity.message}</p>}
          </div>
          <div>
            <label htmlFor={id + "-reason"} className="mb-1 block text-sm font-medium">Reason (optional)</label>
            <textarea id={id + "-reason"} rows={2} maxLength={200} disabled={busy} {...register("reason")} aria-invalid={Boolean(errors.reason)} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline-2 focus-visible:outline-blue-600" />
            {errors.reason && <p role="alert" className="text-sm text-red-600">{errors.reason.message}</p>}
          </div>
          <dl aria-live="polite" className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-200 pt-2 text-xs tabular-nums lg:grid-cols-4">
            <div><dt className="text-slate-500">From</dt><dd>{from || "Choose start"}</dd></div>
            <div><dt className="text-slate-500">To (exclusive)</dt><dd>{to || "Choose end"}</dd></div>
            <div><dt className="text-slate-500">Duration</dt><dd>{duration === null ? "Choose dates" : `${duration} ${duration === 1 ? "day" : "days"}`}</dd></div>
            <div><dt className="text-slate-500">Quantity</dt><dd>{Number.isInteger(quantity) && quantity > 0 ? quantity : "Enter quantity"}</dd></div>
            {reason.trim() && <div className="col-span-2 lg:col-span-4"><dt className="text-slate-500">Reason</dt><dd className="whitespace-pre-wrap wrap-anywhere">{reason.trim()}</dd></div>}
          </dl>
          {rangeError && <p role="alert" className="text-sm text-red-600">{rangeError}</p>}
          {rangeError && from && to && <Button size="sm" variant="link" disabled={busy} onClick={() => { void availability.retry(); }}>Retry failed availability</Button>}
          {mutations.create.isError && <p role="alert" className="text-sm text-red-600">{blockMutationError(mutations.create.error)}</p>}
          <Button type="submit" disabled={busy || Boolean(rangeError)}>{mutations.create.isPending ? "Blocking..." : "Block Availability"}</Button>
        </section>
      </div>
    </form>
    <div className="mt-4 space-y-2">
      {mutations.remove.isError && <p role="alert" className="text-sm text-red-600">{blockMutationError(mutations.remove.error)}</p>}
      <AvailabilityBlocksList blocks={blocks.data} pending={busy} onRemove={blockId => { void remove(blockId); }} />
    </div>
  </div>;
};
