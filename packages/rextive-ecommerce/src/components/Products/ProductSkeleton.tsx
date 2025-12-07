import { memo } from "react";

interface ProductSkeletonProps {
  index: number;
}

export const ProductSkeleton = memo(function ProductSkeleton({ index }: ProductSkeletonProps) {
  return (
    <div
      className="card overflow-hidden animate-fade-in"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="aspect-square skeleton-shimmer" />
      <div className="p-4 space-y-3">
        <div className="h-4 skeleton-shimmer rounded w-3/4" />
        <div className="h-3 skeleton-shimmer rounded w-1/2" />
        <div className="flex justify-between items-center pt-2">
          <div className="h-6 skeleton-shimmer rounded w-20" />
          <div className="h-8 skeleton-shimmer rounded w-8" />
        </div>
      </div>
    </div>
  );
});

