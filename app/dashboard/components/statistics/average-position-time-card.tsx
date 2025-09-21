import { useData } from "@/context/data-provider"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { WidgetSize } from '../../types/dashboard'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { HelpCircle } from "lucide-react"

interface AveragePositionTimeCardProps {
  size?: WidgetSize
}

export default function AveragePositionTimeCard({ size = 'medium' }: AveragePositionTimeCardProps) {
  const { statistics: { averagePositionTime } } = useData()
  return (
      <Card className="h-full">
        <div className="flex items-center justify-center h-full gap-1.5">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <div className="font-medium text-sm">{averagePositionTime}</div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent 
                side="bottom" 
                sideOffset={5} 
                className="max-w-[300px]"
              >
                {"Average time spent in positions across all your trades."}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </Card>
    )
}