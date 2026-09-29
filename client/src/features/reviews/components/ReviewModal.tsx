import { useEffect, useId, useRef, type ReactElement } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Star } from "lucide-react";
import { Button } from "../../../shared/ui/Button";
import { reviewSchema, type ReviewValues } from "../schemas/reviewSchema";
import { useCreateReviewMutation } from "../hooks/useCreateReviewMutation";
import type { ReviewTarget } from "../types";

interface ReviewModalProps {
  orderId: string;
  target: ReviewTarget;
  onClose: () => void;
}

export const ReviewModal = ({ orderId, target, onClose }: ReviewModalProps): ReactElement => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  const id = useId();
  const mutation = useCreateReviewMutation(orderId, target === "product" ? "product" : "user", onClose);
  const { register, control, handleSubmit, formState: { errors } } = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema), defaultValues: { rating: 0, comment: "" },
  });
  const rating = useWatch({ control, name: "rating" });
  const comment = useWatch({ control, name: "comment" });
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
  const submit = async (values: ReviewValues) => {
    if (submitting.current || mutation.isPending) return;
    submitting.current = true;
    try { await mutation.mutateAsync(values); }
    catch { /* The mutation reports errors; preserve the form for retry. */ }
    finally { submitting.current = false; }
  };
  const title = target === "product" ? "Review Product" : target === "seller" ? "Review Seller" : "Review Buyer";
  return <dialog ref={dialogRef} aria-labelledby={id + "-heading"}
    onCancel={event => { event.preventDefault(); if (!submitting.current && !mutation.isPending) onClose(); }}
    className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl backdrop:bg-black/50">
    <h2 id={id + "-heading"} className="text-xl font-semibold text-slate-900">{title}</h2>
    <form noValidate onSubmit={event => { void handleSubmit(submit)(event); }} className="mt-4 space-y-4">
      <fieldset disabled={mutation.isPending} aria-describedby={errors.rating ? id + "-rating-error" : undefined}>
        <legend className="mb-2 text-sm font-medium text-slate-700">Rating (required)</legend>
        <div className="flex gap-2">
          <Controller control={control} name="rating" render={({ field }) => <>{[1, 2, 3, 4, 5].map(value => <label key={value} className="cursor-pointer rounded-md p-1 has-focus-visible:outline-2 has-focus-visible:outline-blue-600">
            <input type="radio" name={field.name} value={value} checked={field.value === value}
              onChange={() => field.onChange(value)} onBlur={field.onBlur} ref={value === 1 ? field.ref : undefined}
              aria-label={`${value} ${value === 1 ? "star" : "stars"}`} aria-invalid={Boolean(errors.rating)} className="sr-only" />
            <Star aria-hidden="true" className={`size-8 ${value <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
          </label>)}</>} />
        </div>
        {errors.rating && <p id={id + "-rating-error"} role="alert" className="mt-1 text-sm text-red-600">{errors.rating.message}</p>}
      </fieldset>
      <div>
        <label htmlFor={id + "-comment"} className="mb-1 block text-sm font-medium text-slate-700">Comment (optional)</label>
        <textarea id={id + "-comment"} rows={4} maxLength={1000} disabled={mutation.isPending} {...register("comment")}
          aria-invalid={Boolean(errors.comment)} aria-describedby={id + "-comment-count" + (errors.comment ? " " + id + "-comment-error" : "")}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline-2 focus-visible:outline-blue-600" />
        <p id={id + "-comment-count"} className="mt-1 text-xs text-slate-500">{comment?.length ?? 0}/1000 characters</p>
        {errors.comment && <p id={id + "-comment-error"} role="alert" className="mt-1 text-sm text-red-600">{errors.comment.message}</p>}
      </div>
      {mutation.isError && <p role="alert" className="text-sm text-red-600">Unable to submit your review. Your entries have been kept.</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" disabled={mutation.isPending} onClick={() => { if (!submitting.current) onClose(); }}>Cancel</Button>
        <Button type="submit" disabled={mutation.isPending} aria-busy={mutation.isPending || undefined}>{mutation.isPending ? "Submitting..." : "Submit Review"}</Button>
      </div>
    </form>
  </dialog>;
};
