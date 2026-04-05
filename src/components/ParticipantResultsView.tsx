import { useState } from 'react'
import { HealthCheck, VoteType } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Heart, ArrowsClockwise, CheckCircle, ChartLine } from '@phosphor-icons/react'
import { getResultsWithTrends } from '@/lib/healthCheckUtils'
import { ResultsChart } from './ResultsChart'
import { TrendIndicator } from './TrendIndicator'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface ParticipantResultsViewProps {
  healthCheck: HealthCheck
  allHealthChecks: HealthCheck[]
  onRefresh: () => void
  userVotes?: Record<string, VoteType>
}

export function ParticipantResultsView({ 
  healthCheck, 
  allHealthChecks,
  onRefresh,
  userVotes 
}: ParticipantResultsViewProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const currentIndex = allHealthChecks.findIndex(c => c.id === healthCheck.id)
  const previousChecks = currentIndex > 0 ? allHealthChecks.slice(0, currentIndex) : []
  
  const results = getResultsWithTrends(healthCheck, previousChecks)
  
  const totalVoteCount = healthCheck.votes.length
  const uniqueVoters = Math.ceil(totalVoteCount / healthCheck.questions.length)
  
  const team = healthCheck.teamId
  
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await onRefresh()
    setTimeout(() => setIsRefreshing(false), 500)
  }
  
  const handleGoToTeamStats = () => {
    window.location.href = `${window.location.origin}?team=${team}`
  }
  
  const getUserVoteForQuestion = (questionId: string): VoteType | undefined => {
    return userVotes?.[questionId]
  }
  
  const getVoteLabel = (vote: VoteType): string => {
    const labels = {
      happy: '😊 Happy',
      ok: '😐 OK',
      unhappy: '😞 Unhappy'
    }
    return labels[vote]
  }
  
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 rounded-full bg-happy/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle size={24} weight="fill" className="text-happy" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{healthCheck.name}</h1>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleGoToTeamStats}
              className="cursor-pointer"
            >
              <ChartLine 
                size={16} 
                weight="bold" 
                className="mr-2"
              />
              Team Stats
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="cursor-pointer"
            >
              <ArrowsClockwise 
                size={16} 
                weight="bold" 
                className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>
        </div>
      </header>
      
      <main className="max-w-5xl mx-auto p-6 md:p-8 space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Participants</CardDescription>
              <CardTitle className="text-3xl">{uniqueVoters}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Questions</CardDescription>
              <CardTitle className="text-3xl">{healthCheck.questions.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Heart size={20} weight="fill" className="text-primary" />
              </div>
              <div>
                <CardTitle>Results & Trends</CardTitle>
                <CardDescription>
                  {previousChecks.length > 0
                    ? `Comparing with ${previousChecks.length} previous health ${previousChecks.length === 1 ? 'check' : 'checks'}`
                    : 'No previous data available for comparison'
                  }
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            {results.map((result, index) => {
              const userVote = getUserVoteForQuestion(result.questionId)
              
              return (
                <motion.div
                  key={result.questionId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div>
                          <h3 className="font-bold text-xl mb-2">{result.questionText}</h3>
                          {(result.happyExplanation || result.unhappyExplanation) && (
                            <div className="space-y-2 text-sm">
                              {result.happyExplanation && (
                                <div className="flex gap-2 items-start p-3 rounded-lg bg-happy/10 border border-happy/20">
                                  <span className="flex-shrink-0 text-lg">😊</span>
                                  <span className="text-foreground/80">{result.happyExplanation}</span>
                                </div>
                              )}
                              {result.unhappyExplanation && (
                                <div className="flex gap-2 items-start p-3 rounded-lg bg-unhappy/10 border border-unhappy/20">
                                  <span className="flex-shrink-0 text-lg">😞</span>
                                  <span className="text-foreground/80">{result.unhappyExplanation}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {userVote && (
                          <Badge variant="secondary" className="text-sm py-1 px-3">
                            Your answer: {getVoteLabel(userVote)}
                          </Badge>
                        )}
                      </div>
                      <TrendIndicator trend={result.trend} />
                    </div>
                    
                    <div className="pt-2">
                      <ResultsChart result={result} />
                    </div>
                    
                    {index < results.length - 1 && <Separator className="my-8" />}
                  </div>
                </motion.div>
              )
            })}
          </CardContent>
        </Card>
        
        {totalVoteCount === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No votes have been submitted yet. Be the first to participate!
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
