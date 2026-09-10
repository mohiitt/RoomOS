import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-24 w-full rounded-3xl" />
      ))}
    </div>
  );
}
