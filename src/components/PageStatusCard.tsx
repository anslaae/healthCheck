import { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CircleNotch } from '@phosphor-icons/react'

interface PageStatusCardProps {
  icon?: ReactNode
  title: string
  description: string
  /** Render a spinning indicator instead of an icon */
  loading?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

export function PageStatusCard({ icon, title, description, loading = false, action }: PageStatusCardProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center gap-3 pb-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            {loading ? (
              <CircleNotch size={24} className="animate-spin text-primary" />
            ) : (
              icon
            )}
          </div>
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </CardHeader>
        {action && (
          <CardContent className="pt-0">
            <Button onClick={action.onClick} className="w-full">
              {action.label}
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

