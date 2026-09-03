interface ProductImageProps {
  url?: string;
  alt: string;
}

export const ProductImage = ({ url, alt }: ProductImageProps) => {
  if (url) {
    return <img
      src={url}
      alt={alt}
      loading="lazy"
      className="h-full w-full object-cover"
    />;
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg border bg-gray-50">
      <span aria-hidden="true">📦</span>
      <p>No Image Available</p>
    </div>
  );
};
