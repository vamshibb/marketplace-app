import type { ProductMedia } from "../types";
import { ProductImage } from "./ProductImage";

interface ProductGalleryProps {
  media: ProductMedia[];
}

export const ProductGallery = ({ media }: ProductGalleryProps) => {
  const firstImage = media.find((item) => item.mediaType === "IMAGE");

  return (
    <div className="aspect-[4/3] overflow-hidden rounded-lg">
      <ProductImage url={firstImage?.url} alt="Product image" />
    </div>
  );
};
