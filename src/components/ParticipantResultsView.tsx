import { useEffect, useState } from 'react'
import { HealthCheck, VoteType } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ArrowLeftIcon, HeartIcon, ArrowsClockwiseIcon, CheckCircleIcon, PaperPlaneRightIcon, ListIcon } from '@phosphor-icons/react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { getResultsWithTrends } from '@/lib/healthCheckUtils'
import { ResultsChart } from './ResultsChart'
import { TrendIndicator } from './TrendIndicator'
import { AuthMenuContent } from './AuthMenuContent'
import { motion } from 'framer-motion'

interface ParticipantResultsViewProps {
  healthCheck: HealthCheck
  allHealthChecks: HealthCheck[]
  onRefresh: () => void
  onBackgroundRefresh?: () => Promise<void>
  onBackToTeam: () => void
  onGoToVoting?: () => void
  userVotes?: Record<string, VoteType>
}

export function ParticipantResultsView({ 
  healthCheck, 
  allHealthChecks,
  onRefresh,
  onBackgroundRefresh,
  onBackToTeam,
  onGoToVoting,
  userVotes
}: ParticipantResultsViewProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const currentIndex = allHealthChecks.findIndex(c => c.id === healthCheck.id)
  const previousChecks = currentIndex > 0 ? allHealthChecks.slice(0, currentIndex) : []
  
  const results = getResultsWithTrends(healthCheck, previousChecks)
  
  const totalVoteCount = healthCheck.votes.length
  const uniqueVoters = healthCheck.questions.length > 0
    ? Math.ceil(totalVoteCount / healthCheck.questions.length)
    : 0
  const hasResponses = totalVoteCount > 0
  
   const handleRefresh = async () => {
    setIsRefreshing(true)
    await onRefresh()
    setTimeout(() => setIsRefreshing(false), 500)
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

  useEffect(() => {
    if (!autoRefreshEnabled) {
      return
    }

    const intervalId = window.setInterval(() => {
      void (onBackgroundRefresh ? onBackgroundRefresh() : onRefresh())
    }, 10000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [autoRefreshEnabled, onBackgroundRefresh, onRefresh])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-start gap-3 sm:gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onBackToTeam} className="cursor-pointer shrink-0">
                <ArrowLeftIcon weight="bold" className="mr-2" />
                <span className="hidden sm:inline">Back to Team Overview</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Return to team overview</TooltipContent>
          </Tooltip>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-happy/20 flex items-center justify-center">
              <CheckCircleIcon size={20} weight="fill" className="text-happy" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold truncate">{healthCheck.name}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Results & Trends</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 flex-wrap justify-end">
            {healthCheck.status !== 'closed' && onGoToVoting && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onGoToVoting}
                    className="cursor-pointer"
                  >
                    <PaperPlaneRightIcon size={16} weight="bold" className="mr-2" />
                    Go to Voting
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Submit your feedback</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAutoRefreshEnabled((enabled) => !enabled)}
                  className="cursor-pointer"
                >
                  <ArrowsClockwiseIcon
                    size={16}
                    weight="bold"
                    className={`mr-2 ${autoRefreshEnabled ? 'text-primary' : ''}`}
                  />
                  {autoRefreshEnabled ? 'Auto On' : 'Auto Off'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {autoRefreshEnabled ? 'Disable automatic refresh' : 'Enable automatic refresh'}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="cursor-pointer"
                >
                  <ArrowsClockwiseIcon
                    size={16}
                    weight="bold"
                    className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
                  />
                  Refresh
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh data</TooltipContent>
            </Tooltip>
          </div>
          <div className="md:hidden shrink-0">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="cursor-pointer" aria-label="Open results actions menu" title="Menu">
                  <ListIcon size={18} weight="bold" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px]">
                <SheetHeader>
                  <SheetTitle>Results Actions</SheetTitle>
                </SheetHeader>
                <div className="mt-3 space-y-2 px-1">
                  {healthCheck.status !== 'closed' && onGoToVoting && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsMobileMenuOpen(false)
                        onGoToVoting()
                      }}
                      className="w-full justify-start rounded-lg cursor-pointer"
                    >
                      <PaperPlaneRightIcon size={16} weight="bold" className="mr-2" />
                      Go to Voting
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      setAutoRefreshEnabled((enabled) => !enabled)
                    }}
                    className="w-full justify-start rounded-lg cursor-pointer"
                  >
                    <ArrowsClockwiseIcon size={16} weight="bold" className={`mr-2 ${autoRefreshEnabled ? 'text-primary' : ''}`} />
                    {autoRefreshEnabled ? 'Auto Refresh On' : 'Auto Refresh Off'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      void handleRefresh()
                    }}
                    disabled={isRefreshing}
                    className="w-full justify-start rounded-lg cursor-pointer"
                  >
                    <ArrowsClockwiseIcon size={16} weight="bold" className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <AuthMenuContent onAction={() => setIsMobileMenuOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
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
                <HeartIcon size={20} weight="fill" className="text-primary" />
              </div>
              <div>
                <CardTitle>Results & Trends</CardTitle>
                <CardDescription>
                  {!hasResponses
                    ? 'Waiting for the first responses. Graphs will appear once feedback is submitted.'
                    : previousChecks.length > 0
                    ? `Comparing with ${previousChecks.length} previous health ${previousChecks.length === 1 ? 'check' : 'checks'}`
                    : 'No previous data available for comparison'
                  }
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            {!hasResponses ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  No responses yet for this check.
                </p>
                <ul className="space-y-2 text-sm">
                  {healthCheck.questions.map((question, index) => (
                    <li key={question.id} className="rounded-md border p-3 bg-muted/30">
                      <span className="font-medium mr-2">{index + 1}.</span>
                      {question.text}
                    </li>
                  ))}
                </ul>
              </div>
            ) : results.map((result, index) => {
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
        
        {!hasResponses && (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <p className="text-muted-foreground">
                No votes have been submitted yet. Be the first to participate!
              </p>
              {healthCheck.status !== 'closed' && onGoToVoting && (
                <Button
                  onClick={onGoToVoting}
                  size="lg"
                  className="cursor-pointer"
                >
                  <PaperPlaneRightIcon size={20} weight="bold" className="mr-2" />
                  Go to Voting
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
