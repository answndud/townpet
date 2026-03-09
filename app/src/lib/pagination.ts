export function parsePositivePage(raw: string | null | undefined) {
  const normalized = typeof raw === "string" ? raw.trim() : "";
  if (normalized.length === 0) {
    return 1;
  }

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }

  return parsed;
}

export function shouldStripPageParam(raw: string | null | undefined) {
  const normalized = typeof raw === "string" ? raw.trim() : "";
  if (normalized.length === 0) {
    return false;
  }

  const parsed = Number.parseInt(normalized, 10);
  return !Number.isFinite(parsed) || parsed <= 1;
}

export function buildPaginationWindow(
  currentPage: number,
  totalPages: number,
  maxVisible = 5,
) {
  const safeTotalPages = Math.max(1, Math.floor(totalPages));
  const safeCurrentPage = Math.min(Math.max(1, Math.floor(currentPage)), safeTotalPages);
  const safeMaxVisible = Math.max(1, Math.floor(maxVisible));
  const startPage = Math.max(
    1,
    Math.min(safeCurrentPage - Math.floor(safeMaxVisible / 2), safeTotalPages - safeMaxVisible + 1),
  );
  const endPage = Math.min(safeTotalPages, startPage + safeMaxVisible - 1);

  return Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index);
}
