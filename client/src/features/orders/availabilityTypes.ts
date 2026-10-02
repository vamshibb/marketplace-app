export interface AvailabilityDay {
  date: string;
  reservedQuantity: number;
  availableQuantity: number;
  status: "AVAILABLE" | "PARTIAL" | "FULL";
}

export interface ProductAvailability {
  productId: string;
  from: string;
  to: string;
  quantityAvailable: number;
  days: AvailabilityDay[];
}
