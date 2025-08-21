import { Card } from "../ui/card";

export function GridSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <div className="animate-pulse">
            <div className="aspect-[16/9] w-full bg-muted" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-9 bg-muted rounded w-full" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
