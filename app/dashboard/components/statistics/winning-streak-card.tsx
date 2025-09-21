import { useData } from "@/context/data-provider"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Award, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { WidgetSize } from '../../types/dashboard'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface WinningStreakCardProps {
  size?: WidgetSize
}

export default function WinningStreakCard({ size = 'medium' }: WinningStreakCardProps) {
  const { statistics: { winningStreak } } = useData()

    return (
      <Card className="h-full">
        <div className="flex items-center justify-center h-full gap-1.5">
          <Award className="h-3 w-3 text-yellow-500" />
          <div className="font-medium text-sm">{winningStreak}</div>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent 
                side="bottom" 
                sideOffset={5} 
                className="max-w-[300px]"
              >
                The maximum number of consecutive winning trades in your trading history.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </Card>
    )
  }
