import { HealthCheck } from '@/lib/types'
import { getPaddedTimeDomain } from '@/lib/chartTimeDomain'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UsersIcon } from '@phosphor-icons/react'
import { CartesianGrid, Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface ParticipationChartProps {
  healthChecks: HealthCheck[]
}

type ParticipationChartPoint = {
  name: string
  date: number
  formattedDate: string
  fullDate: string
  participants: number
  isActive: boolean
}

type TooltipPayloadItem = {
  value: number
  payload: ParticipationChartPoint
}

type CustomTooltipProps = {
  active?: boolean
  payload?: TooltipPayloadItem[]
}

const CLOSED_COLOR = 'var(--primary)'
const ACTIVE_COLOR = 'var(--muted-foreground)'

export function ParticipationChart({ healthChecks }: ParticipationChartProps) {
  const sortedChecks = [...healthChecks].sort((a, b) => a.createdAt - b.createdAt)
  
  const chartData: ParticipationChartPoint[] = sortedChecks.map((check) => {
    const uniqueVoters = check.questions.length > 0
      ? Math.ceil(check.votes.length / check.questions.length)
      : 0
    
    return {
      name: check.name,
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
      participants: uniqueVoters,
      isActive: check.status === 'active',
    }
  })
  
  if (chartData.length === 0) {
    return null
  }

  const xDomain = getPaddedTimeDomain(sortedChecks.map((check) => check.createdAt))

  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload
      return (
        <div className="bg-card border rounded-lg shadow-lg p-3">
          <p className="font-semibold text-sm mb-1">{d.name}</p>
          <p className="text-xs text-muted-foreground mb-2">{d.fullDate}</p>
          <p className="text-sm">
            <span className="font-medium text-primary">{payload[0].value}</span>
            <span className="text-muted-foreground"> participant{payload[0].value !== 1 ? 's' : ''}</span>
          </p>
          {d.isActive && (
            <p className="text-xs text-muted-foreground mt-1 italic">In progress — not yet closed</p>
          )}
        </div>
      )
    }
    return null
  }

  const formatXAxis = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UsersIcon size={20} weight="bold" className="text-primary" />
            </div>
            <CardTitle>Participation Over Time</CardTitle>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-primary" />
              Closed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-muted-foreground opacity-50" />
              In progress
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            barCategoryGap="35%"
          >
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
              className="text-xs text-muted-foreground"
              tick={{ fontSize: 12 }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="participants"
              radius={[4, 4, 0, 0]}
              maxBarSize={48}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isActive ? ACTIVE_COLOR : CLOSED_COLOR}
                  fillOpacity={entry.isActive ? 0.45 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
