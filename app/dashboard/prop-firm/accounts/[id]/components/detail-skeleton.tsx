import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export function DetailPageSkeleton() {
    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
            {/* Header skeleton */}
            <div className="space-y-3">
                <Skeleton className="h-8 w-20" />
                <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-4 w-32" />
                </div>
            </div>

            {/* Metrics skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                    <Skeleton className="h-3 w-20" />
                                    <Skeleton className="h-7 w-24" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                                <Skeleton className="h-10 w-10 rounded-lg" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Progress skeleton */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-16" />
                        </div>
                        <Skeleton className="h-3 w-full" />
                    </div>
                </CardContent>
            </Card>

            {/* Tabs skeleton */}
            <div className="space-y-4">
                <Skeleton className="h-10 w-full max-w-md" />
                <Card>
                    <CardContent className="p-6">
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
