import { TrendData } from '@/lib/types'
import { TrendUp, TrendDown, ArrowRight } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface TrendIndicatorProps {
  trend: TrendData
}

function Sparkline({ scores }: { scores: number[] }) {
  if (scores.length === 0) return null
  
  const width = 60
  const height = 20
  const padding = 2
  
  const max = Math.max(...scores, 1)
  const min = Math.min(...scores, 0)
  const range = max - min || 1
  
  const points = scores.map((score, index) => {
    const x = padding + (index / (scores.length - 1 || 1)) * (width - padding * 2)
    const y = height - padding - ((score - min) / range) * (height - padding * 2)
    return `${x},${y}`
  }).join(' ')
  
  const lastScore = scores[scores.length - 1]
  const prevScore = scores.length > 1 ? scores[scores.length - 2] : lastScore
  const isUp = lastScore > prevScore
  const isDown = lastScore < prevScore
  
  const strokeColor = isUp ? 'oklch(0.70 0.18 145)' : isDown ? 'oklch(0.58 0.18 25)' : 'oklch(0.50 0.02 210)'
  
  return (
    <svg width={width} height={height} className="inline-block ml-2">
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {scores.length > 1 && (
        <circle
          cx={padding + ((scores.length - 1) / (scores.length - 1 || 1)) * (width - padding * 2)}
          cy={height - padding - ((lastScore - min) / range) * (height - padding * 2)}
          r="2.5"
          fill={strokeColor}
        />
      )}
    </svg>
  )
}

export function TrendIndicator({ trend }: TrendIndicatorProps) {
  if (trend.direction === 'none') {
    return (
      <Badge variant="secondary" className="text-xs">
        No previous data
      </Badge>
    )
  }
  
  const icons = {
    up: <TrendUp className="animate-float" weight="bold" />,
    down: <TrendDown className="animate-float" weight="bold" />,
    flat: <ArrowRight weight="bold" />,
  }
  
  const colors = {
    up: 'bg-happy text-happy-foreground',
    down: 'bg-unhappy text-unhappy-foreground',
    flat: 'bg-muted text-muted-foreground',
  }
  
  const labels = {
    up: 'Improving',
    down: 'Declining',
    flat: 'Stable',
  }
  
  const icon = icons[trend.direction]
  const color = colors[trend.direction]
  const label = labels[trend.direction]
  
  const changeFromLastPercent = (trend.changeFromLast * 100).toFixed(0)
  const showChangeFromLast = Math.abs(trend.changeFromLast) > 0.01
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <Badge className={color + ' gap-1.5 px-3 py-1 cursor-help'}>
              {icon}
              <span className="font-semibold">
                {showChangeFromLast 
                  ? `${trend.changeFromLast > 0 ? '+' : ''}${changeFromLastPercent}%`
                  : label
                }
              </span>
            </Badge>
            {trend.historicalScores.length > 1 && (
              <Sparkline scores={trend.historicalScores} />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">{label}</p>
            {showChangeFromLast && (
              <p className="text-xs">
                {trend.changeFromLast > 0 ? '+' : ''}{changeFromLastPercent}% from last check
              </p>
            )}
            {trend.historicalScores.length > 1 && (
              <p className="text-xs text-muted-foreground">
                Overall trend across {trend.historicalScores.length} checks
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
