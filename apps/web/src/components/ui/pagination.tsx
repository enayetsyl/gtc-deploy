"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

type PaginationProps = {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  className?: string;
};

function getPageList(page: number, totalPages: number) {
  if (totalPages <= 7)
    return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages: Array<number | "..."> = [];
  pages.push(1);

  if (page > 4) pages.push("...");

  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (page < totalPages - 3) pages.push("...");

  pages.push(totalPages);
  return pages;
}

export function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pages = React.useMemo(
    () => getPageList(page, totalPages),
    [page, totalPages]
  );

  if (totalPages <= 1) return null;

  return (
    <nav className={className} aria-label="Pagination">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          aria-label="Previous page"
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pages.map((p, idx) =>
          p === "..." ? (
            <span
              key={`dots-${idx}`}
              className="px-2 text-sm text-muted-foreground"
            >
              <MoreHorizontal className="h-4 w-4 inline-block align-middle" />
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? undefined : "outline"}
              size="sm"
              onClick={() => onPageChange(p as number)}
              aria-current={p === page ? "page" : undefined}
              className={
                p === page ? "bg-brand-blue-500 text-white" : undefined
              }
            >
              {p}
            </Button>
          )
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          aria-label="Next page"
          disabled={page >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}

export default Pagination;
