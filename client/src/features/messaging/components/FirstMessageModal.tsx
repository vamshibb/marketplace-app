import { useEffect, useId, useRef, type ReactElement } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "../../../shared/ui/Button";
import { useCreateConversationMutation } from "../hooks/useCreateConversationMutation";
import { messageSchema, type MessageFormValues } from "../schemas/messageSchema";

interface FirstMessageModalProps {
  productId: string;
  sellerId: string;
  sellerLabel?: string;
  onClose: () => void;
}

export const FirstMessageModal = ({ productId, sellerId, sellerLabel, onClose }: FirstMessageModalProps): ReactElement => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();
  const mutation = useCreateConversationMutation(productId, sellerId, onClose);
  const { register, handleSubmit, formState: { errors } } = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema), defaultValues: { content: "" },
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return <dialog ref={dialogRef} aria-labelledby={`${id}-heading`}
    className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl backdrop:bg-black/50"
    onCancel={(event) => {
      event.preventDefault();
      if (!mutation.isPending) onClose();
    }}>
    <h2 id={`${id}-heading`} className="text-2xl font-semibold">Contact Seller</h2>
    {sellerLabel && <p className="mt-2 text-sm wrap-anywhere text-slate-600">{sellerLabel}</p>}
    <form noValidate className="mt-4 space-y-3" onSubmit={handleSubmit((values) => {
      if (!mutation.isPending) mutation.mutate(values);
    })}>
      <label htmlFor={`${id}-content`} className="block text-sm font-medium text-slate-700">Message</label>
      <textarea id={`${id}-content`} rows={3} maxLength={5000} disabled={mutation.isPending}
        className="w-full rounded-lg border border-slate-300 p-3 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-60"
        aria-invalid={Boolean(errors.content)} aria-describedby={errors.content ? `${id}-error` : undefined}
        {...register("content")} />
      {errors.content && <p id={`${id}-error`} role="alert" className="text-sm text-red-600">{errors.content.message}</p>}
      {mutation.isError && <p role="alert" className="text-sm text-red-600">Unable to send your message. Please try again. Your draft has been kept.</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" disabled={mutation.isPending} onClick={onClose}>Cancel</Button>
        <Button type="submit" isLoading={mutation.isPending}>Send Message</Button>
      </div>
    </form>
  </dialog>;
};
