import { useParams } from "react-router-dom";

import { useProductQuery } from "../hooks/useProductQuery";

export const ProductDetailPage = () => {
  const { id } = useParams();
  const productQuery = useProductQuery(id);

  if (!id) {
    return <p>Product ID is required</p>;
  }

  if (productQuery.isPending) {
    return <p>Loading...</p>;
  }

  if (productQuery.isError) {
    return <p role="alert">{productQuery.error.message}</p>;
  }

  const product = productQuery.data;

  return (
    <main className="space-y-2">
      <h1>{product.title}</h1>
      <p>{product.description}</p>
      <p>Price: {product.price}</p>
      <p>Average Rating: {product.averageRating}</p>
      <p>Review Count: {product.reviewCount}</p>
    </main>
  );
};
