import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface MetricCardProps {
    label: string
    value: string | number
    subtext?: string
    icon: React.ReactNode
    trend?: 'positive' | 'negative' | 'neutral'
    warning?: boolean
}

export function MetricCard({
    label,
    value,
    subtext,
    icon,
    trend,
    warning
}: MetricCardProps) {
    return (
        <Card className={cn(warning && "ring-1 ring-destructive/30")}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">{label}</p>
                        <p className={cn(
                            "text-xl font-bold",
                            trend === 'positive' && "text-long",
                            trend === 'negative' && "text-short"
                        )}>
                            {value}
                        </p>
                        {subtext && (
                            <p className="text-xs text-muted-foreground">{subtext}</p>
                        )}
                    </div>
                    <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center",
                        warning ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                    )}>
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
