import { HealthCheck } from '@/lib/types'
import { getPaddedTimeDomain } from '@/lib/chartTimeDomain'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartLine } from '@phosphor-icons/react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'

interface QuestionTrendsChartProps {
  healthChecks: HealthCheck[]
}

interface TrendDataPoint {
  date: number
  formattedDate: string
  fullDate: string
  checkName: string
  score: number
  happy: number
  ok: number
  unhappy: number
  total: number
  dataIndex: number
  chartData: TrendDataPoint[] | null
}

const LINE_COLOR = 'oklch(0.646 0.222 41.116)'

export function QuestionTrendsChart({ healthChecks }: QuestionTrendsChartProps) {
  const sortedChecks = [...healthChecks].sort((a, b) => a.createdAt - b.createdAt)

  if (sortedChecks.length === 0) {
    return null
  }

  const xDomain = getPaddedTimeDomain(sortedChecks.map((check) => check.createdAt))

  const questionMap = new Map<string, { happyExplanation?: string, unhappyExplanation?: string }>()
  sortedChecks.forEach(check => {
    check.questions.forEach(q => {
      if (!questionMap.has(q.text)) {
        questionMap.set(q.text, {
          happyExplanation: q.happyExplanation,
          unhappyExplanation: q.unhappyExplanation
        })
      }
    })
  })

  const questionList = Array.from(questionMap.keys())
  
  const formatXAxis = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const CustomYAxisTick = ({ x, y, payload }: any) => {
    let emoji = ''
    if (payload.value === 100) {
      emoji = '😊'
    } else if (payload.value === 50) {
      emoji = '😐'
    } else if (payload.value === 0) {
      emoji = '😞'
    }

    return (
      <g transform={`translate(${x},${y})`}>
        <text 
          x={0} 
          y={0} 
          dy={4} 
          textAnchor="end" 
          fontSize={14}
        >
          {emoji}
        </text>
      </g>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const dataIndex = payload[0].payload.dataIndex
      const isFirstPoint = dataIndex === 0
      
      let percentageChange = 0
      
      if (!isFirstPoint && dataIndex > 0) {
        const chartData = payload[0].payload.chartData
        const previousPoint = chartData?.[dataIndex - 1] ?? null

        if (previousPoint) {
          const prevScore = previousPoint.score
          const currScore = data.score
          if (prevScore !== 0) {
            percentageChange = ((currScore - prevScore) / 100) * 100
          }
        }
      }
      
      return (
        <div className="bg-card border rounded-lg shadow-lg p-3">
          <p className="font-semibold text-sm mb-1">{data.checkName}</p>
          <p className="text-xs text-muted-foreground mb-2">{data.fullDate}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span>😊 Happy:</span>
              <span className="font-medium">{data.happy}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span>😐 OK:</span>
              <span className="font-medium">{data.ok}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span>😞 Unhappy:</span>
              <span className="font-medium">{data.unhappy}</span>
            </div>
            {!isFirstPoint && (
              <div className="flex items-center gap-2 text-xs pt-1 border-t">
                <span>Change:</span>
                <span className={`font-medium ${percentageChange > 0 ? 'text-happy' : percentageChange < 0 ? 'text-unhappy' : 'text-muted-foreground'}`}>
                  {percentageChange > 0 ? '+' : ''}{percentageChange.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {questionList.map((questionText, questionIndex) => {
        const questionData = questionMap.get(questionText)
        const chartData: TrendDataPoint[] = sortedChecks.map((check, idx) => {
          const question = check.questions.find(q => q.text === questionText)
          let score = 0
          let happy = 0
          let ok = 0
          let unhappy = 0
          let total = 0
          
          if (question) {
            const votes = check.votes.filter(v => v.questionId === question.id)
            happy = votes.filter(v => v.vote === 'happy').length
            ok = votes.filter(v => v.vote === 'ok').length
            unhappy = votes.filter(v => v.vote === 'unhappy').length
            total = happy + ok + unhappy
            score = total > 0 ? ((happy + ok * 0.5) / total) * 100 : 0
          }

          return {
            date: check.createdAt,
            formattedDate: new Date(check.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            }),
            fullDate: new Date(check.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            checkName: check.name,
            score,
            happy,
            ok,
            unhappy,
            total,
            dataIndex: idx,
            chartData: null as any
          }
        })
        
        chartData.forEach(d => d.chartData = chartData)
        
        const hasVotes = chartData.some(d => d.total > 0)
        
        if (!hasVotes) {
          return null
        }

        return (
          <motion.div
            key={questionText}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: questionIndex * 0.1 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <ChartLine size={20} weight="bold" className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle>{questionText}</CardTitle>
                    {(questionData?.happyExplanation || questionData?.unhappyExplanation) && (
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {questionData.happyExplanation && (
                          <p className="flex gap-2">
                            <span className="shrink-0">😊</span>
                            <span>{questionData.happyExplanation}</span>
                          </p>
                        )}
                        {questionData.unhappyExplanation && (
                          <p className="flex gap-2">
                            <span className="shrink-0">😞</span>
                            <span>{questionData.unhappyExplanation}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="date"
                      type="number"
                      domain={xDomain}
                      tickFormatter={formatXAxis}
                      className="text-xs text-muted-foreground"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      ticks={[0, 50, 100]}
                      tick={<CustomYAxisTick />}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke={LINE_COLOR}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: LINE_COLOR }}
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
