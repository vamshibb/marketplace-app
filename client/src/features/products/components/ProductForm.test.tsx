import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { api } from "../../../shared/api/axios";
import { createTestQueryClient, queryWrapper } from "../../../test/queryClient";
import { ProductForm, type ProductFormInitialValues } from "./ProductForm";

const initialValues: ProductFormInitialValues = {
  title: "Camera", description: "A camera in good condition", price: 20,
  categoryId: "00000000-0000-4000-8000-000000000001", listingType: "RENT",
  quantityAvailable: 2, minRentalDays: 1, maxRentalDays: 7,
};

const setup = async () => {
  vi.spyOn(api, "get").mockResolvedValue({ data: { data: [
    { id: initialValues.categoryId, name: "Electronics", slug: "electronics" },
  ] } });
  const onSubmit = vi.fn();
  const props = { initialValues, onSubmit, isPending: false, submitLabel: "Save Changes", pendingLabel: "Saving..." };
  const view = render(<ProductForm {...props} />, { wrapper: queryWrapper(createTestQueryClient()) });
  await screen.findByRole("option", { name: "Electronics" });
  return { ...view, props, onSubmit, user: userEvent.setup() };
};

it("preserves unsaved edits when a parent rerenders with equivalent initial values", async () => {
  const { user, rerender, props, onSubmit } = await setup();
  await user.clear(screen.getByLabelText("Title"));
  await user.type(screen.getByLabelText("Title"), "My edited camera");
  await user.clear(screen.getByLabelText("Price per day"));
  await user.type(screen.getByLabelText("Price per day"), "35");

  rerender(<ProductForm {...props} initialValues={{ ...initialValues }} errorMessage="Parent updated" />);

  expect(screen.getByRole<HTMLInputElement>("textbox", { name: "Title" }).value).toBe("My edited camera");
  expect(screen.getByRole<HTMLInputElement>("spinbutton", { name: "Price per day" }).value).toBe("35");
  await user.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ ...initialValues, title: "My edited camera", price: 35 }));
});

it("initializes genuinely changed product data after an unsaved edit", async () => {
  const { user, rerender, props, onSubmit } = await setup();
  await user.clear(screen.getByLabelText("Title"));
  await user.type(screen.getByLabelText("Title"), "Unsaved title");
  const next: ProductFormInitialValues = {
    ...initialValues, title: "Tripod", description: "A different product", price: 80,
    quantityAvailable: 4, minRentalDays: 2, maxRentalDays: 14,
  };

  rerender(<ProductForm {...props} initialValues={next} />);

  expect(screen.getByRole<HTMLInputElement>("textbox", { name: "Title" }).value).toBe("Tripod");
  expect(screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Description" }).value).toBe(next.description);
  await user.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(next));
});
