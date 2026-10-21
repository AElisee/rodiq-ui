import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

// Numéros affichés : première, dernière et voisines de la page courante, « … » entre les trous
const getPageItems = (page: number, pageCount: number) => {
  const pages = [...new Set([1, page - 1, page, page + 1, pageCount])]
    .filter((p) => p >= 1 && p <= pageCount)
    .sort((a, b) => a - b);

  return pages.flatMap((p, i) => (i > 0 && p - pages[i - 1] > 1 ? (["…", p] as const) : [p]));
};

export const Pagination = ({ page, pageCount, onPageChange }: PaginationProps) => {
  if (pageCount <= 1) return null;

  const arrowClassName =
    "inline-flex size-11 items-center justify-center rounded-full border border-sand text-cocoa transition-colors hover:bg-sand disabled:pointer-events-none disabled:text-sand";

  return (
    <nav aria-label="Pagination" className="mt-16 flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Page précédente"
        className={arrowClassName}
      >
        <ChevronLeft className="size-4" strokeWidth={1.75} />
      </button>

      {getPageItems(page, pageCount).map((item, i) =>
        item === "…" ? (
          <span key={`gap-${i}`} className="px-1 font-sans text-sm text-taupe" aria-hidden>
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-label={`Page ${item}`}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              "inline-flex size-11 items-center justify-center rounded-full font-sans text-sm text-cocoa transition-colors hover:bg-sand",
              item === page && "bg-blush",
            )}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page === pageCount}
        aria-label="Page suivante"
        className={arrowClassName}
      >
        <ChevronRight className="size-4" strokeWidth={1.75} />
      </button>
    </nav>
  );
};
