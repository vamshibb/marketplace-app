export interface AvailabilityBlock {
  id: string;
  productId: string;
  blockedFrom: string;
  blockedTo: string;
  quantity: number;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAvailabilityBlock {
  blockedFrom: string;
  blockedTo: string;
  quantity: number;
  reason?: string;
}
