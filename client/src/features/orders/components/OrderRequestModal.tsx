import { useEffect, useId, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "../../../shared/ui/Button";
import { orderRequestSchema, type OrderRequestValues } from "../schemas/orderRequestSchema";
import { useCreateOrderMutation } from "../hooks/useCreateOrderMutation";
import type { OrderRequestProduct } from "./RequestOrderButton";

export const OrderRequestModal = ({ product, onClose }: { product: OrderRequestProduct; onClose: () => void }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  const id = useId();
  const mutation = useCreateOrderMutation(product.id, product.sellerId, onClose);
  const { register, control, handleSubmit, formState: { errors } } = useForm<OrderRequestValues>({
    resolver: zodResolver(orderRequestSchema), defaultValues: { quantity: 1, notes: "" },
  });
  const quantity = useWatch({ control, name: "quantity" });
  const total = Number.isInteger(quantity) && quantity > 0 ? Math.round(product.price * 100) * quantity / 100 : null;
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
    if (submitting.current || mutation.isPending) return;
    submitting.current = true;
    try { await mutation.mutateAsync(values); }
    catch { /* Mutation supplies toast; keep the entered values. */ }
    finally { submitting.current = false; }
  };
  return <dialog ref={dialogRef} aria-labelledby={id + "-heading"}
    onCancel={event => { event.preventDefault(); if (!submitting.current) onClose(); }}
    className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl backdrop:bg-black/50">
    <h2 id={id + "-heading"} className="text-xl font-semibold text-slate-900">Request Order</h2>
    <p className="mt-2 font-medium wrap-anywhere text-slate-800">{product.title}</p>
    <p className="mt-1 text-sm text-slate-500">Unit price: {money(product.price)}</p>
    <form noValidate onSubmit={event => { void handleSubmit(submit)(event); }} className="mt-4 space-y-4">
      <div>
        <label htmlFor={id + "-quantity"} className="mb-1 block text-sm font-medium">Quantity</label>
        <input id={id + "-quantity"} type="number" min={1} step={1} disabled={mutation.isPending}
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
      <p aria-live="polite" className="flex justify-between border-t border-slate-200 pt-3 font-semibold"><span>Total</span><span className="text-blue-600">{total === null ? "—" : money(total)}</span></p>
      {mutation.isError && <p role="alert" className="text-sm text-red-600">Unable to send your request. Your entries have been kept.</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" disabled={mutation.isPending} onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={mutation.isPending} aria-busy={mutation.isPending || undefined}>{mutation.isPending ? "Sending..." : "Send request"}</Button>
      </div>
    </form>
  </dialog>;
};
