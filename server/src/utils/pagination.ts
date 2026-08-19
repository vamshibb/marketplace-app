export interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  nextPage: number | null;
  previousPage: number | null;
}

export const buildPagination = (
  page: number,
  limit: number,
  totalItems: number
): Pagination => {
  const totalPages = totalItems === 0
    ? 0
    : Math.ceil(totalItems / limit);
  const hasNext = page < totalPages;
  const hasPrevious = page > 1;

  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNext,
    hasPrevious,
    nextPage: hasNext ? page + 1 : null,
    previousPage: hasPrevious ? page - 1 : null,
  };
};
