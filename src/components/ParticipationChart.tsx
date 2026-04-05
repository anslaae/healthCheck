import { HealthCheck } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from '@phosphor-icons/react'
import { CartesianGrid, Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface ParticipationChartProps {
  healthChecks: HealthCheck[]
}

export function ParticipationChart({ healthChecks }: ParticipationChartProps) {
  const sortedChecks = [...healthChecks].sort((a, b) => a.createdAt - b.createdAt)
  
  const chartData = sortedChecks.map((check) => {
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
      participants: uniqueVoters
    }
  })
  
  if (chartData.length === 0) {
    return null
  }
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border rounded-lg shadow-lg p-3">
          <p className="font-semibold text-sm mb-1">{payload[0].payload.name}</p>
          <p className="text-xs text-muted-foreground mb-2">{payload[0].payload.fullDate}</p>
          <p className="text-sm">
            <span className="font-medium text-primary">{payload[0].value}</span>
            <span className="text-muted-foreground"> participant{payload[0].value !== 1 ? 's' : ''}</span>
          </p>
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
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Users size={20} weight="bold" className="text-primary" />
          </div>
          <div>
            <CardTitle>Participation Over Time</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="date"
              type="number"
              domain={['dataMin - 86400000', 'dataMax']}
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
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
