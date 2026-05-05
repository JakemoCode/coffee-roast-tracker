import styles from "./Pagination.module.css";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (current > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("ellipsis");
  }

  pages.push(total);
  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);
  const isFirst = currentPage === 1;
  const isLast = currentPage === totalPages;

  return (
    <nav
      className={styles.container}
      aria-label="Pagination"
      data-testid="pagination"
    >
      <button
        type="button"
        className={`${styles.button} ${styles.navButton}`}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={isFirst}
        aria-label="Previous page"
      >
        {"\u2039"} Previous
      </button>

      <ol className={styles.pages}>
        {pages.map((page, index) => {
          if (page === "ellipsis") {
            return (
              <li key={`ellipsis-${index}`} className={styles.ellipsis} aria-hidden="true">
                {"\u2026"}
              </li>
            );
          }

          const isCurrent = page === currentPage;
          return (
            <li key={page}>
              <button
                type="button"
                className={`${styles.button} ${styles.pageButton} ${isCurrent ? styles.active : ""}`}
                onClick={() => onPageChange(page)}
                aria-label={`Page ${page}`}
                aria-current={isCurrent ? "page" : undefined}
              >
                {page}
              </button>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        className={`${styles.button} ${styles.navButton}`}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={isLast}
        aria-label="Next page"
      >
        Next {"\u203A"}
      </button>
    </nav>
  );
}
