export interface AvailabilityDayDTO {
  date: string;
  reservedQuantity: number;
  availableQuantity: number;
  status: "AVAILABLE" | "PARTIAL" | "FULL";
}

export interface ProductAvailabilityDTO {
  productId: string;
  from: string;
  to: string;
  quantityAvailable: number;
  days: AvailabilityDayDTO[];
}
