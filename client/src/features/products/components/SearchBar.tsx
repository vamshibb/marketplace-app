import type { ChangeEvent } from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export const SearchBar = ({ value, onChange }: SearchBarProps) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onChange(event.target.value);
  };

  return (
    <input
      className="w-full rounded-lg border px-4 py-3"
      type="search"
      value={value}
      placeholder="Search products"
      aria-label="Search products"
      onChange={handleChange}
    />
  );
};
