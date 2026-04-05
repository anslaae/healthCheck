import { QuestionResult } from '@/lib/types'

interface ResultsChartProps {
  result: QuestionResult
}

function getAverageEmoji(result: QuestionResult): string {
  if (result.total === 0) return '😐'
  
  const happyScore = 2
  const okScore = 1
  const unhappyScore = 0
  
  const totalScore = (result.happy * happyScore) + (result.ok * okScore) + (result.unhappy * unhappyScore)
  const average = totalScore / result.total
  
  if (average >= 1.5) return '😊'
  if (average >= 0.5) return '😐'
  return '😞'
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
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-8 text-center text-xl">😊</div>
        <div className="flex-1">
          <div className="relative h-8 bg-secondary rounded-md overflow-hidden">
            <div 
              className="absolute left-0 top-0 h-full bg-happy transition-all duration-500"
              style={{ width: `${happyPercent}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-foreground">
              {result.happy} ({happyPercent.toFixed(0)}%)
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="w-8 text-center text-xl">😐</div>
        <div className="flex-1">
          <div className="relative h-8 bg-secondary rounded-md overflow-hidden">
            <div 
              className="absolute left-0 top-0 h-full bg-ok transition-all duration-500"
              style={{ width: `${okPercent}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-foreground">
              {result.ok} ({okPercent.toFixed(0)}%)
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="w-8 text-center text-xl">😞</div>
        <div className="flex-1">
          <div className="relative h-8 bg-secondary rounded-md overflow-hidden">
            <div 
              className="absolute left-0 top-0 h-full bg-unhappy transition-all duration-500"
              style={{ width: `${unhappyPercent}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-foreground">
              {result.unhappy} ({unhappyPercent.toFixed(0)}%)
            </div>
          </div>
        </div>
      </div>
      
      <div className="pt-4 flex flex-col items-center gap-2">
        <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Score</div>
        <div className="text-5xl font-bold text-primary">{scorePercentage.toFixed(0)}%</div>
      </div>
    </div>
  )
}
