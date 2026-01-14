import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
    return (
        <div className="flex flex-1 flex-col h-full w-full space-y-4 p-4">
            {/* Header Area */}
            <div className="flex items-center justify-between">
                <div className="h-8 w-48 animate-pulse rounded-md bg-muted/40" />
                <div className="flex space-x-2">
                    <Skeleton className="h-8 w-8 rounded-full bg-muted/30" />
                    <Skeleton className="h-8 w-8 rounded-full bg-muted/30" />
                </div>
            </div>

            {/* Grid of Widgets Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
                {/* Large Widget */}
                <Skeleton className="col-span-1 md:col-span-2 lg:col-span-2 h-[300px] rounded-xl border border-border/40 bg-card/50" />

                {/* Small Widget */}
                <Skeleton className="col-span-1 h-[300px] rounded-xl border border-border/40 bg-card/50" />

                {/* Medium Widgets */}
                <Skeleton className="col-span-1 h-[250px] rounded-xl border border-border/40 bg-card/50" />
                <Skeleton className="col-span-1 h-[250px] rounded-xl border border-border/40 bg-card/50" />
                <Skeleton className="col-span-1 h-[250px] rounded-xl border border-border/40 bg-card/50" />
            </div>
        </div>
    )
}
