export type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  image?: string;

  seller: {
    email: string;
  };
};