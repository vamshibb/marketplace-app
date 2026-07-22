export interface Seller {
  id: string;
  email: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  image: string | null;

  seller: Seller;
}