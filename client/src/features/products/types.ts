export interface ProductSeller {
  id: string;
  email: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
}

export interface ProductMedia {
  id: string;
  url: string;
  mediaType: "IMAGE" | "VIDEO";
  sortOrder: number;
}

export interface ProductReview {
  id: string;
  rating: number;
  comment: string | null;
  userId: string;
  productId: string;
  createdAt: string;
  updatedAt: string;
  user: ProductSeller;
}

export interface ProductSummary {
  id: string;
  title: string;
  description: string;
  price: number;
  sellerId: string;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
  seller: ProductSeller;
  category: ProductCategory | null;
  media: ProductMedia[];
}

export interface ProductDetail extends ProductSummary {
  reviews: ProductReview[];
  reviewCount: number;
  averageRating: number;
}

export interface ProductFormRequest {
  title: string;
  description: string;
  price: number;
  categoryId: string;
}
