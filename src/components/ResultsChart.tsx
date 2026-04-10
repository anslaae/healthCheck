import { QuestionResult } from '@/lib/types'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface ResultsChartProps {
  result: QuestionResult
}

function getScorePercentage(result: QuestionResult): number {
  if (result.total === 0) return 0
  
  const happyScore = 2
  const okScore = 1
  const unhappyScore = 0
  
  const totalScore = (result.happy * happyScore) + (result.ok * okScore) + (result.unhappy * unhappyScore)
  const maxPossibleScore = result.total * happyScore
  
  return (totalScore / maxPossibleScore) * 100
}

export function ResultsChart({ result }: ResultsChartProps) {
  if (result.total === 0) {
    return (
      <div className="text-sm text-muted-foreground italic py-2">
        No votes yet
      </div>
    )
  }
  
  const happyPercent = (result.happy / result.total) * 100
  const okPercent = (result.ok / result.total) * 100
  const unhappyPercent = (result.unhappy / result.total) * 100
  const scorePercentage = getScorePercentage(result)

  const renderVoteRow = (
    emoji: string,
    value: number,
    percent: number,
    barClassName: string,
    explanation?: string
  ) => (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        <div className="w-8 text-center text-xl">
          {explanation ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="cursor-help"
                  aria-label={`${emoji} explanation`}
                >
                  {emoji}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8} className="max-w-sm">
                <p className="text-xs leading-relaxed">{explanation}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            emoji
          )}
        </div>
        <div className="flex-1">
          <div className="relative h-8 rounded-md overflow-hidden bg-muted/70 border border-border/60">
            <div
              className={`absolute left-0 top-0 h-full transition-all duration-500 ${barClassName}`}
              style={{ width: `${percent}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-foreground">
              {value} ({percent.toFixed(0)}%)
            </div>
          </div>
        </div>
      </div>
      {explanation && (
        <p className="text-xs text-muted-foreground pl-11 leading-relaxed">{explanation}</p>
      )}
    </div>
  )

  return (
    <div className="space-y-3">
      {renderVoteRow('😊', result.happy, happyPercent, 'bg-happy', result.happyExplanation)}
      {renderVoteRow('😐', result.ok, okPercent, 'bg-ok')}
      {renderVoteRow('😞', result.unhappy, unhappyPercent, 'bg-unhappy', result.unhappyExplanation)}

      <div className="pt-4 flex flex-col items-center gap-2">
        <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Score</div>
        <div className="text-5xl font-bold text-primary">{scorePercentage.toFixed(0)}%</div>
      </div>
    </div>
  )
}
